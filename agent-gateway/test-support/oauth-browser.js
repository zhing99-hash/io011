import { request } from 'node:https';
import { readFileSync } from 'node:fs';
import { randomBytes, createHash } from 'node:crypto';

export const issuer = 'https://gateway-test.invalid';
const cert = readFileSync(new URL('../test/fixtures/local-test-cert.pem', import.meta.url));
export function createBrowser(server) {
  const cookies = new Map();
  return async (path, { method = 'GET', form, json, token, origin, headers = {} } = {}) => {
    const url = new URL(path, issuer);
    if (url.origin !== issuer) throw new Error('Test browser will not follow external redirects');
    const body = form !== undefined ? new URLSearchParams(form).toString() : json !== undefined ? JSON.stringify(json) : undefined;
    const cookie = [...cookies.values()].filter((item) => url.pathname === item.path || url.pathname.startsWith(item.path.endsWith('/') ? item.path : item.path + '/')).map((item) => item.value).join('; ');
    const result = await new Promise((resolve, reject) => {
      const req = request({ hostname: '127.0.0.1', port: server.address().port, servername: 'gateway-test.invalid',
        ca: cert, method, path: url.pathname + url.search, agent: false,
        headers: { Host: 'gateway-test.invalid', ...(cookie ? { Cookie: cookie } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(origin ? { Origin: origin } : {}),
          ...(body !== undefined ? { 'Content-Type': form !== undefined ? 'application/x-www-form-urlencoded' : 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}), ...headers } }, (res) => {
        const chunks = [];
        res.on('data', (part) => chunks.push(part));
        res.on('error', reject);
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
      });
      req.on('error', reject); req.end(body);
    });
    for (const value of result.headers['set-cookie'] ?? []) {
      const parts = value.split(/;\s*/);
      const path = parts.find((part) => /^path=/i.test(part))?.slice(5) ?? '/';
      const name = parts[0].split('=')[0];
      const key = name + ':' + path;
      if (parts.some((part) => /^max-age=0$/i.test(part)) || parts[0].endsWith('=')) cookies.delete(key);
      else cookies.set(key, { path, value: parts[0] });
    }
    return result;
  };
}

/** SDK fetch adapter: real HTTPS, trusted test CA, fixed loopback dial address. */
export function createSdkFetch(server) {
  const browser = createBrowser(server);
  return async (input, init) => {
    const request = new Request(input, init);
    const body = ['GET', 'HEAD'].includes(request.method) ? '' : await request.text();
    const form = request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded');
    const response = await browser(request.url, { method: request.method, headers: Object.fromEntries(request.headers),
      ...(body ? form ? { form: Object.fromEntries(new URLSearchParams(body)) } : { json: JSON.parse(body) } : {}) });
    const headers = new Headers();
    for (const [name, value] of Object.entries(response.headers)) {
      if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(',') : value);
    }
    return new Response([204, 205, 304].includes(response.status) ? null : response.body, { status: response.status, headers });
  };
}

export const csrfFrom = (html) => /name="csrf" value="([a-f0-9]+)"/.exec(html)?.[1];
export const rpcResult = (response) => JSON.parse(response.body.startsWith('{') ? response.body : response.body.split('\n').find((line) => line.startsWith('data: ')).slice(6));

export async function authorize(browser, { username = 'alice', password = 'OAuth account password 123!', newPassword, extra = {}, deny = false, startUrl } = {}) {
  const verifier = randomBytes(32).toString('base64url');
  const params = startUrl ? new URL(startUrl).searchParams : new URLSearchParams({ client_id: 'desktop-test', response_type: 'code', redirect_uri: 'http://127.0.0.1:34567/callback',
    scope: 'mcp:read offline_access', resource: issuer + '/mcp', state: randomBytes(16).toString('hex'),
    code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', ...extra });
  let current = startUrl || '/oauth/auth?' + params;
  let sawConsent = false, changedPassword = false;
  for (let i = 0; i < 12; i++) {
    const response = await browser(current);
    if (response.headers.location) {
      const url = new URL(response.headers.location, issuer);
      if (url.origin !== issuer) return { url, verifier, state: params.get('state'), sawConsent, changedPassword };
      current = url.pathname + url.search;
      continue;
    }
    if (response.status !== 200) throw new Error('Authorization failed: ' + response.status + ' ' + response.body);
    const csrf = csrfFrom(response.body);
    const login = response.body.includes('name="username"');
    const update = response.body.includes('name="newPassword"');
    if (update && !newPassword && !deny) throw new Error('Temporary password update required in test');
    if (!login && !update) sawConsent = true;
    const submit = await browser(current, { method: 'POST', origin: issuer, form: {
      csrf, action: deny ? 'deny' : update ? 'change-password' : login ? 'login' : 'approve',
      ...(login ? { username, password } : update ? { currentPassword: password, newPassword, confirmPassword: newPassword } : {}),
    } });
    if (login && submit.status === 200 && submit.body.includes('name="newPassword"')) continue;
    if (!submit.headers.location) throw new Error('Interaction failed: ' + submit.status + ' ' + submit.body);
    if (update && !deny) changedPassword = true;
    current = submit.headers.location;
    if (new URL(current, issuer).origin !== issuer) return { url: new URL(current), verifier, state: params.get('state'), sawConsent, changedPassword };
  }
  throw new Error('Authorization exceeded test step bound');
}

export async function exchange(browser, code, verifier, extra = {}) {
  return browser('/oauth/token', { method: 'POST', form: { grant_type: 'authorization_code', client_id: 'desktop-test',
    redirect_uri: 'http://127.0.0.1:34567/callback', resource: issuer + '/mcp', code, code_verifier: verifier, ...extra } });
}
