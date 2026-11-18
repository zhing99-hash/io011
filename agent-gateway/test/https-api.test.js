import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:https';
import { readFileSync } from 'node:fs';
import { Gateway } from '../src/gateway.js';
import { startHttpsApi } from '../src/https-api.js';

const cert = readFileSync(new URL('./fixtures/local-test-cert.pem', import.meta.url));
const key = readFileSync(new URL('./fixtures/local-test-key.pem', import.meta.url));
const password = 'HTTPS integration password 123!';

function call(server, path, { token, body, headers = {}, trust = true, servername = 'gateway-test.invalid' } = {}) {
  const bytes = body === undefined ? undefined : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = request({
      hostname: '127.0.0.1', port: server.address().port, servername,
      ca: trust ? cert : undefined, method: bytes === undefined ? 'GET' : 'POST', path, agent: false,
      headers: { Host: 'gateway-test.invalid', ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(bytes ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bytes) } : {}), ...headers },
    }, (res) => {
      const parts = [];
      res.on('data', (part) => parts.push(part));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: JSON.parse(Buffer.concat(parts).toString('utf8')) }));
      res.on('error', reject);
    });
    req.on('error', reject); req.end(bytes);
  });
}

test('HTTPS login validates certificates, authority, origin, fields and live session revocation', async () => {
  const gateway = new Gateway();
  gateway.bootstrapAdmin({ username: 'admin', password });
  const { server } = await startHttpsApi(gateway, { cert, key, publicOrigin: 'https://gateway-test.invalid', port: 0 });
  try {
    await assert.rejects(call(server, '/v1/me', { trust: false }));
    await assert.rejects(call(server, '/v1/me', { servername: 'wrong.invalid' }), { code: 'ERR_TLS_CERT_ALTNAME_INVALID' });
    assert.equal((await call(server, '/v1/me', { headers: { Host: 'evil.invalid' } })).status, 421);
    assert.equal((await call(server, '/v1/login', { headers: { Origin: 'https://evil.invalid' }, body: { username: 'admin', password, clientId: 'codex' } })).status, 403);
    const login = await call(server, '/v1/login', { body: { username: 'admin', password, clientId: 'codex' } });
    assert.equal(login.status, 200);
    assert.match(login.headers['strict-transport-security'], /max-age=/);
    assert.match(login.headers['x-request-id'], /^[a-f0-9-]{36}$/);
    const token = login.body.token;
    assert.equal((await call(server, '/v1/me', { token })).body.username, 'admin');
    assert.equal((await call(server, '/v1/authorize/submission', { token, body: { userId: 'someone-else', connectorId: 'x', fileType: 'pdf' } })).body.error, 'UNKNOWN_FIELD');
    await call(server, '/v1/logout', { token, body: {} });
    assert.equal((await call(server, '/v1/me', { token })).status, 401);
  } finally { await new Promise((resolve) => server.close(resolve)); gateway.close(); }
});

test('HTTPS login rate limits normalize accounts and ignore spoofed source headers', async () => {
  let time = 1000;
  const gateway = new Gateway();
  gateway.bootstrapAdmin({ username: 'admin', password });
  const { server } = await startHttpsApi(gateway, { cert, key, publicOrigin: 'https://gateway-test.invalid', port: 0,
    now: () => time, rateLimits: { loginAccount: { limit: 2, windowMs: 60_000 }, loginSource: { limit: 3, windowMs: 60_000 } } });
  try {
    for (const username of ['admin', ' ADMIN ']) {
      assert.equal((await call(server, '/v1/login', { body: { username, password: 'wrong', clientId: 'codex' } })).status, 401);
    }
    const limited = await call(server, '/v1/login', { body: { username: 'admin', password, clientId: 'codex' }, headers: { 'X-Forwarded-For': '8.8.8.8' } });
    assert.equal(limited.status, 429);
    assert.equal(limited.headers['retry-after'], '60');
    const rotated = await call(server, '/v1/login', { body: { username: 'different', password, clientId: 'codex' }, headers: { 'X-Forwarded-For': '1.1.1.1' } });
    assert.equal(rotated.status, 429);
    time += 60_001;
    assert.equal((await call(server, '/v1/login', { body: { username: 'admin', password, clientId: 'codex' } })).status, 200);
  } finally { await new Promise((resolve) => server.close(resolve)); gateway.close(); }
});
