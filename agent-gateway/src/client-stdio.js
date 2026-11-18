import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { ClientBridge } from './client-bridge.js';

export function startStdioConnector(config, options) {
  const bridge = new ClientBridge(config, options);
  const handle = serveStdio(() => bridge.createServer(), { onerror: () => process.stderr.write('MCP 连接发生错误。\n') });
  let closing;
  const close = () => {
    closing ??= (async () => {
      process.stdin.removeListener('end', onEnd);
      process.removeListener('SIGINT', onEnd); process.removeListener('SIGTERM', onEnd);
      await bridge.close(); await handle.close();
    })();
    return closing;
  };
  const onEnd = () => { void close(); };
  process.stdin.once('end', onEnd);
  process.once('SIGINT', onEnd); process.once('SIGTERM', onEnd);
  return { close };
}
