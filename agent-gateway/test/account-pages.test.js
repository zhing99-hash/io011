import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Gateway } from '../src/gateway.js';
import { startHttpsApi } from '../src/https-api.js';
import { authorize, exchange, createBrowser, issuer, csrfFrom, rpcResult } from '../test-support/oauth-browser.js';

const password = 'OAuth account password 123!';
const temporary = 'Temporary browser password 456!';
const permanent = 'Permanent browser password 789!';
const privateKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ format: 'jwk' });
const secrets = { jwks: { keys: [{ ...privateKey, kid: 'account-test-key', alg: 'RS256', use: 'sig' }] },
  cookieKeys: [randomBytes(32).toString('hex'), randomBytes(32).toString('hex')], storageKey: randomBytes(32).toString('hex') };
const callProfile = (browser, token) => browser('/mcp', { method: 'POST', token,
  headers: { Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-11-25' },
  json: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_my_profile', arguments: {} } } });

async function setup() {
  const gateway = new Gateway();
  gateway.bootstrapAdmin({ username: 'admin', password });
  const admin = gateway.login({ username: 'admin', password, clientId: 'platform-settings' }).token;
  const alice = gateway.createUser(admin, { username: 'alice', password });
  const bob = gateway.createUser(admin, { username: 'bob', password });
  const { server } = await startHttpsApi(gateway, { cert: readFileSync(new URL('./fixtures/local-test-cert.pem', import.meta.url)),
    key: readFileSync(new URL('./fixtures/local-test-key.pem', import.meta.url)), publicOrigin: issuer, port: 0,
    oauth: { secrets, clients: [{ clientId: 'desktop-test', clientName: 'Desktop <img src=x onerror=alert(1)>', redirectUris: ['http://127.0.0.1:34567/callback'] }] } });
  return { gateway, admin, alice, bob, browser: createBrowser(server), server,
    close: async () => { await new Promise((resolve) => server.close(resolve)); gateway.close(); } };
}

async function login(browser, username = 'alice', pass = password) {
  const page = await browser('/account/login');
  assert.equal(page.status, 200);
  assert.ok(csrfFrom(page.body));
  return browser('/account/login', { method: 'POST', origin: issuer, form: { csrf: csrfFrom(page.body), username, password: pass } });
}

async function tokensFor(c, username = 'alice') {
  const browser = createBrowser(c.server);
  const flow = await authorize(browser, { username });
  const response = await exchange(browser, flow.url.searchParams.get('code'), flow.verifier);
  assert.equal(response.status, 200);
  return JSON.parse(response.body);
}

async function temporaryPage(c) {
  c.gateway.resetUserPassword(c.admin, { userId: c.alice.id, temporaryPassword: temporary });
  const verifier = randomBytes(32).toString('base64url');
  const start = await c.browser('/oauth/auth?' + new URLSearchParams({ client_id: 'desktop-test', response_type: 'code', redirect_uri: 'http://127.0.0.1:34567/callback',
    scope: 'mcp:read offline_access', resource: issuer + '/mcp', state: randomBytes(16).toString('hex'),
    code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }));
  const path = start.headers.location;
  const form = await c.browser(path);
  const response = await c.browser(path, { method: 'POST', origin: issuer, form: { csrf: csrfFrom(form.body), action: 'login', username: 'alice', password: temporary } });
  assert.equal(response.status, 200);
  assert.ok(response.body.includes('name="newPassword"'));
  return { path, response, oldCsrf: csrfFrom(form.body) };
}

test('account login protects cookies and forms, isolates connection lists and revokes only the current owner', async () => {
  const c = await setup();
  try {
    const aliceTokens = await tokensFor(c);
    const bobTokens = await tokensFor(c, 'bob');
    c.gateway.login({ username: 'bob', password, clientId: 'bob-private' });
    const guest = await c.browser('/account/connections');
    assert.equal(guest.headers.location, '/account/login');
    const signedIn = await login(c.browser);
    assert.equal(signedIn.status, 303);
    const cookie = signedIn.headers['set-cookie'].find((value) => value.startsWith('__Host-gw_account='));
    assert.match(cookie, /Secure; HttpOnly; SameSite=Lax/);
    assert.match(cookie, /Path=\//);
    assert.equal(/Domain=/i.test(cookie), false);
    const list = await c.browser('/account/connections');
    assert.equal(list.status, 200);
    assert.ok(list.body.includes('desktop-test'));
    assert.ok(list.body.includes('&lt;img'));
    assert.equal(list.body.includes('<img'), false);
    assert.equal(list.body.includes('bob-private'), false);
    assert.equal(list.body.includes(aliceTokens.access_token), false);
    assert.equal(list.body.includes(aliceTokens.refresh_token), false);
    assert.match(list.headers['content-security-policy'], /frame-ancestors 'none'/);
    const confirm = await c.browser('/account/connections/revoke?clientId=desktop-test');
    const csrf = csrfFrom(confirm.body);
    const forged = await c.browser('/account/connections/revoke', { method: 'POST', origin: issuer, form: { csrf, clientId: 'bob-private' } });
    assert.equal(forged.status, 403, 'revoke CSRF is bound to the target client');
    assert.equal((await c.browser('/account/connections/revoke', { method: 'POST', form: { csrf, clientId: 'desktop-test' } })).status, 403);
    const bobBrowser = createBrowser(c.server);
    await login(bobBrowser, 'bob');
    assert.equal((await bobBrowser('/account/connections/revoke', { method: 'POST', origin: issuer, form: { csrf, clientId: 'desktop-test' } })).status, 403);
    const revoked = await c.browser('/account/connections/revoke', { method: 'POST', origin: issuer, form: { csrf, clientId: 'desktop-test' } });
    assert.equal(revoked.status, 303);
    assert.equal((await c.browser('/mcp', { method: 'POST', token: aliceTokens.access_token, json: {} })).status, 401);
    assert.equal((await c.browser('/oauth/token', { method: 'POST', form: { client_id: 'desktop-test', grant_type: 'refresh_token', refresh_token: aliceTokens.refresh_token, resource: issuer + '/mcp' } })).status, 400);
    assert.equal(rpcResult(await callProfile(c.browser, bobTokens.access_token)).result.structuredContent.username, 'bob');
    assert.equal((await c.browser('/account/connections')).body.includes('desktop-test'), false);
    assert.equal((await c.browser('/account/logout')).status, 405);
    const home = await c.browser('/account');
    assert.equal((await c.browser('/account/logout', { method: 'POST', origin: issuer, form: { csrf: csrfFrom(home.body) } })).status, 303);
    assert.equal((await c.browser('/account')).headers.location, '/account/login');
  } finally { await c.close(); }
});

test('browser password change checks current password, revokes old sessions and grants, and requires fresh login', async () => {
  const c = await setup();
  try {
    const oauth = await tokensFor(c);
    const old = c.gateway.login({ username: 'alice', password, clientId: 'workbuddy' }).token;
    await login(c.browser);
    const page = await c.browser('/account/password');
    const form = { csrf: csrfFrom(page.body), currentPassword: 'wrong', newPassword: permanent, confirmPassword: permanent };
    assert.equal((await c.browser('/account/password', { method: 'POST', origin: issuer, form: { ...form, confirmPassword: password } })).status, 400);
    const bad = await c.browser('/account/password', { method: 'POST', origin: issuer, form });
    assert.equal(bad.status, 400);
    assert.equal(bad.body.includes(permanent), false);
    const changed = await c.browser('/account/password', { method: 'POST', origin: issuer, form: { ...form, currentPassword: password } });
    assert.equal(changed.headers.location, '/account/login?updated=1');
    assert.throws(() => c.gateway.profile(old), { code: 'AUTH_REQUIRED' });
    assert.equal((await c.browser('/mcp', { method: 'POST', token: oauth.access_token, json: {} })).status, 401);
    assert.equal((await c.browser('/account')).headers.location, '/account/login');
    assert.equal((await login(c.browser, 'alice', permanent)).status, 303);
    const events = JSON.stringify(c.gateway.auditForAdmin(c.admin));
    assert.equal(events.includes(permanent), false);
    assert.equal(events.includes(oauth.access_token), false);
  } finally { await c.close(); }
});

test('temporary-password account is restricted to the browser update page and can recover without API tools', async () => {
  const c = await setup();
  try {
    c.gateway.resetUserPassword(c.admin, { userId: c.alice.id, temporaryPassword: temporary });
    assert.equal((await login(c.browser, 'alice', temporary)).headers.location, '/account/password');
    assert.equal((await c.browser('/account/connections')).headers.location, '/account/password');
    const restricted = await c.browser('/account/password');
    const logout = /action="\/account\/logout"><input type="hidden" name="csrf" value="([a-f0-9]+)"/.exec(restricted.body)?.[1];
    assert.ok(logout);
    assert.equal((await c.browser('/account/logout', { method: 'POST', origin: issuer, form: { csrf: logout } })).status, 303);
    assert.equal((await login(c.browser, 'alice', temporary)).headers.location, '/account/password');
    const page = await c.browser('/account/password');
    const changed = await c.browser('/account/password', { method: 'POST', origin: issuer,
      form: { csrf: csrfFrom(page.body), currentPassword: temporary, newPassword: permanent, confirmPassword: permanent } });
    assert.equal(changed.headers.location, '/account/login?updated=1');
    assert.equal((await login(c.browser, 'alice', permanent)).headers.location, '/account');
    assert.equal((await c.browser('/account/connections')).status, 200);
  } finally { await c.close(); }
});

test('OAuth temporary-password update resumes the original PKCE flow and still requires consent', async () => {
  const c = await setup();
  try {
    const previous = await authorize(c.browser);
    const previousTokens = JSON.parse((await exchange(c.browser, previous.url.searchParams.get('code'), previous.verifier)).body);
    c.gateway.resetUserPassword(c.admin, { userId: c.alice.id, temporaryPassword: temporary });
    const flow = await authorize(c.browser, { password: temporary, newPassword: permanent });
    assert.equal(flow.changedPassword, true);
    assert.equal(flow.sawConsent, true);
    const response = await exchange(c.browser, flow.url.searchParams.get('code'), flow.verifier);
    assert.equal(response.status, 200, response.body);
    const token = JSON.parse(response.body).access_token;
    assert.equal(rpcResult(await callProfile(c.browser, token)).result.structuredContent.username, 'alice');
    assert.equal((await callProfile(c.browser, previousTokens.access_token)).status, 401);
    assert.throws(() => c.gateway.login({ username: 'alice', password: temporary, clientId: 'codex' }), { code: 'INVALID_CREDENTIALS' });
    assert.equal(c.gateway.login({ username: 'alice', password: permanent, clientId: 'codex' }).user.mustChangePassword, false);
  } finally { await c.close(); }
});

test('temporary OAuth update has fresh session-bound CSRF and cancellation revokes its limited session', async () => {
  const c = await setup();
  try {
    const pending = await temporaryPage(c);
    const cookie = pending.response.headers['set-cookie'].find((item) => item.startsWith('__Host-gw_oauth_password='));
    const encoded = cookie.split('=')[1].split('.')[0];
    const temporaryToken = JSON.parse(Buffer.from(encoded, 'base64url')).token;
    assert.equal(pending.response.body.includes(temporaryToken), false);
    const changed = await c.browser(pending.path, { method: 'POST', origin: issuer, form: { csrf: pending.oldCsrf, action: 'change-password', currentPassword: temporary, newPassword: permanent, confirmPassword: permanent } });
    assert.equal(changed.status, 403);
    const cancel = await c.browser(pending.path, { method: 'POST', origin: issuer, form: { csrf: csrfFrom(changed.body), action: 'deny' } });
    assert.equal(cancel.status, 303);
    assert.throws(() => c.gateway.profile(temporaryToken), { code: 'AUTH_REQUIRED' });
    assert.equal(c.gateway.login({ username: 'alice', password: temporary, clientId: 'codex' }).user.mustChangePassword, true);
  } finally { await c.close(); }
});

test('temporary OAuth current-password verification is rate limited and invalidated by another administrator reset', async () => {
  const c = await setup();
  try {
    const pending = await temporaryPage(c);
    const form = { csrf: csrfFrom(pending.response.body), action: 'change-password', currentPassword: 'wrong', newPassword: permanent, confirmPassword: permanent };
    for (let i = 0; i < 4; i++) assert.equal((await c.browser(pending.path, { method: 'POST', origin: issuer, form })).status, 400);
    const limit = await c.browser(pending.path, { method: 'POST', origin: issuer, form });
    assert.equal(limit.status, 429);
    assert.ok(Number(limit.headers['retry-after']) > 0);
    c.gateway.resetUserPassword(c.admin, { userId: c.alice.id, temporaryPassword: 'A second reset password 567!' });
    assert.equal((await c.browser(pending.path, { method: 'POST', origin: issuer, form: { ...form, currentPassword: temporary } })).status, 403);
    assert.throws(() => c.gateway.login({ username: 'alice', password: permanent, clientId: 'codex' }), { code: 'INVALID_CREDENTIALS' });
  } finally { await c.close(); }
});

test('portal login rejects missing CSRF, duplicate/unknown fields and redirects outside fixed routes', async () => {
  const c = await setup();
  try {
    const page = await c.browser('/account/login?return_to=https://evil.invalid');
    const form = { username: 'alice', password, csrf: csrfFrom(page.body) };
    assert.equal((await c.browser('/account/login', { method: 'POST', origin: issuer, form: { ...form, csrf: 'forged' } })).status, 403);
    assert.equal((await c.browser('/account/login', { method: 'POST', origin: issuer, form: { ...form, userId: c.bob.id } })).status, 400);
    const duplicate = new URLSearchParams(form); duplicate.append('username', 'bob');
    assert.equal((await c.browser('/account/login', { method: 'POST', origin: issuer, form: duplicate })).status, 400);
    const signed = await c.browser('/account/login?return_to=https://evil.invalid', { method: 'POST', origin: issuer, form });
    assert.equal(signed.headers.location, '/account');
    const forged = signed.headers['set-cookie'].find((value) => value.startsWith('__Host-gw_account=')).split(';')[0] + 'x';
    assert.equal((await c.browser('/account/connections', { headers: { Cookie: forged } })).headers.location, '/account/login');
    assert.equal((await c.browser('/account/missing')).status, 404);
  } finally { await c.close(); }
});
