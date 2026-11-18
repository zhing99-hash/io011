import test from 'node:test';
import assert from 'node:assert/strict';
import { ClamAvScanner } from '../src/clamav.js';
import { startClamdFixture } from '../test-support/clamd-fixture.js';

test('ClamAV adapter streams the exact bounded content and records version information', async () => {
  const content = Buffer.alloc(140_000, 0x61);
  let scanned;
  const daemon = await startClamdFixture({ onContent: (value) => { scanned = value; } });
  try {
    const result = await new ClamAvScanner({ port: daemon.port }).scan(content);
    assert.equal(result.verdict, 'clean');
    assert.match(result.engineVersion, /^ClamAV /);
    assert.deepEqual(scanned, content);
  } finally { await daemon.close(); }
});

test('ClamAV adapter classifies detection and rejects scan errors or unexpected replies', async () => {
  for (const reply of ['stream: Test-Signature FOUND', 'stream: Read failed ERROR', 'stream: OK extra']) {
    const daemon = await startClamdFixture({ reply });
    try {
      const scan = new ClamAvScanner({ port: daemon.port }).scan(Buffer.from('test'));
      if (reply.endsWith('FOUND')) assert.equal((await scan).verdict, 'infected');
      else await assert.rejects(scan, { code: 'SCANNER_SCAN_ERROR' });
    } finally { await daemon.close(); }
  }
});

test('ClamAV adapter bounds stalled requests and disallows remote plaintext daemon addresses', async () => {
  assert.throws(() => new ClamAvScanner({ host: '10.0.0.1' }), { code: 'INVALID_SCANNER_CONFIG' });
  const daemon = await startClamdFixture({ hang: true });
  try {
    await assert.rejects(new ClamAvScanner({ port: daemon.port, timeoutMs: 100 }).scan(Buffer.from('test')), { code: 'SCANNER_TIMEOUT' });
  } finally { await daemon.close(); }
});

test('ClamAV adapter reports connection refusal as unavailable', async () => {
  const daemon = await startClamdFixture();
  const port = daemon.port;
  await daemon.close();
  await assert.rejects(new ClamAvScanner({ port }).scan(Buffer.from('test')), { code: 'SCANNER_UNAVAILABLE' });
});
