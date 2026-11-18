import { readFileSync, statSync } from 'node:fs';
import { isAbsolute } from 'node:path';

export class ConfigError extends Error {
  constructor(code) { super(code); this.code = code; }
}

export function loadRuntimeConfig(path) {
  if (typeof path !== 'string' || !isAbsolute(path) || statSync(path).size > 16 * 1024) throw new ConfigError('INVALID_CONFIG_FILE');
  const value = JSON.parse(readFileSync(path, 'utf8'));
  const allowed = ['database', 'quarantineDirectory', 'publicOrigin', 'listenHost', 'listenPort', 'tlsCertificateFile', 'tlsPrivateKeyFile', 'allowedConnectorOrigins', 'oauth'];
  if (!value || Array.isArray(value) || typeof value !== 'object' || Object.keys(value).some((key) => !allowed.includes(key))) {
    throw new ConfigError('INVALID_CONFIG');
  }
  for (const field of ['database', 'quarantineDirectory', 'tlsCertificateFile', 'tlsPrivateKeyFile']) {
    if (typeof value[field] !== 'string' || !isAbsolute(value[field])) throw new ConfigError('ABSOLUTE_PATH_REQUIRED');
  }
  let origin;
  try { origin = new URL(value.publicOrigin); } catch { throw new ConfigError('INVALID_PUBLIC_ORIGIN'); }
  if (origin.protocol !== 'https:' || origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash) {
    throw new ConfigError('INVALID_PUBLIC_ORIGIN');
  }
  if (!Array.isArray(value.allowedConnectorOrigins) || !value.allowedConnectorOrigins.every((item) => {
    try {
      const url = new URL(item);
      return typeof item === 'string' && url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash;
    } catch { return false; }
  })) throw new ConfigError('INVALID_CONNECTOR_ORIGINS');
  const listenPort = value.listenPort ?? 8443;
  if (value.oauth !== undefined && (!value.oauth || typeof value.oauth !== 'object' || Array.isArray(value.oauth) ||
      Object.keys(value.oauth).some((key) => !['secretsFile', 'clients'].includes(key)) ||
      typeof value.oauth.secretsFile !== 'string' || !isAbsolute(value.oauth.secretsFile) || !Array.isArray(value.oauth.clients))) {
    throw new ConfigError('INVALID_OAUTH_CONFIG');
  }
  const listenHost = value.listenHost ?? '127.0.0.1';
  if (!Number.isInteger(listenPort) || listenPort < 0 || listenPort > 65535 ||
      !['127.0.0.1', '::1', '0.0.0.0', '::'].includes(listenHost)) throw new ConfigError('INVALID_LISTEN_CONFIG');
  return { ...value, publicOrigin: origin.origin, listenHost, listenPort };
}
