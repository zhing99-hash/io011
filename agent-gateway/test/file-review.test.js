import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Gateway } from '../src/gateway.js';
import { ClamAvScanner } from '../src/clamav.js';
import { startClamdFixture } from '../test-support/clamd-fixture.js';

const password = 'A review test password 123!';
function setup(scanner, scanTimeoutMs = 1000, now = () => Date.now()) {
  const dir = mkdtempSync(join(tmpdir(), 'gateway-review-'));
  const gateway = new Gateway({ quarantineDir: dir, scanner, scanTimeoutMs, now,
    allowedConnectorOrigins: ['https://workflow.example.test'] });
  gateway.bootstrapAdmin({ username: 'admin', password });
  const token = gateway.login({ username: 'admin', password, clientId: 'codex' }).token;
  const user = gateway.profile(token);
  const target = gateway.registerConnector(token, { name: 'Review', endpoint: 'https://workflow.example.test/receive', fileTypes: ['pdf'] });
  gateway.grantSubmit(token, { userId: user.id, connectorId: target.id, fileTypes: ['pdf'] });
  const file = gateway.quarantineFile(token, { connectorId: target.id, fileType: 'pdf',
      idempotencyKey: 'review-request-123456', content: Buffer.from('%PDF-1.7\nsample\n%%EOF\n') });
  return { gateway, token, dir, file, target, close: () => { gateway.close(); rmSync(dir, { recursive: true, force: true }); } };
}

test('a clean antivirus reply remains blocked pending the remaining safety checks', async () => {
  const daemon = await startClamdFixture();
  const c = setup(new ClamAvScanner({ port: daemon.port }));
  try {
    const result = await c.gateway.scanQuarantinedFile(c.file.id);
    assert.equal(result.state, 'review_required');
    const status = c.gateway.getQuarantinedFileStatus(c.token, c.file.id);
    assert.equal(status.review.policy_version, 'v2-antivirus-format');
    assert.equal(status.review.format_reason, 'PDF_INSPECTOR_REQUIRED');
    assert.match(status.review.engine_version, /^ClamAV /);
    assert.equal(status.integrity, 'intact');
  } finally { c.close(); await daemon.close(); }
});

test('format rejection skips antivirus and well-formed text still requires enterprise policy checks', async () => {
  let scans = 0;
  const c = setup({ scan: async () => { scans++; return { verdict: 'clean', engineVersion: 'test-only' }; } });
  try {
    const invalid = c.gateway.quarantineFile(c.token, { connectorId: c.target.id, fileType: 'pdf',
      idempotencyKey: 'invalid-format-123456', content: Buffer.from('pretend pdf') });
    assert.equal((await c.gateway.scanQuarantinedFile(invalid.id)).state, 'rejected');
    assert.equal(scans, 0);
    const target = c.gateway.registerConnector(c.token, { name: 'Markdown', endpoint: 'https://workflow.example.test/markdown', fileTypes: ['md'] });
    c.gateway.grantSubmit(c.token, { userId: c.gateway.profile(c.token).id, connectorId: target.id, fileTypes: ['md'] });
    const text = c.gateway.quarantineFile(c.token, { connectorId: target.id, fileType: 'md',
      idempotencyKey: 'markdown-format-123456', content: Buffer.from('# Hello\nData only.') });
    assert.equal((await c.gateway.scanQuarantinedFile(text.id)).reason, 'ENTERPRISE_POLICY_REQUIRED');
    assert.equal(c.gateway.getQuarantinedFileStatus(c.token, text.id).review.format_verdict, 'inspected');
    assert.equal(scans, 1);
  } finally { c.close(); }
});

test('unavailable scanner and malformed results cannot mark files passed', async () => {
  for (const scanner of [undefined, { scan: async () => ({ verdict: 'clean' }) }, { scan: async () => { throw new Error('sensitive internals'); } }]) {
    const c = setup(scanner);
    try {
      assert.equal((await c.gateway.scanQuarantinedFile(c.file.id)).state, 'scan_failed');
      assert.equal(JSON.stringify(c.gateway.getQuarantinedFileStatus(c.token, c.file.id)).includes('sensitive internals'), false);
    } finally { c.close(); }
  }
});

test('malware detection isolates a file and prevents automatic rescan', async () => {
  const daemon = await startClamdFixture({ reply: 'stream: Test-Signature FOUND' });
  const c = setup(new ClamAvScanner({ port: daemon.port }));
  try {
    assert.equal((await c.gateway.scanQuarantinedFile(c.file.id)).state, 'isolated');
    await assert.rejects(c.gateway.scanQuarantinedFile(c.file.id), { code: 'SCAN_STATE_INVALID' });
  } finally { c.close(); await daemon.close(); }
});

test('file replacement during scan overrides a clean result and concurrent scanning is rejected', async () => {
  let finish;
  const scan = new Promise((resolve) => { finish = resolve; });
  const c = setup({ scan: () => scan });
  try {
    const running = c.gateway.scanQuarantinedFile(c.file.id);
    await assert.rejects(c.gateway.scanQuarantinedFile(c.file.id), { code: 'SCAN_IN_PROGRESS' });
    writeFileSync(join(c.dir, readdirSync(c.dir)[0]), Buffer.from('%PDF-1.7 change'));
    finish({ verdict: 'clean', engineVersion: 'test-only' });
    assert.deepEqual(await running, { id: c.file.id, state: 'isolated', reason: 'FILE_INTEGRITY_FAILED' });
  } finally { c.close(); }
});

test('worker timeout is final for the attempt and a late result does not overwrite failure', async () => {
  let finish;
  const scan = new Promise((resolve) => { finish = resolve; });
  const c = setup({ scan: () => scan }, 10);
  try {
    assert.equal((await c.gateway.scanQuarantinedFile(c.file.id)).state, 'scan_failed');
    finish({ verdict: 'clean', engineVersion: 'test-only' });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(c.gateway.getQuarantinedFileStatus(c.token, c.file.id).state, 'scan_failed');
  } finally { c.close(); }
});

test('an expired scan can be recovered and its stale result cannot replace the newer review', async () => {
  let time = 1000;
  let finish;
  let calls = 0;
  let started;
  const start = new Promise((resolve) => { started = resolve; });
  const first = new Promise((resolve) => { finish = resolve; });
  const c = setup({ scan: () => {
    if (++calls === 1) { started(); return first; }
    return Promise.resolve({ verdict: 'infected', engineVersion: 'test-only' });
  } }, 1000, () => time);
  try {
    const old = c.gateway.scanQuarantinedFile(c.file.id);
    await start;
    time += 60_001;
    assert.equal((await c.gateway.scanQuarantinedFile(c.file.id)).state, 'isolated');
    finish({ verdict: 'clean', engineVersion: 'old-test-result' });
    await assert.rejects(old, { code: 'SCAN_SUPERSEDED' });
    assert.equal(c.gateway.getQuarantinedFileStatus(c.token, c.file.id).state, 'isolated');
  } finally { finish({ verdict: 'clean', engineVersion: 'cleanup' }); c.close(); }
});
