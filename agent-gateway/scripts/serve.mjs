import { readFileSync, statSync } from 'node:fs';
import { Gateway, GatewayError } from '../src/gateway.js';
import { ConfigError, loadRuntimeConfig } from '../src/runtime-config.js';
import { startHttpsApi } from '../src/https-api.js';

let gateway;
let server;
try {
  if (process.argv.length !== 3) throw new ConfigError('USAGE_SERVE_ABSOLUTE_CONFIG_PATH');
  const config = loadRuntimeConfig(process.argv[2]);
  if (!statSync(config.database).isFile()) throw new ConfigError('INITIALIZE_DATABASE_FIRST');
  gateway = new Gateway({ filename: config.database, quarantineDir: config.quarantineDirectory,
    allowedConnectorOrigins: config.allowedConnectorOrigins });
  if (!gateway.isInitialized()) throw new ConfigError('INITIALIZE_DATABASE_FIRST');
  ({ server } = await startHttpsApi(gateway, {
    cert: readFileSync(config.tlsCertificateFile), key: readFileSync(config.tlsPrivateKeyFile),
    publicOrigin: config.publicOrigin, host: config.listenHost, port: config.listenPort,
    oauth: config.oauth ? { clients: config.oauth.clients, secrets: JSON.parse(readFileSync(config.oauth.secretsFile, 'utf8')) } : undefined,
  }));
  process.stdout.write(JSON.stringify({ event: 'listening', url: config.publicOrigin,
    listenHost: config.listenHost, listenPort: server.address().port }) + '\n');
  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    const deadline = setTimeout(() => server.closeAllConnections(), 5000);
    deadline.unref();
    server.close(() => { clearTimeout(deadline); gateway.close(); });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch (error) {
  const code = error instanceof GatewayError || error instanceof ConfigError ? error.code : 'SERVER_START_FAILED';
  process.stderr.write(JSON.stringify({ error: code }) + '\n');
  if (server) server.close();
  gateway?.close();
  process.exitCode = 1;
}
