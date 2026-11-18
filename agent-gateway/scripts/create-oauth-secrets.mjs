import { randomBytes, generateKeyPairSync } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute } from 'node:path';

try {
  const path = process.argv[2];
  if (process.argv.length !== 3 || !path || !isAbsolute(path)) throw new Error('INVALID_PATH');
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const signingKey = { ...privateKey.export({ format: 'jwk' }), kid: randomBytes(12).toString('hex'), alg: 'RS256', use: 'sig' };
  const value = { jwks: { keys: [signingKey] }, cookieKeys: [randomBytes(32).toString('hex'), randomBytes(32).toString('hex')], storageKey: randomBytes(32).toString('hex') };
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  writeFileSync(path, JSON.stringify(value, null, 2), { flag: 'wx', mode: 0o600 });
  process.stdout.write(JSON.stringify({ event: 'oauth-secrets-created' }) + '\n');
} catch {
  process.stderr.write(JSON.stringify({ error: 'OAUTH_SECRETS_CREATE_FAILED' }) + '\n');
  process.exitCode = 1;
}
