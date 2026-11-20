import { createServer } from 'node:http';
import { createApiHandler } from './http-handler.js';

/** Loopback-only plaintext fixture. The pilot entry point uses HTTPS. */
export async function startDevApi(gateway, { port = 0, ...options } = {}) {
  const server = createServer(createApiHandler(gateway, {
    ...options,
    expectedAuthority: () => `127.0.0.1:${server.address()?.port}`,
    allowedOrigin: () => `http://127.0.0.1:${server.address()?.port}`,
  }));
  await new Promise((resolve, reject) => {
    server.once('error', reject); server.listen(port, '127.0.0.1', resolve);
  });
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}
