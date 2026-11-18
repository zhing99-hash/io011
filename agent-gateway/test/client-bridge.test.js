import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PassThrough } from 'node:stream';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { StdioServerTransport, serveStdio } from '@modelcontextprotocol/server/stdio';
import { Gateway } from '../src/gateway.js';
import { startHttpsApi } from '../src/https-api.js';
import { ClientBridge, createEnterpriseFetch } from '../src/client-bridge.js';
import { startOAuthCallback } from '../src/oauth-callback.js';
import { createBrowser, createSdkFetch, authorize, issuer } from '../test-support/oauth-browser.js';
import { ReadBuffer, serializeMessage } from '@modelcontextprotocol/client';

const password = 'OAuth account password 123!';

async function setup() {
  const gateway = new Gateway();
  gateway.bootstrapAdmin({ username: 'admin', password });
  const admin = gateway.login({ username: 'admin', password, clientId: 'platform-settings' }).token;
  const user = gateway.createUser(admin, { username: 'alice', password });
  const privateKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ format: 'jwk' });
  const secrets = { jwks: { keys: [{ ...privateKey, kid: 'test-key', alg: 'RS256', use: 'sig' }] },
    cookieKeys: [randomBytes(32).toString('hex'), randomBytes(32).toString('hex')], storageKey: randomBytes(32).toString('hex') };
  const { server } = await startHttpsApi(gateway, { cert: readFileSync(new URL('./fixtures/local-test-cert.pem', import.meta.url)),
    key: readFileSync(new URL('./fixtures/local-test-key.pem', import.meta.url)), publicOrigin: issuer, port: 0,
    oauth: { secrets, clients: [{ clientId: 'desktop-test', clientName: 'Desktop test', redirectUris: ['http://127.0.0.1:34567/callback'] }] } });
  return { gateway, admin, user, server, close: async () => { await new Promise((resolve) => server.close(resolve)); gateway.close(); } };
}

test('native callback refuses forged state, duplicate params, wrong issuer and replay without reflecting secrets', async () => {
  const state = 'a'.repeat(64);
  const callback = await startOAuthCallback({ state, issuer, timeoutMs: 5000 });
  const callbackUrl = new URL(callback.redirectUrl);
  const query = (extra = {}) => new URLSearchParams({ state, iss: issuer, code: 'private-code', ...extra });
  try {
    for (const params of [query({ state: 'b'.repeat(64) }), query({ state: '文'.repeat(64) }), query({ iss: 'https://evil.invalid' }), new URLSearchParams(query().toString() + '&state=' + state)]) {
      const response = await fetch(callbackUrl + '?' + params);
      assert.equal(response.status, 400);
      assert.equal((await response.text()).includes('private-code'), false);
    }
    assert.equal((await fetch(callbackUrl + '?' + query(), { headers: { Origin: 'https://evil.invalid' } })).status, 400);
    const accepted = await fetch(callbackUrl + '?' + query());
    assert.equal(accepted.status, 200);
    assert.equal((await accepted.text()).includes('private-code'), false);
    assert.match(accepted.headers.get('content-security-policy'), /default-src 'none'/);
    assert.equal((await callback.result).get('code'), 'private-code');
    assert.equal((await fetch(callbackUrl + '?' + query())).status, 400);
  } finally { await callback.close(); }
});

test('native callback has bounded timeout and cancellation', async () => {
  const callback = await startOAuthCallback({ state: 'a'.repeat(64), issuer, timeoutMs: 30 });
  try { await assert.rejects(callback.result, /AUTHORIZATION_TIMEOUT/); } finally { await callback.close(); }
  const controller = new AbortController();
  const cancelled = await startOAuthCallback({ state: 'a'.repeat(64), issuer, timeoutMs: 5000, signal: controller.signal });
  controller.abort();
  try { await assert.rejects(cancelled.result, /AUTHORIZATION_CANCELLED/); } finally { await cancelled.close(); }
});

test('enterprise fetch refuses cross-origin endpoints, redirects and oversized responses', async () => {
  let calls = 0;
  const guarded = createEnterpriseFetch(issuer, async () => { calls++; return new Response('{}'); });
  await assert.rejects(guarded('https://evil.invalid/oauth/token'), /UNTRUSTED/);
  await assert.rejects(guarded('http://gateway-test.invalid/oauth/token'), /UNTRUSTED/);
  assert.equal(calls, 0);
  assert.equal((await guarded(issuer + '/oauth/token')).status, 200);
  const redirect = createEnterpriseFetch(issuer, async (_req, init) => { assert.equal(init.redirect, 'error'); return new Response(null, { status: 302 }); });
  await assert.rejects(redirect(issuer + '/mcp'), /REDIRECT_REFUSED/);
  const huge = createEnterpriseFetch(issuer, async () => new Response('x'.repeat(2 * 1024 * 1024 + 1)));
  await assert.rejects(huge(issuer + '/mcp'), /TOO_LARGE/);
});

test('bridge lazily authorizes once, uses ephemeral loopback PKCE, serializes calls and fails closed after revocation', async () => {
  const c = await setup();
  let opened = 0;
  const messages = [];
  let bridge;
  try {
    bridge = new ClientBridge({ serverUrl: issuer + '/mcp', clientId: 'desktop-test', authorizationTimeoutMs: 10000 }, {
      fetch: createSdkFetch(c.server), notify: (message) => messages.push(message),
      openBrowser: async (url) => {
        opened++;
        const redirect = new URL(url.searchParams.get('redirect_uri'));
        assert.equal(redirect.hostname, '127.0.0.1');
        assert.equal(redirect.pathname, '/callback');
        assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
        const flow = await authorize(createBrowser(c.server), { startUrl: url.href });
        assert.equal((await fetch(flow.url)).status, 200);
      },
    });
    assert.equal(opened, 0);
    assert.equal(bridge.tokens, undefined);
    const results = await Promise.all([bridge.callTool('get_my_profile', {}), bridge.callTool('list_authorized_targets', {})]);
    assert.equal(results[0].structuredContent?.username, 'alice', JSON.stringify(results));
    assert.equal(results[1].isError, undefined);
    assert.equal(opened, 1);
    const token = bridge.tokens.access_token;
    assert.ok(token);
    assert.equal(messages.some((message) => message.includes(token)), false);
    assert.equal(bridge.callback, undefined);
    assert.equal(bridge.verifier, undefined);
    const oldRefresh = bridge.tokens.refresh_token;
    bridge.tokens = { ...bridge.tokens, access_token: 'x'.repeat(43) };
    assert.equal((await bridge.callTool('get_my_profile', {})).structuredContent?.username, 'alice');
    assert.notEqual(bridge.tokens.refresh_token, oldRefresh);
    assert.equal(opened, 1, 'an in-memory refresh does not open another browser');
    const session = c.gateway.login({ username: 'alice', password, clientId: 'platform-settings' }).token;
    c.gateway.revokeClientSessions(session, 'desktop-test');
    const rejected = await bridge.callTool('get_my_profile', {});
    assert.equal(rejected.isError, true);
    assert.equal(rejected.structuredContent.error, 'ENTERPRISE_CONNECTION_FAILED');
    assert.equal(bridge.tokens, undefined);
    assert.equal(opened, 1, 'revocation does not silently reopen the browser during a call');
  } finally { await bridge?.close(); await c.close(); }
});

test('browser refusal returns a fixed connector error without logging callback parameters', async () => {
  const c = await setup();
  const messages = [];
  let callbackUrl;
  const bridge = new ClientBridge({ serverUrl: issuer + '/mcp', clientId: 'desktop-test', authorizationTimeoutMs: 10000 }, {
    fetch: createSdkFetch(c.server), notify: (message) => messages.push(message),
    openBrowser: async (url) => {
      const flow = await authorize(createBrowser(c.server), { startUrl: url.href, deny: true });
      callbackUrl = flow.url;
      assert.equal((await fetch(callbackUrl)).status, 200);
    },
  });
  try {
    assert.equal((await bridge.callTool('get_my_profile', {})).structuredContent.error, 'ENTERPRISE_CONNECTION_FAILED');
    assert.equal(bridge.tokens, undefined);
    assert.equal(messages.some((message) => message.includes('error_description=')), false);
    await assert.rejects(fetch(new URL('/callback', callbackUrl)));
  } finally { await bridge.close(); await c.close(); }
});

test('stdio discovery does not contact the server or open a browser', async () => {
  let network = 0, opened = 0;
  const bridge = new ClientBridge({ serverUrl: issuer + '/mcp', clientId: 'desktop-test' }, {
    fetch: async () => { network++; throw new Error('offline'); }, openBrowser: async () => { opened++; }, notify: () => {},
  });
  const input = new PassThrough(), output = new PassThrough();
  const buffer = new ReadBuffer(); const messages = [];
  output.on('data', (data) => { buffer.append(data); for (;;) { const message = buffer.readMessage(); if (!message) break; messages.push(message); } });
  const transport = new StdioServerTransport(input, output);
  const handle = serveStdio(() => bridge.createServer(), { transport });
  try {
    input.write(serializeMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'probe', version: '1' } } }));
    for (let i = 0; i < 30 && !messages.some((m) => m.id === 1); i++) await new Promise((resolve) => setTimeout(resolve, 10));
    input.write(serializeMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }));
    input.write(serializeMessage({ jsonrpc: '2.0', id: 2, method: 'tools/list' }));
    for (let i = 0; i < 30 && !messages.some((m) => m.id === 2); i++) await new Promise((resolve) => setTimeout(resolve, 10));
    const tools = messages.find((m) => m.id === 2)?.result.tools;
    assert.equal(tools?.length, 4, JSON.stringify(messages));
    assert.equal(network, 0); assert.equal(opened, 0);
    await bridge.close();
    assert.equal((await bridge.callTool('get_my_profile', {})).isError, true);
    assert.equal(network, 0);
  } finally { await handle.close(); await bridge.close(); input.destroy(); output.destroy(); }
});

test('closing a connector cancels an unfinished browser authorization and releases its callback port', async () => {
  const c = await setup();
  let opened;
  const sawBrowser = new Promise((resolve) => { opened = resolve; });
  const bridge = new ClientBridge({ serverUrl: issuer + '/mcp', clientId: 'desktop-test' }, {
    fetch: createSdkFetch(c.server), notify: () => {}, openBrowser: async (url) => opened(url),
  });
  try {
    const work = bridge.callTool('get_my_profile', {});
    const authorization = await sawBrowser;
    const callback = authorization.searchParams.get('redirect_uri');
    await bridge.close();
    assert.equal((await work).isError, true);
    await assert.rejects(fetch(callback));
    assert.equal(bridge.tokens, undefined);
  } finally { await bridge.close(); await c.close(); }
});

test('real stdio child completes browser OAuth and remote HTTPS query, then exits on pipe close', async () => {
  const c = await setup();
  const dir = mkdtempSync(join(tmpdir(), 'gateway-bridge-pipes-'));
  let client;
  try {
    const configPath = join(dir, 'client.json');
    writeFileSync(configPath, JSON.stringify({ serverUrl: issuer + '/mcp', clientId: 'desktop-test', openBrowser: false, authorizationTimeoutMs: 20000 }));
    const transport = new StdioClientTransport({ command: process.execPath,
      args: ['--preserve-symlinks', '--preserve-symlinks-main', fileURLToPath(new URL('../test-support/client-bridge-child.mjs', import.meta.url)), configPath, String(c.server.address().port)], stderr: 'pipe' });
    let diagnostics = '', sawUrl;
    const link = new Promise((resolve) => { sawUrl = resolve; });
    transport.stderr.setEncoding('utf8');
    transport.stderr.on('data', (part) => {
      diagnostics += part;
      const found = /https:\/\/gateway-test\.invalid\/oauth\/auth\?[^\r\n]+/.exec(diagnostics);
      if (found) sawUrl(found[0]);
    });
    client = new Client({ name: 'stdio-acceptance', version: '1' });
    await client.connect(transport);
    assert.equal((await client.listTools()).tools.length, 4);
    assert.equal(diagnostics, '');
    const query = client.callTool({ name: 'get_my_profile', arguments: {} }, undefined, { timeout: 30000 });
    const url = await link;
    const flow = await authorize(createBrowser(c.server), { startUrl: url });
    assert.equal((await fetch(flow.url)).status, 200);
    const profile = await query;
    assert.equal(profile.structuredContent.username, 'alice');
    const targets = await client.callTool({ name: 'list_authorized_targets', arguments: {} });
    assert.equal(targets.isError, undefined);
    assert.equal(diagnostics.includes(password), false);
    await client.close(); client = undefined;
    await assert.rejects(fetch(new URL('/callback', flow.url)));
  } finally { await client?.close(); await c.close(); rmSync(dir, { recursive: true, force: true }); }
});
