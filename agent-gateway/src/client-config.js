import { readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';

export function validateClientConfig(value) {
  const fields = ['serverUrl', 'clientId', 'openBrowser', 'authorizationTimeoutMs'];
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some((key) => !fields.includes(key))) throw new Error('INVALID_CLIENT_CONFIG');
  let url;
  try { url = new URL(value.serverUrl); } catch { throw new Error('INVALID_CLIENT_URL'); }
  if (typeof value.serverUrl !== 'string' || value.serverUrl !== url.href || url.protocol !== 'https:' ||
      url.username || url.password || value.serverUrl !== url.origin + '/mcp') throw new Error('INVALID_CLIENT_URL');
  if (typeof value.clientId !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_.-]{1,63}$/.test(value.clientId)) throw new Error('INVALID_CLIENT_ID');
  const openBrowser = value.openBrowser ?? true;
  const authorizationTimeoutMs = value.authorizationTimeoutMs ?? 180000;
  if (typeof openBrowser !== 'boolean' || !Number.isInteger(authorizationTimeoutMs) || authorizationTimeoutMs < 1000 || authorizationTimeoutMs > 600000) throw new Error('INVALID_CLIENT_CONFIG');
  return Object.freeze({ serverUrl: url.href, clientId: value.clientId, openBrowser, authorizationTimeoutMs });
}

export function readClientConfig(path) {
  if (!isAbsolute(path ?? '')) throw new Error('CLIENT_CONFIG_REQUIRES_ABSOLUTE_PATH');
  const data = readFileSync(path);
  if (data.length > 8192) throw new Error('CLIENT_CONFIG_TOO_LARGE');
  return validateClientConfig(JSON.parse(data));
}
