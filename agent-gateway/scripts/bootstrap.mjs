import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { Gateway, GatewayError } from '../src/gateway.js';
import { ConfigError, loadRuntimeConfig } from '../src/runtime-config.js';

let gateway;
try {
  if (process.argv.length !== 3 || process.stdin.isTTY) throw new ConfigError('USAGE_BOOTSTRAP_CONFIG_AND_JSON_STDIN');
  const config = loadRuntimeConfig(process.argv[2]);
  const chunks = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    size += chunk.length;
    if (size > 16 * 1024) throw new ConfigError('BOOTSTRAP_INPUT_TOO_LARGE');
    chunks.push(chunk);
  }
  const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if (!input || Array.isArray(input) || Object.keys(input).some((key) => !['username', 'password'].includes(key))) throw new ConfigError('INVALID_BOOTSTRAP_INPUT');
  mkdirSync(dirname(config.database), { recursive: true, mode: 0o700 });
  gateway = new Gateway({ filename: config.database });
  const admin = gateway.bootstrapAdmin(input);
  process.stdout.write(JSON.stringify({ event: 'initialized', user: admin }) + '\n');
} catch (error) {
  const code = error instanceof GatewayError || error instanceof ConfigError ? error.code : 'BOOTSTRAP_FAILED';
  process.stderr.write(JSON.stringify({ error: code }) + '\n');
  process.exitCode = 1;
} finally { gateway?.close(); }
