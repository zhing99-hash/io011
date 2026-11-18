import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Gateway } from '../src/gateway.js';
import { startDevApi } from '../src/dev-api.js';

const password = 'An Example Password 123!';
function setup() {
  const dir = mkdtempSync(join(tmpdir(), 'gateway-quarantine-'));
  const gateway = new Gateway({ quarantineDir: dir, allowedConnectorOrigins: ['https://workflow.example.test'] });
  gateway.bootstrapAdmin({ username: 'admin', password });
  const admin = gateway.login({ username: 'admin', password, clientId: 'codex' }).token;
  const alice = gateway.createUser(admin, { username: 'alice', password });
  gateway.createUser(admin, { username: 'bob', password });
  const token = gateway.login({ username: 'alice', password, clientId: 'codex' }).token;
  const bob = gateway.login({ username: 'bob', password, clientId: 'codex' }).token;
  const target = gateway.registerConnector(admin, { name: 'Review', endpoint: 'https://workflow.example.test/submit', fileTypes: ['pdf'] });
  gateway.grantSubmit(admin, { userId: alice.id, connectorId: target.id, fileTypes: ['pdf'] });
  return { gateway, dir, admin, alice, token, bob, target };
}

test('quarantined content is owner scoped, deduplicated and detects replacement', () => {
  const c = setup();
  try {
    const input = { connectorId: c.target.id, fileType: 'pdf', idempotencyKey: 'unique-key-123456', content: Buffer.from('%PDF-test') };
    const first = c.gateway.quarantineFile(c.token, input);
    const duplicate = c.gateway.quarantineFile(c.token, input);
    assert.equal(first.id, duplicate.id);
    assert.equal(readdirSync(c.dir).length, 1);
    assert.equal(c.gateway.getQuarantinedFileStatus(c.token, first.id).integrity, 'intact');
    assert.throws(() => c.gateway.getQuarantinedFileStatus(c.bob, first.id), { code: 'RESOURCE_NOT_FOUND' });
    assert.throws(() => c.gateway.quarantineFile(c.token, { ...input, content: Buffer.from('changed') }), { code: 'IDEMPOTENCY_CONFLICT' });
    writeFileSync(join(c.dir, readdirSync(c.dir)[0]), Buffer.from('tampered!'));
    assert.deepEqual(c.gateway.getQuarantinedFileStatus(c.token, first.id).integrity, 'failed');
    assert.equal(c.gateway.getQuarantinedFileStatus(c.token, first.id).state, 'quarantined');
    c.gateway.revokeSubmit(c.admin, { userId: c.alice.id, connectorId: c.target.id });
    assert.throws(() => c.gateway.quarantineFile(c.token, { ...input, idempotencyKey: 'another-key-123456' }), { code: 'FORBIDDEN' });
  } finally { c.gateway.close(); rmSync(c.dir, { recursive: true, force: true }); }
});

test('local API quarantines authorized upload without exposing file contents', async () => {
  const c = setup();
  const { server, url } = await startDevApi(c.gateway);
  try {
    const response = await fetch(url + '/v1/dev/quarantine', { method: 'POST', headers: {
      authorization: `Bearer ${c.token}`, 'content-type': 'application/octet-stream',
      'x-connector-id': c.target.id, 'x-file-type': 'pdf', 'idempotency-key': 'upload-request-123456',
    }, body: Buffer.from('not-a-real-pdf') });
    assert.equal(response.status, 201);
    const result = await response.json();
    assert.equal(result.state, 'quarantined');
    const status = await fetch(url + '/v1/dev/quarantine/status', { method: 'POST', headers: {
      authorization: `Bearer ${c.token}`, 'content-type': 'application/json',
    }, body: JSON.stringify({ id: result.id }) });
    const body = await status.json();
    assert.equal(body.integrity, 'intact');
    assert.equal(body.state, 'quarantined');
    assert.equal(JSON.stringify(body).includes('not-a-real-pdf'), false);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    c.gateway.close(); rmSync(c.dir, { recursive: true, force: true });
  }
});

test('quarantine metadata and ownership survive restarting the gateway', () => {
  const root = mkdtempSync(join(tmpdir(), 'gateway-restart-'));
  const options = { filename: join(root, 'gateway.sqlite'), quarantineDir: join(root, 'quarantine'),
    allowedConnectorOrigins: ['https://workflow.example.test'] };
  let gateway = new Gateway(options);
  try {
    gateway.bootstrapAdmin({ username: 'admin', password });
    const admin = gateway.login({ username: 'admin', password, clientId: 'codex' }).token;
    const alice = gateway.createUser(admin, { username: 'alice', password });
    const target = gateway.registerConnector(admin, { name: 'Review', endpoint: 'https://workflow.example.test/submit', fileTypes: ['pdf'] });
    gateway.grantSubmit(admin, { userId: alice.id, connectorId: target.id, fileTypes: ['pdf'] });
    const token = gateway.login({ username: 'alice', password, clientId: 'codex' }).token;
    const upload = gateway.quarantineFile(token, { connectorId: target.id, fileType: 'pdf',
      idempotencyKey: 'restart-request-123456', content: Buffer.from('sample') });
    gateway.close();
    gateway = new Gateway(options);
    assert.equal(gateway.getQuarantinedFileStatus(token, upload.id).integrity, 'intact');
    assert.equal(gateway.getQuarantinedFileStatus(token, upload.id).state, 'quarantined');
  } finally { gateway.close(); rmSync(root, { recursive: true, force: true }); }
});
