import { createServer } from 'node:https';
import { createApiHandler } from './http-handler.js';
import { createOAuthServer } from './oauth-server.js';

/** Operator-provided certificates; there is no HTTP fallback. */
export async function startHttpsApi(gateway, { cert, key, publicOrigin, host = '127.0.0.1', port = 8443, oauth: oauthOptions, ...options } = {}) {
  let origin;
  try { origin = new URL(publicOrigin); } catch { throw new Error('INVALID_PUBLIC_ORIGIN'); }
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new Error('INVALID_PUBLIC_ORIGIN');
  }
  if (!cert || !key) throw new Error('TLS_MATERIAL_REQUIRED');
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('INVALID_LISTEN_PORT');
  const handler = createApiHandler(gateway, {
    ...options, secure: true, expectedAuthority: () => origin.host, allowedOrigin: () => origin.origin,
    oauth: oauthOptions ? createOAuthServer(gateway, { ...oauthOptions, issuer: origin.origin }) : undefined,
  });
  const server = createServer({
    cert, key, minVersion: 'TLSv1.2', maxHeaderSize: 8192,
    requestTimeout: 15000, headersTimeout: 10000, keepAliveTimeout: 5000,
  }, handler);
  server.maxHeadersCount = 64;
  server.maxRequestsPerSocket = 100;
  await new Promise((resolve, reject) => {
    server.once('error', reject); server.listen(port, host, resolve);
  });
  return { server, url: origin.origin };
}
