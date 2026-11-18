import { mkdirSync, readFileSync, writeFileSync, existsSync, realpathSync, lstatSync, unlinkSync, rmdirSync } from 'node:fs';
import { join, resolve, isAbsolute, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validateClientConfig } from './client-config.js';
import { addHarnessPatch } from './client-formats.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const hash = (value) => createHash('sha256').update(value).digest('hex');
const json = (value) => JSON.stringify(value, null, 2) + '\n';

/** A per-device development package; no changes to a user's live assistant settings. */
export function prepareClientPackage(value, directory) {
  const config = validateClientConfig(value);
  if (!isAbsolute(directory ?? '') || existsSync(directory)) throw new Error('CLIENT_PACKAGE_REQUIRES_NEW_ABSOLUTE_DIRECTORY');
  const destination = resolve(directory);
  const command = process.execPath;
  const args = ['--preserve-symlinks', '--preserve-symlinks-main', '--use-system-ca', join(root, 'scripts', 'client-bridge.mjs'), join(destination, 'client.json')];
  const server = { command, args };
  const files = {
    'client.json': json(config),
    'codex/plugin.json': json({ $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
      name: 'enterprise-gateway', version: '0.1.0', description: '企业平台身份、权限及文件审查查询。',
      extensions: { 'com.openai': { onboardingSkill: './skills/enterprise-gateway/SKILL.md',
        interface: { displayName: '企业连接网关', shortDescription: '登录企业平台并查询数据接入权限' } } } }),
    'codex/mcp.json': json({ $schema: 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',
      mcpServers: { enterprise_gateway: { type: 'stdio', ...server } } }),
    'codex/config.toml': '[mcp_servers.enterprise_gateway]\ncommand = ' + JSON.stringify(command) + '\nargs = ' + JSON.stringify(args) + '\nstartup_timeout_sec = 20\ntool_timeout_sec = ' + (Math.ceil(config.authorizationTimeoutMs / 1000) + 30) + '\n',
    'workbuddy/mcp.json': json({ mcpServers: { enterprise_gateway: server } }),
    // JSON is valid YAML; this is a plugin entry for an existing Harness profile.
    'deepseek-harness/mcp-entry.json': json({ id: 'mcp-enterprise-gateway', name: '@deepseek-ai/dsh-mcp-client',
      config: { serverName: 'enterprise_gateway', transport: 'stdio', ...server,
        startupTimeoutMs: 20000, toolCallTimeoutMs: config.authorizationTimeoutMs + 30000 } }),
    'deepseek-harness/connector.patch.yml': addHarnessPatch(null, server, config.authorizationTimeoutMs + 30000),
  };
  const skill = readFileSync(join(root, 'client', 'enterprise-gateway', 'SKILL.md'), 'utf8');
  for (const client of ['codex', 'workbuddy', 'deepseek-harness']) files[`${client}/skills/enterprise-gateway/SKILL.md`] = skill;
  files['INSTALL.md'] = `# 企业连接网关：本机开发接入包\n\n企业地址：${config.serverUrl}\n\n本目录不含密码或令牌。需要 Node.js 24 和当前项目已安装的依赖；文件中的绝对路径绑定本设备，请勿把此目录直接当作跨设备发行安装包。移动代码或配置后重新生成。\n\n- Codex：通过客户端支持的本地插件入口导入 codex 目录。也可把 codex/config.toml 中的服务器项合入现有项目配置；两种方式选择一种，避免重复注册。插件启动超时与工具超时的设置需要在当前客户端版本中核验，首次网页登录可使用配置片段中的工具超时。\n- WorkBuddy：在 MCP 设置中导入 workbuddy/mcp.json 的 enterprise_gateway 项；保留已有服务器。通过客户端技能入口导入 workbuddy/skills/enterprise-gateway。\n- DeepSeek Harness：将 deepseek-harness/connector.patch.yml 通过现有启动命令的 --patch 参数加载，或使用本项目引导安装器合入实际 profile 补丁。mcp-entry.json 只供条目参考，不是可直接覆盖 profile 的完整配置。技能通过该部署已启用的技能加载器加入。\n\n安装后先询问“检查企业网关连接”。首次工具调用打开企业网页登录，登录并确认后返回助手。若浏览器未打开，在客户端 MCP 日志中打开提示链接。启动探测和工具列表不会要求登录。令牌仅保存在连接器进程内，重启后重新授权。\n\n卸载：先在客户端移除此服务器及技能（Codex 插件可直接卸载），重启确认连接器退出；再用 prepare-client.mjs --remove 本目录清理生成文件。平台上的历史授权需要在平台撤销，删除本地文件不代表远端授权已撤销。\n\n本机配置生成和自动测试不等于三款助手实机验收。已提供 scripts/install-client.mjs 引导安装与计划/应用/恢复命令，可合入项目配置；WorkBuddy/Harness 技能仍需从其正式入口导入。独立运行时、系统凭证库、签名和升级仍待开发。\n`;
  mkdirSync(dirname(destination), { recursive: true });
  mkdirSync(destination, { recursive: false });
  const canonicalDirectory = realpathSync.native(destination);
  for (const [relative, data] of Object.entries(files)) {
    const path = join(destination, relative); mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, data, { flag: 'wx', mode: 0o600 });
  }
  writeFileSync(join(destination, 'package-receipt.json'), json({ version: 1, directory: canonicalDirectory,
    files: Object.entries(files).map(([path, data]) => ({ path, sha256: hash(data) })) }), { flag: 'wx', mode: 0o600 });
  return { directory: destination, files: Object.keys(files).length };
}

/** Refuse modified files and symlinks; never recursively delete an arbitrary path. */
export function removeClientPackage(directory) {
  if (!isAbsolute(directory ?? '') || lstatSync(directory).isSymbolicLink()) throw new Error('INVALID_CLIENT_PACKAGE');
  const destination = realpathSync.native(directory);
  const receiptPath = join(destination, 'package-receipt.json');
  if (lstatSync(receiptPath).isSymbolicLink()) throw new Error('INVALID_CLIENT_RECEIPT');
  const receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
  if (receipt.version !== 1 || receipt.directory !== destination || !Array.isArray(receipt.files) || receipt.files.length > 30) throw new Error('INVALID_CLIENT_RECEIPT');
  const paths = [];
  const directories = new Set();
  for (const item of receipt.files) {
    if (typeof item.path !== 'string' || !/^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(item.path) || item.path.split('/').some((part) => part === '.' || part === '..')) throw new Error('INVALID_CLIENT_RECEIPT');
    let parent = destination;
    for (const part of item.path.split('/').slice(0, -1)) {
      parent = join(parent, part);
      if (lstatSync(parent).isSymbolicLink()) throw new Error('INVALID_CLIENT_PACKAGE');
      directories.add(parent);
    }
    const path = join(destination, item.path);
    if (lstatSync(path).isSymbolicLink() || hash(readFileSync(path)) !== item.sha256) throw new Error('CLIENT_PACKAGE_MODIFIED');
    paths.push(path);
  }
  for (const path of paths) unlinkSync(path);
  unlinkSync(receiptPath);
  for (const path of [...directories].sort((a, b) => b.length - a.length)) {
    try { rmdirSync(path); } catch (error) { if (error.code !== 'ENOTEMPTY') throw error; }
  }
  try { rmdirSync(destination); } catch (error) { if (error.code !== 'ENOTEMPTY') throw error; }
}
