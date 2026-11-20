import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { request } from 'node:https';
import { loadRuntimeConfig } from '../src/runtime-config.js';

const flags = ['--preserve-symlinks', '--preserve-symlinks-main'];
const root = fileURLToPath(new URL('..', import.meta.url));
const certPath = fileURLToPath(new URL('./fixtures/local-test-cert.pem', import.meta.url));
const keyPath = fileURLToPath(new URL('./fixtures/local-test-key.pem', import.meta.url));

test('operator commands initialize once and serve a certificate-verified HTTPS login', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'gateway-runtime-'));
  const path = join(dir, 'config.json');
  const password = 'Runtime integration password 123!';
  writeFileSync(path, JSON.stringify({ database: join(dir, 'gateway.sqlite'), quarantineDirectory: join(dir, 'quarantine'),
    publicOrigin: 'https://gateway-test.invalid', listenPort: 0, listenHost: '127.0.0.1',
    tlsCertificateFile: certPath, tlsPrivateKeyFile: keyPath, allowedConnectorOrigins: [] }));
  let child;
  try {
    const initialize = () => spawnSync(process.execPath, [...flags, 'scripts/bootstrap.mjs', path], {
      cwd: root, input: JSON.stringify({ username: 'admin', password }), encoding: 'utf8', timeout: 10000, windowsHide: true,
    });
    const created = initialize();
    assert.equal(created.status, 0, created.stderr);
    assert.equal(created.stdout.includes(password), false);
    assert.equal(JSON.parse(created.stdout).event, 'initialized');
    assert.equal(JSON.parse(initialize().stderr).error, 'ALREADY_BOOTSTRAPPED');
    child = spawn(process.execPath, [...flags, 'scripts/serve.mjs', path], { cwd: root, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const listening = await new Promise((resolve, reject) => {
      let output = '';
      let errors = '';
      const timer = setTimeout(() => reject(new Error('SERVER_START_TIMEOUT')), 10000);
      child.once('error', (error) => { clearTimeout(timer); reject(error); });
      child.once('exit', () => { clearTimeout(timer); reject(new Error('Server exited: ' + errors)); });
      child.stderr.on('data', (part) => { errors += part; });
      child.stdout.on('data', (part) => {
        output += part;
        if (output.includes('\n')) { clearTimeout(timer); resolve(JSON.parse(output.split('\n')[0])); }
      });
    });
    assert.equal(listening.event, 'listening');
    const body = JSON.stringify({ username: 'admin', password, clientId: 'codex' });
    const result = await new Promise((resolve, reject) => {
      const req = request({ hostname: '127.0.0.1', port: listening.listenPort, servername: 'gateway-test.invalid',
        ca: readFileSync(certPath), path: '/v1/login', method: 'POST', agent: false,
        headers: { Host: 'gateway-test.invalid', 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => {
        const parts = [];
        res.on('data', (part) => parts.push(part));
        res.on('error', reject);
        res.on('end', () => resolve({ status: res.statusCode, value: JSON.parse(Buffer.concat(parts)) }));
      });
      req.on('error', reject); req.end(body);
    });
    assert.equal(result.status, 200);
    assert.equal(result.value.user.username, 'admin');
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) {
      await new Promise((resolve) => { child.once('exit', resolve); child.kill(); });
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

test('runtime config rejects insecure origin, unknown fields and relative storage paths', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gateway-config-'));
  const path = join(dir, 'config.json');
  const good = { database: join(dir, 'gateway.sqlite'), quarantineDirectory: join(dir, 'quarantine'),
    publicOrigin: 'https://gateway-test.invalid', tlsCertificateFile: certPath, tlsPrivateKeyFile: keyPath, allowedConnectorOrigins: [] };
  try {
    for (const update of [{ publicOrigin: 'http://insecure.test' }, { database: 'relative.sqlite' }, { secretSetting: true }, { oauth: {} }]) {
      writeFileSync(path, JSON.stringify({ ...good, ...update }));
      assert.throws(() => loadRuntimeConfig(path));
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('OAuth key initialization emits no secrets and refuses to overwrite an existing key file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gateway-oauth-secrets-'));
  const path = join(dir, 'oauth-secrets.json');
  const create = () => spawnSync(process.execPath, [...flags, 'scripts/create-oauth-secrets.mjs', path], { cwd: root, encoding: 'utf8', timeout: 10000, windowsHide: true });
  try {
    const result = create();
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { event: 'oauth-secrets-created' });
    const original = readFileSync(path, 'utf8');
    const secrets = JSON.parse(original);
    assert.equal(secrets.storageKey.length, 64);
    assert.ok(secrets.jwks.keys[0].d);
    assert.equal(create().status, 1);
    assert.equal(readFileSync(path, 'utf8'), original);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
