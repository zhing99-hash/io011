import { readClientConfig } from '../src/client-config.js';
import { prepareClientPackage, removeClientPackage } from '../src/client-package.js';

try {
  if (process.argv[2] === '--remove' && process.argv.length === 4) {
    removeClientPackage(process.argv[3]);
    process.stdout.write('已清理未被修改的客户端包文件；客户端配置及远端授权请按安装说明移除。\n');
  } else {
    if (process.argv.length !== 4) throw new Error('INVALID_ARGUMENTS');
    const result = prepareClientPackage(readClientConfig(process.argv[2]), process.argv[3]);
    process.stdout.write(JSON.stringify(result) + '\n');
  }
} catch (error) {
  const code = typeof error.code === 'string' ? error.code : /^[A-Z_]+$/.test(error.message) ? error.message : 'INVALID_CLIENT_PACKAGE';
  process.stderr.write('客户端包操作失败：' + code + '\n'); process.exitCode = 1;
}
