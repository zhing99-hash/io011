import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { Client, StreamableHTTPClientTransport, UnauthorizedError } from '@modelcontextprotocol/client';
import { McpServer } from '@modelcontextprotocol/server';
import { registerQueryTools } from './mcp-tools.js';
import { validateClientConfig } from './client-config.js';
import { startOAuthCallback } from './oauth-callback.js';

/** Open only the already validated HTTPS authorization URL, without a command shell. */
export async function openAuthorizationBrowser(url) {
  const command = process.platform === 'win32' ? 'rundll32.exe' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', url.href] : [url.href];
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, windowsHide: true, stdio: 'ignore' });
    child.once('error', reject);
    child.once('spawn', () => { child.unref(); resolve(); });
  });
}

/** Discovery, token and MCP requests stay at the configured enterprise origin. */
export function createEnterpriseFetch(origin, fetchImpl = globalThis.fetch, signal) {
  return async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.origin !== origin || url.protocol !== 'https:' || url.username || url.password || url.hash) throw new Error('UNTRUSTED_OAUTH_ENDPOINT');
    const response = await fetchImpl(request, { redirect: 'error', signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000), ...(signal ? [signal] : [])]) });
    if (response.status >= 300 && response.status < 400) { await response.body?.cancel(); throw new Error('OAUTH_REDIRECT_REFUSED'); }
    // This connector serves bounded query responses, never file contents or subscriptions.
    const reader = response.body?.getReader();
    const chunks = []; let size = 0;
    try {
      if (reader) for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 2 * 1024 * 1024) throw new Error('UPSTREAM_RESPONSE_TOO_LARGE');
        chunks.push(value);
      }
    } catch (error) { await reader?.cancel().catch(() => {}); throw error; }
    return new Response([204, 205, 304].includes(response.status) ? null : Buffer.concat(chunks), { status: response.status, headers: response.headers });
  };
}

/** A local, read-only MCP adapter. No account password or token is persisted. */
export class ClientBridge {
  constructor(config, { fetch, openBrowser = openAuthorizationBrowser, notify = (message) => process.stderr.write(message + '\n') } = {}) {
    this.config = validateClientConfig(config);
    this.issuer = new URL(this.config.serverUrl).origin;
    this.abort = new AbortController();
    this.fetch = createEnterpriseFetch(this.issuer, fetch, this.abort.signal);
    this.openBrowser = openBrowser;
    this.notify = notify;
    this.tokens = undefined; this.discovery = undefined; this.verifier = undefined;
    this.client = undefined; this.connecting = undefined; this.callback = undefined;
    this.closed = false; this.queue = Promise.resolve();
    const bridge = this;
    this.provider = {
      get redirectUrl() { return bridge.redirectUrl; },
      get clientMetadata() { return { redirect_uris: bridge.redirectUrl ? [bridge.redirectUrl] : [],
        grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], token_endpoint_auth_method: 'none', scope: 'mcp:read offline_access' }; },
      clientInformation: (context) => {
        if (context?.issuer && context.issuer !== this.issuer) throw new Error('UNTRUSTED_OAUTH_ISSUER');
        return { client_id: this.config.clientId, issuer: this.issuer };
      },
      tokens: () => this.tokens, saveTokens: (tokens) => { this.tokens = tokens; },
      codeVerifier: () => this.verifier, saveCodeVerifier: (value) => { this.verifier = value; },
      discoveryState: () => this.discovery, saveDiscoveryState: (value) => { this.discovery = value; },
      state: () => this.state,
      invalidateCredentials: (scope) => {
        if (scope === 'all' || scope === 'tokens') this.tokens = undefined;
        if (scope === 'all' || scope === 'verifier') this.verifier = undefined;
        if (scope === 'all' || scope === 'discovery') this.discovery = undefined;
      },
      validateResourceURL: async (url, resource) => {
        if (String(url) !== this.config.serverUrl || (resource && resource !== this.config.serverUrl)) throw new Error('UNTRUSTED_OAUTH_RESOURCE');
        return new URL(this.config.serverUrl);
      },
      redirectToAuthorization: async (url) => {
        if (!this.callback) throw new Error('AUTHORIZATION_REQUIRED');
        if (url.origin !== this.issuer || url.pathname !== '/oauth/auth' || url.searchParams.get('client_id') !== this.config.clientId ||
            url.searchParams.get('redirect_uri') !== this.callback.redirectUrl || url.searchParams.get('state') !== this.state ||
            url.searchParams.get('code_challenge_method') !== 'S256' || url.searchParams.get('resource') !== this.config.serverUrl) throw new Error('UNTRUSTED_AUTHORIZATION_URL');
        this.authorizationStarted = true;
        this.notify('请在企业网页登录并确认连接：' + url.href);
        if (this.config.openBrowser) {
          try { await this.openBrowser(url); }
          catch { this.notify('无法自动打开浏览器，请打开上面的企业登录链接。'); }
        }
      },
    };
  }

  createServer() {
    const server = new McpServer({ name: 'enterprise-gateway-connector', version: '0.1.0' });
    registerQueryTools(server, (name, args) => this.callTool(name, args));
    return server;
  }

  async connect() {
    if (this.closed) throw new Error('CONNECTOR_CLOSED');
    if (this.client) return this.client;
    if (this.connecting) return this.connecting;
    this.connecting = this.connectOnce();
    try { return await this.connecting; } finally { this.connecting = undefined; }
  }

  async connectOnce() {
    this.state = randomBytes(32).toString('hex'); this.authorizationStarted = false;
    const callback = await startOAuthCallback({ state: this.state, issuer: this.issuer,
      timeoutMs: this.config.authorizationTimeoutMs, signal: this.abort.signal });
    this.callback = callback;
    // Retain the non-secret URI after closing its listener. SDK refresh still
    // needs to identify this provider as an interactive authorization-code client.
    this.redirectUrl = callback.redirectUrl;
    let client = new Client({ name: 'enterprise-gateway-connector', version: '0.1.0' });
    const transport = new StreamableHTTPClientTransport(new URL(this.config.serverUrl), { authProvider: this.provider, fetch: this.fetch });
    try {
      try { await client.connect(transport); }
      catch (error) {
        if (!(error instanceof UnauthorizedError) || !this.authorizationStarted) throw error;
        const params = await callback.result;
        await transport.finishAuth(params);
        await client.close();
        client = new Client({ name: 'enterprise-gateway-connector', version: '0.1.0' });
        await client.connect(new StreamableHTTPClientTransport(new URL(this.config.serverUrl), { authProvider: this.provider, fetch: this.fetch }));
      }
      if (this.closed) throw new Error('CONNECTOR_CLOSED');
      this.client = client;
      return client;
    } catch (error) { await client.close().catch(() => {}); throw error; }
    finally { this.callback = undefined; this.verifier = undefined; await callback.close(); }
  }

  callTool(name, args) {
    // Serializing calls also serializes SDK refresh-token rotation.
    const work = this.queue.then(async () => {
      try {
        const client = await this.connect();
        return await client.callTool({ name, arguments: args }, undefined, { timeout: 20000 });
      } catch {
        await this.client?.close().catch(() => {}); this.client = undefined;
        this.tokens = undefined; this.verifier = undefined;
        this.notify('企业连接未完成或已失效。请检查网络、企业地址和账号授权后重试。');
        return { isError: true, content: [{ type: 'text', text: '{"error":"ENTERPRISE_CONNECTION_FAILED"}' }], structuredContent: { error: 'ENTERPRISE_CONNECTION_FAILED' } };
      }
    });
    this.queue = work.catch(() => {});
    return work;
  }

  async close() {
    this.closed = true; this.abort.abort();
    await this.connecting?.catch(() => {});
    await this.client?.close().catch(() => {});
    this.client = undefined; this.tokens = undefined; this.verifier = undefined; this.discovery = undefined; this.redirectUrl = undefined;
  }
}
