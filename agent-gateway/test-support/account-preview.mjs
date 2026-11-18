// Visual QA only: capture pages from fake HTTPS accounts, close the real fixture,
// then serve inert snapshots over loopback. POSTs never accept credentials.
import { createServer } from 'node:http';
import { generateKeyPairSync, randomBytes, createHash } from 'node:crypto';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { Gateway } from '../src/gateway.js';
import { startHttpsApi } from '../src/https-api.js';
import { createBrowser, issuer, csrfFrom, authorize } from './oauth-browser.js';

const destination = resolve('client-packages/account-preview');
mkdirSync(dirname(destination), { recursive: true });
mkdirSync(destination, { recursive: false });
const gateway = new Gateway();
const password = 'Preview fixture password 123!';
const temporary = 'Preview temporary password 456!';
gateway.bootstrapAdmin({ username: 'admin', password });
const admin = gateway.login({ username: 'admin', password, clientId: 'preview-admin' }).token;
const user = gateway.createUser(admin, { username: 'alice', password });
gateway.login({ username: 'alice', password, clientId: 'workbuddy' });
const key = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ format: 'jwk' });
const secrets = { jwks: { keys: [{ ...key, kid: 'preview-key', alg: 'RS256', use: 'sig' }] }, cookieKeys: [randomBytes(32).toString('hex'), randomBytes(32).toString('hex')], storageKey: randomBytes(32).toString('hex') };
const { server } = await startHttpsApi(gateway, { cert: readFileSync(new URL('../test/fixtures/local-test-cert.pem', import.meta.url)), key: readFileSync(new URL('../test/fixtures/local-test-key.pem', import.meta.url)),
  publicOrigin: issuer, port: 0, oauth: { secrets, clients: [{ clientId: 'desktop-test', clientName: '企业桌面助手', redirectUris: ['http://127.0.0.1:34567/callback'] }] } });
const snapshots = new Map();
const save = (name, response) => {
  if (response.status !== 200 || response.body.includes(password) || response.body.includes(temporary)) throw new Error('INVALID_PREVIEW_RESPONSE');
  snapshots.set(name, response.body); writeFileSync(join(destination, name + '.html'), response.body, { flag: 'wx' });
};
try {
  const browser = createBrowser(server);
  const page = await browser('/account/login'); save('login', page);
  await authorize(createBrowser(server), { password });
  await browser('/account/login', { method: 'POST', origin: issuer, form: { csrf: csrfFrom(page.body), username: 'alice', password } });
  for (const [name, path] of [['home', '/account'], ['password', '/account/password'], ['connections', '/account/connections'], ['confirm', '/account/connections/revoke?clientId=desktop-test']]) save(name, await browser(path));
  gateway.resetUserPassword(admin, { userId: user.id, temporaryPassword: temporary });
  const native = createBrowser(server);
  const params = new URLSearchParams({ client_id: 'desktop-test', response_type: 'code', redirect_uri: 'http://127.0.0.1:34567/callback', scope: 'mcp:read', resource: issuer + '/mcp', state: randomBytes(16).toString('hex'),
    code_challenge: createHash('sha256').update(randomBytes(32)).digest('base64url'), code_challenge_method: 'S256' });
  const start = await native('/oauth/auth?' + params);
  const form = await native(start.headers.location);
  save('temporary', await native(start.headers.location, { method: 'POST', origin: issuer, form: { csrf: csrfFrom(form.body), action: 'login', username: 'alice', password: temporary } }));
} finally { await new Promise((resolve) => server.close(resolve)); gateway.close(); }

const paths = new Map([['/', 'login'], ['/account/login', 'login'], ['/account', 'home'], ['/account/password', 'password'], ['/account/connections', 'connections'], ['/account/connections/revoke', 'confirm'], ['/temporary', 'temporary']]);
const preview = createServer((req, res) => {
  if (req.socket.remoteAddress !== '127.0.0.1' || req.method !== 'GET') { res.writeHead(405, { Connection: 'close' }); res.end('Static preview only'); return; }
  const html = snapshots.get(paths.get(new URL(req.url, 'http://127.0.0.1').pathname));
  res.writeHead(html ? 200 : 404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(html ?? 'Not found');
});
await new Promise((resolve) => preview.listen(0, '127.0.0.1', resolve));
process.stdout.write(JSON.stringify({ previewUrl: `http://127.0.0.1:${preview.address().port}`, directory: destination }) + '\n');
const close = () => { preview.closeAllConnections(); preview.close(); };
process.once('SIGINT', close); process.once('SIGTERM', close);
