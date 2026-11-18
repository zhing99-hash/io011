import { readClientConfig } from '../src/client-config.js';
import { startStdioConnector } from '../src/client-stdio.js';
try {
  if (process.argv.length !== 3) throw new Error('INVALID_ARGUMENTS');
  startStdioConnector(readClientConfig(process.argv[2]));
} catch {
  process.stderr.write('无法启动企业连接器。请检查客户端配置、Node.js 版本和安装依赖。\n');
  process.exitCode = 1;
}
