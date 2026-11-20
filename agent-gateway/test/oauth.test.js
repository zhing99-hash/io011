import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Gateway } from '../src/gateway.js';
import { startHttpsApi } from '../src/https-api.js';
import { createBrowser, authorize, exchange, issuer, rpcResult, csrfFrom } from '../test-support/oauth-browser.js';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

const password = 'OAuth account password 123!';
const privateKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ format: 'jwk' });
const secrets = { jwks: { keys: [{ ...privateKey, kid: 'test-signing-key', alg: 'RS256', use: 'sig' }] },
  cookieKeys: [randomBytes(32).toString('hex'), randomBytes(32).toString('hex')], storageKey: randomBytes(32).toString('hex') };
const oauth = { secrets, clients: [{ clientId: 'desktop-test', clientName: 'Test desktop', redirectUris: ['http://127.0.0.1:34567/callback'] }] };
const tls = { cert: readFileSync(new URL('./fixtures/local-test-cert.pem', import.meta.url)), key: readFileSync(new URL('./fixtures/local-test-key.pem', import.meta.url)), publicOrigin: issuer, port: 0, oauth };

async function setup(filename) {
  const gateway = new Gateway({ filename });
  let admin;
  if (!gateway.isInitialized()) {
    gateway.bootstrapAdmin({ username: 'admin', password });
    admin = gateway.login({ username: 'admin', password, clientId: 'codex' }).token;
    gateway.createUser(admin, { username: 'alice', password });
  } else admin = gateway.login({ username: 'admin', password, clientId: 'codex' }).token;
  const { server } = await startHttpsApi(gateway, tls);
  return { gateway, server, browser: createBrowser(server), admin,
    close: async () => { await new Promise((resolve) => server.close(resolve)); gateway.close(); } };
}

test('OAuth browser consent, PKCE, refresh rotation and revocation protect the MCP resource', async () => {
  const c = await setup();
  try {
    const challenge = await c.browser('/mcp', { method: 'POST', json: {} });
    assert.equal(challenge.status, 401);
    assert.match(challenge.headers['www-authenticate'], /oauth-protected-resource/);
    const metadata = JSON.parse((await c.browser('/.well-known/oauth-protected-resource')).body);
    assert.equal(metadata.resource, issuer + '/mcp');
    const flow = await authorize(c.browser);
    assert.equal(flow.sawConsent, true);
    assert.equal(flow.url.searchParams.get('state'), flow.state);
    assert.equal(flow.url.searchParams.get('iss'), issuer);
    const tokenResponse = await exchange(c.browser, flow.url.searchParams.get('code'), flow.verifier);
    assert.equal(tokenResponse.status, 200, tokenResponse.body);
    const tokens = JSON.parse(tokenResponse.body);
    assert.ok(tokens.access_token && tokens.refresh_token);
    const call = (access) => c.browser('/mcp', { method: 'POST', token: access,
      headers: { Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-11-25' },
      json: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_my_profile', arguments: {} } } });
    const response = await call(tokens.access_token);
    assert.equal(response.status, 200, response.body);
    assert.equal(rpcResult(response).result.structuredContent.username, 'alice');
    assert.equal((await c.browser('/v1/me', { token: tokens.access_token })).status, 401);
    const refreshed = await c.browser('/oauth/token', { method: 'POST', form: { grant_type: 'refresh_token', client_id: 'desktop-test', refresh_token: tokens.refresh_token, resource: issuer + '/mcp' } });
    assert.equal(refreshed.status, 200, refreshed.body);
    const next = JSON.parse(refreshed.body);
    assert.notEqual(next.refresh_token, tokens.refresh_token);
    const revoked = await c.browser('/oauth/revoke', { method: 'POST', form: { client_id: 'desktop-test', token: next.refresh_token, token_type_hint: 'refresh_token' } });
    assert.equal(revoked.status, 200, revoked.body);
    assert.equal((await call(next.access_token)).status, 401);
    assert.equal((await c.browser('/oauth/token', { method: 'POST', form: { grant_type: 'refresh_token', client_id: 'desktop-test', refresh_token: next.refresh_token } })).status, 400);
    assert.equal((await exchange(c.browser, flow.url.searchParams.get('code'), flow.verifier)).status, 400);
    const audit = c.gateway.auditForAdmin(c.admin);
    assert.equal(audit.some((event) => event.action === 'oauth_consent' && event.client_id === 'desktop-test'), true);
    assert.equal(JSON.stringify(audit).includes(tokens.access_token), false);
  } finally { await c.close(); }
});

test('OAuth rejects redirect substitution, missing PKCE and browser form CSRF', async () => {
  const c = await setup();
  try {
    const invalid = await c.browser('/oauth/auth?' + new URLSearchParams({ client_id: 'desktop-test', response_type: 'code', redirect_uri: 'https://evil.invalid/callback', scope: 'mcp:read', resource: issuer + '/mcp' }));
    assert.equal(invalid.status, 400);
    assert.equal(invalid.headers.location, undefined);
    const noPkce = await c.browser('/oauth/auth?' + new URLSearchParams({ client_id: 'desktop-test', response_type: 'code', redirect_uri: 'http://127.0.0.1:34567/callback', scope: 'mcp:read', resource: issuer + '/mcp' }));
    assert.equal(new URL(noPkce.headers.location, issuer).searchParams.get('error'), 'invalid_request');
    const params = new URLSearchParams({ client_id: 'desktop-test', response_type: 'code', redirect_uri: 'http://127.0.0.1:34567/callback', scope: 'mcp:read', resource: issuer + '/mcp', code_challenge: 'a'.repeat(43), code_challenge_method: 'S256' });
    const start = await c.browser('/oauth/auth?' + params);
    const page = await c.browser(start.headers.location);
    assert.ok(csrfFrom(page.body));
    assert.match(page.headers['content-security-policy'], /frame-ancestors 'none'/);
    const forged = await c.browser(start.headers.location, { method: 'POST', origin: issuer, form: { action: 'login', username: 'alice', password, csrf: 'forged' } });
    assert.equal(forged.status, 403);
  } finally { await c.close(); }
});

test('OAuth artifacts persist across provider restart and user password reset invalidates the grant', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'gateway-oauth-'));
  const path = join(dir, 'gateway.sqlite');
  let c = await setup(path);
  try {
    const flow = await authorize(c.browser);
    const response = await exchange(c.browser, flow.url.searchParams.get('code'), flow.verifier);
    assert.equal(response.status, 200, response.body);
    const tokens = JSON.parse(response.body);
    await c.close(); c = await setup(path);
    const refreshed = await c.browser('/oauth/token', { method: 'POST', form: { grant_type: 'refresh_token', client_id: 'desktop-test', refresh_token: tokens.refresh_token, resource: issuer + '/mcp' } });
    assert.equal(refreshed.status, 200, refreshed.body);
    const next = JSON.parse(refreshed.body);
    const user = rpcResult(await c.browser('/mcp', { method: 'POST', token: next.access_token,
      headers: { Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-11-25' },
      json: { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_my_profile', arguments: {} } } })).result.structuredContent;
    c.gateway.resetUserPassword(c.admin, { userId: user.id, temporaryPassword: 'A new temporary password 456!' });
    const rejected = await c.browser('/oauth/token', { method: 'POST', form: { grant_type: 'refresh_token', client_id: 'desktop-test', refresh_token: next.refresh_token, resource: issuer + '/mcp' } });
    assert.equal(rejected.status, 400);
    assert.equal((await c.browser('/mcp', { method: 'POST', token: next.access_token, json: {} })).status, 401);
  } finally { await c.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('official MCP client discovers OAuth metadata, completes PKCE and calls tools over verified TLS', async () => {
  const c = await setup();
  const native = createBrowser(c.server);
  let tokens;
  let verifier;
  let redirect;
  let discovery;
  const state = randomBytes(16).toString('hex');
  const provider = {
    redirectUrl: 'http://127.0.0.1:34567/callback',
    clientMetadata: { redirect_uris: ['http://127.0.0.1:34567/callback'], grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'], token_endpoint_auth_method: 'none', scope: 'mcp:read offline_access' },
    clientInformation: () => ({ client_id: 'desktop-test', issuer }),
    tokens: () => tokens, saveTokens: (value) => { tokens = value; },
    saveCodeVerifier: (value) => { verifier = value; }, codeVerifier: () => verifier,
    redirectToAuthorization: (url) => { redirect = url.href; }, state: () => state,
    discoveryState: () => discovery, saveDiscoveryState: (value) => { discovery = value; },
  };
  const fetch = async (input, init) => {
    const request = new Request(input, init);
    const body = ['GET', 'HEAD'].includes(request.method) ? '' : await request.text();
    const form = request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded');
    const response = await native(request.url, { method: request.method, headers: Object.fromEntries(request.headers),
      ...(body ? form ? { form: Object.fromEntries(new URLSearchParams(body)) } : { json: JSON.parse(body) } : {}) });
    const headers = new Headers();
    for (const [name, value] of Object.entries(response.headers)) {
      if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(',') : value);
    }
    return new Response([204, 205, 304].includes(response.status) ? null : response.body, { status: response.status, headers });
  };
  let client = new Client({ name: 'oauth-integration', version: '0.1.0' });
  const transport = new StreamableHTTPClientTransport(new URL(issuer + '/mcp'), { authProvider: provider, fetch });
  try {
    await assert.rejects(client.connect(transport));
    assert.ok(redirect);
    assert.equal(new URL(redirect).searchParams.get('code_challenge_method'), 'S256');
    const callback = await authorize(c.browser, { startUrl: redirect });
    assert.equal(callback.url.searchParams.get('state'), state);
    await transport.finishAuth(callback.url.searchParams);
    assert.ok(tokens.access_token);
    await client.close();
    client = new Client({ name: 'oauth-integration', version: '0.1.0' });
    await client.connect(new StreamableHTTPClientTransport(new URL(issuer + '/mcp'), { authProvider: provider, fetch }));
    assert.equal((await client.listTools()).tools.length, 4);
    assert.equal((await client.callTool({ name: 'get_my_profile', arguments: {} })).structuredContent.username, 'alice');
    const account = c.gateway.login({ username: 'alice', password, clientId: 'platform-settings' }).token;
    c.gateway.revokeClientSessions(account, 'desktop-test');
    assert.equal((await c.browser('/mcp', { method: 'POST', token: tokens.access_token, json: {} })).status, 401);
  } finally { await client.close(); await c.close(); }
});

test('refresh token replay revokes the token family and wrong PKCE cannot exchange a code', async () => {
  const c = await setup();
  try {
    const wrongFlow = await authorize(c.browser);
    const wrong = await exchange(c.browser, wrongFlow.url.searchParams.get('code'), 'z'.repeat(43));
    assert.equal(wrong.status, 400);
    const flow = await authorize(createBrowser(c.server));
    const response = await exchange(c.browser, flow.url.searchParams.get('code'), flow.verifier);
    assert.equal(response.status, 200, response.body);
    const original = JSON.parse(response.body);
    const refresh = (value) => c.browser('/oauth/token', { method: 'POST', form: { grant_type: 'refresh_token',
      client_id: 'desktop-test', refresh_token: value, resource: issuer + '/mcp' } });
    const rotated = await refresh(original.refresh_token);
    assert.equal(rotated.status, 200);
    const next = JSON.parse(rotated.body);
    assert.equal((await refresh(original.refresh_token)).status, 400);
    assert.equal((await c.browser('/mcp', { method: 'POST', token: next.access_token, json: {} })).status, 401);
    assert.equal((await refresh(next.refresh_token)).status, 400);
  } finally { await c.close(); }
});

test('user refusal and a wrong resource cannot issue an MCP authorization code', async () => {
  const c = await setup();
  try {
    const refused = await authorize(c.browser, { deny: true });
    assert.equal(refused.url.searchParams.get('error'), 'access_denied');
    assert.equal(refused.url.searchParams.has('code'), false);
    const wrong = await authorize(createBrowser(c.server), { extra: { resource: 'https://other-resource.invalid/mcp' } });
    assert.equal(wrong.url.searchParams.has('code'), false);
    assert.equal(wrong.url.searchParams.get('error'), 'invalid_target');
  } finally { await c.close(); }
});
