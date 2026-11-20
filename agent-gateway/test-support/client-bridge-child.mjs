// Test-only dial mapping. Production has no TLS bypass or custom dial option.
import { readClientConfig } from '../src/client-config.js';
import { startStdioConnector } from '../src/client-stdio.js';
import { createSdkFetch } from './oauth-browser.js';

const port = Number(process.argv[3]);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('INVALID_TEST_PORT');
startStdioConnector(readClientConfig(process.argv[2]), { fetch: createSdkFetch({ address: () => ({ port }) }) });
