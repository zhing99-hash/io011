import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

// The certificate and key are public test fixtures, never production credentials.
test('real TLS connection pins loopback and verifies the target certificate hostname', () => {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const cert = resolve(root, 'test/fixtures/local-test-cert.pem');
  const key = resolve(root, 'test/fixtures/local-test-key.pem');
  const moduleUrl = pathToFileURL(resolve(root, 'src/outbound.js')).href;
  const script = `
    import { createServer } from 'node:https';
    import { readFileSync } from 'node:fs';
    import assert from 'node:assert/strict';
    import { sendOutboundJson } from ${JSON.stringify(moduleUrl)};
    const server = createServer({ key: readFileSync(process.env.TEST_KEY), cert: readFileSync(process.env.TEST_CERT) }, (req, res) => {
      req.resume();
      req.on('end', () => { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"accepted":true}'); });
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    try {
      const port = server.address().port;
      const dnsLookup = async () => [{ address: '127.0.0.1', family: 4 }];
      const origin = 'https://gateway-test.invalid:' + port;
      const result = await sendOutboundJson(origin + '/submit', { x: 1 }, {
        allowedOrigins: [origin], allowedCidrs: ['127.0.0.1/32'], dnsLookup,
      });
      assert.equal(result.body, '{"accepted":true}');
      const wrong = 'https://wrong-host.invalid:' + port;
      await assert.rejects(sendOutboundJson(wrong + '/submit', {}, {
        allowedOrigins: [wrong], allowedCidrs: ['127.0.0.1/32'], dnsLookup,
      }), { code: 'ERR_TLS_CERT_ALTNAME_INVALID' });
    } finally { await new Promise(resolve => server.close(resolve)); }
  `;
  const child = spawnSync(process.execPath, ['--preserve-symlinks', '--preserve-symlinks-main', '--input-type=module', '-e', script], {
    env: { ...process.env, NODE_EXTRA_CA_CERTS: cert, TEST_CERT: cert, TEST_KEY: key },
    encoding: 'utf8', timeout: 10000,
  });
  assert.equal(child.status, 0, `${child.error ?? ''}\n${child.stderr}`);
});
