import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { validateClientConfig } from './client-config.js';
import { addCodexServer, addWorkBuddyServer, addHarnessPatch } from './client-formats.js';
import { projectRoot, installPath, readInstallFile, replaceInstallFile, deleteInstallFile, withInstallLock, utf8, sha, json } from './install-files.js';

const runtime = fileURLToPath(new URL('../', import.meta.url));
const CLIENTS = ['codex', 'workbuddy', 'deepseek-harness'];
const PREFIX = '.enterprise-gateway';
const OWNER = json({ version: 1, application: 'enterprise-agent-gateway' });
const validId = (id) => typeof id === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(id);
const prefix = (client) => `${PREFIX}/${client}`;
const statePath = (client) => `${prefix(client)}/active.json`;
const history = (client, id) => `${prefix(client)}/history/${id}`;
const parse = (data) => JSON.parse(utf8(data));

export function validateInstallRequest(value) {
  if (!value || Array.isArray(value) || typeof value !== 'object' || Object.keys(value).some((key) => !['client', 'projectDir', 'connection', 'harnessPatchPath'].includes(key)) || !CLIENTS.includes(value.client)) throw new Error('INVALID_INSTALL_REQUEST');
  const root = projectRoot(value.projectDir);
  const request = { client: value.client, projectDir: root, connection: validateClientConfig(value.connection) };
  if (value.client === 'deepseek-harness') {
    request.harnessPatchPath = value.harnessPatchPath ?? 'cordis.patch.yml';
    installPath(root, request.harnessPatchPath);
    if (request.harnessPatchPath.startsWith(PREFIX + '/') || !/\.(yml|yaml)$/.test(request.harnessPatchPath)) throw new Error('INVALID_HARNESS_PATCH_PATH');
  } else if (value.harnessPatchPath !== undefined) throw new Error('INVALID_INSTALL_REQUEST');
  return request;
}

function checkOwner(root) {
  const owner = readInstallFile(root, `${PREFIX}/owner.json`, 4096);
  if (owner.data === null && existsSync(join(root, PREFIX))) throw new Error('RESERVED_DIRECTORY_CONFLICT');
  if (owner.data !== null && utf8(owner.data) !== OWNER) throw new Error('RESERVED_DIRECTORY_CONFLICT');
  const ignore = readInstallFile(root, `${PREFIX}/.gitignore`, 4096);
  if (owner.data !== null && ignore.data !== null && utf8(ignore.data) !== '*\n') throw new Error('INSTALL_METADATA_CHANGED');
}

function loadJournal(root, client) {
  if (!CLIENTS.includes(client)) throw new Error('INVALID_CLIENT');
  checkOwner(root);
  const pointer = readInstallFile(root, statePath(client), 4096);
  if (pointer.data === null) return undefined;
  const active = parse(pointer.data);
  if (!validId(active.id)) throw new Error('INVALID_INSTALL_JOURNAL');
  const path = `${history(client, active.id)}/journal.json`;
  const file = readInstallFile(root, path);
  const journal = parse(file.data);
  if (journal.version !== 1 || journal.id !== active.id || journal.request?.client !== client || journal.request?.projectDir !== root || !Array.isArray(journal.files) || journal.files.length > 5) throw new Error('INVALID_INSTALL_JOURNAL');
  const request = validateInstallRequest(journal.request);
  const allowed = new Set([`${prefix(client)}/connection.json`, client === 'codex' ? '.codex/config.toml' : client === 'workbuddy' ? '.workbuddy/mcp.json' : request.harnessPatchPath,
    client === 'codex' ? '.agents/skills/enterprise-gateway/SKILL.md' : `${prefix(client)}/skill/SKILL.md`]);
  if (journal.files.length !== 3 || new Set(journal.files.map((item) => item.path)).size !== 3 || journal.files.some((item) => !allowed.has(item.path) || !/^[a-f0-9]{64}$/.test(item.after) || (item.before !== null && !/^[a-f0-9]{64}$/.test(item.before)) || !Number.isInteger(item.mode) || item.mode < 0 || item.mode > 0o777 ||
    (item.windowsSecurity !== null && (typeof item.windowsSecurity !== 'string' || item.windowsSecurity.length > 16384 || !/^[A-Za-z0-9+/]+={0,2}$/.test(item.windowsSecurity))) ||
    (process.platform === 'win32' && item.before !== null && !item.windowsSecurity))) throw new Error('INVALID_INSTALL_JOURNAL');
  return { journal, path, hash: file.hash };
}

function buildPlan(value, id) {
  if (!validId(id)) throw new Error('INVALID_INSTALL_PLAN');
  const request = validateInstallRequest(value);
  const root = request.projectDir, client = request.client;
  const previous = loadJournal(root, client);
  if (previous && !['removed', 'rolled_back'].includes(previous.journal.phase)) throw new Error('INSTALL_ALREADY_PRESENT');
  const configPath = `${prefix(client)}/connection.json`;
  const args = ['--preserve-symlinks', '--preserve-symlinks-main', '--use-system-ca', join(runtime, 'scripts', 'client-bridge.mjs'), installPath(root, configPath)];
  const server = { command: process.execPath, args };
  const writes = [];
  const add = (path, data, mustBeNew = false, snapshot) => {
    const before = snapshot ?? readInstallFile(root, path);
    if (mustBeNew && before.data !== null) throw new Error('CLIENT_FILE_CONFLICT');
    writes.push({ path, data: Buffer.from(data), before });
  };
  add(configPath, json(request.connection), true);
  const timeout = request.connection.authorizationTimeoutMs + 30000;
  const target = client === 'codex' ? '.codex/config.toml' : client === 'workbuddy' ? '.workbuddy/mcp.json' : request.harnessPatchPath;
  const oldFile = readInstallFile(root, target);
  const old = utf8(oldFile.data);
  add(target, client === 'codex' ? addCodexServer(old, server, Math.ceil(timeout / 1000)) : client === 'workbuddy' ? addWorkBuddyServer(old, server) : addHarnessPatch(old, server, timeout), false, oldFile);
  add(client === 'codex' ? '.agents/skills/enterprise-gateway/SKILL.md' : `${prefix(client)}/skill/SKILL.md`,
    readFileSync(join(runtime, 'client', 'enterprise-gateway', 'SKILL.md')), true);
  const runtimeFiles = ['scripts/client-bridge.mjs', 'src/client-stdio.js', 'src/client-bridge.js', 'src/client-config.js', 'src/oauth-callback.js', 'src/mcp-tools.js'];
  const plan = { version: 1, id, request, runtimeHash: sha(json(runtimeFiles.map((path) => [path, sha(readFileSync(join(runtime, path)))]))),
    metadataDirectory: PREFIX,
    changes: writes.map((item) => ({ path: item.path, operation: item.before.data === null ? 'create' : 'update', before: item.before.hash, after: sha(item.data) })),
    notes: ['请先关闭目标客户端，避免它在安装期间回写配置。', '依赖当前设备的 Node.js 24 和本项目路径；还不是独立发行运行时。',
      ...(client === 'codex' ? ['安装项目 MCP 和项目 Skill，不会安装第二份 portable 插件。'] : ['MCP 配置可自动合入；Skill 还需通过该客户端正式入口导入。']),
      ...(client === 'deepseek-harness' ? ['请选择正在使用的 profile 目录或实际 --patch 所引用的补丁文件。安装器不启动 Harness，也不执行 !!js。'] : [])] };
  return { plan, writes };
}

export function planClientInstall(request) { return buildPlan(request, randomUUID()).plan; }

function putJournal(root, loaded, phase) {
  loaded.journal.phase = phase;
  replaceInstallFile(root, loaded.path, json(loaded.journal), loaded.hash);
  loaded.hash = readInstallFile(root, loaded.path).hash;
}

function rollback(root, loaded, phase) {
  const files = loaded.journal.files;
  const snapshots = files.map((item, index) => ({ item, index, current: readInstallFile(root, item.path),
    backup: item.before === null ? null : readInstallFile(root, `${history(loaded.journal.request.client, loaded.journal.id)}/backup-${index}.bin`) }));
  // Validate every restore source and destination before touching any client file.
  for (const { item, current, backup } of snapshots) {
    if (current.hash !== item.before && current.hash !== item.after) throw new Error('INSTALLED_FILE_MODIFIED');
    if (item.before !== null && backup.hash !== item.before) throw new Error('INSTALL_BACKUP_MODIFIED');
  }
  putJournal(root, loaded, 'removing');
  for (const { item, index, current, backup } of snapshots.reverse()) {
    if (current.hash === item.before) continue;
    if (item.before === null) deleteInstallFile(root, item.path, item.after);
    else replaceInstallFile(root, item.path, backup.data, item.after, { mode: item.mode, securityDescriptor: item.windowsSecurity });
  }
  putJournal(root, loaded, phase);
}

/** Apply only the exact reviewed plan, with a durable rollback journal. */
export function applyClientInstall(plan, { beforeWrite } = {}) {
  const request = validateInstallRequest(plan?.request);
  const root = request.projectDir;
  return withInstallLock(root, () => {
    const built = buildPlan(request, plan.id);
    if (!isDeepStrictEqual(built.plan, plan)) throw new Error('INSTALL_PLAN_CHANGED');
    const owner = readInstallFile(root, `${PREFIX}/owner.json`, 4096);
    if (owner.data === null) replaceInstallFile(root, `${PREFIX}/owner.json`, OWNER, null);
    // Ignore backups in Git before writing any saved configuration content.
    if (readInstallFile(root, `${PREFIX}/.gitignore`, 4096).data === null) replaceInstallFile(root, `${PREFIX}/.gitignore`, '*\n', null);
    const journalPath = `${history(request.client, plan.id)}/journal.json`;
    if (readInstallFile(root, journalPath).data !== null) throw new Error('INSTALL_ID_REUSED');
    const security = [];
    for (let index = 0; index < built.writes.length; index++) {
      const item = built.writes[index];
      security[index] = item.before.data === null ? null : replaceInstallFile(root, `${history(request.client, plan.id)}/backup-${index}.bin`, item.before.data, null,
        { mode: item.before.mode, securitySource: installPath(root, item.path) }).securityDescriptor;
    }
    const journal = { version: 1, id: plan.id, request, phase: 'applying', files: built.writes.map((item, index) => ({ path: item.path, before: item.before.hash, after: sha(item.data), mode: item.before.mode, windowsSecurity: security[index] })) };
    replaceInstallFile(root, journalPath, json(journal), null);
    const pointer = readInstallFile(root, statePath(request.client), 4096);
    replaceInstallFile(root, statePath(request.client), json({ id: plan.id }), pointer.hash);
    const loaded = { journal, path: journalPath, hash: readInstallFile(root, journalPath).hash };
    try {
      for (let index = 0; index < built.writes.length; index++) {
        const item = built.writes[index];
        beforeWrite?.(index, item.path);
        replaceInstallFile(root, item.path, item.data, item.before.hash, { mode: item.before.mode,
          securityDescriptor: journal.files[index].windowsSecurity });
      }
      putJournal(root, loaded, 'installed');
    } catch {
      try { rollback(root, loaded, 'rolled_back'); }
      catch { putJournal(root, loaded, 'recovery_required'); throw new Error('INSTALL_RECOVERY_REQUIRED'); }
      throw new Error('INSTALL_FAILED_ROLLED_BACK');
    }
    return { client: request.client, projectDir: root, id: plan.id, phase: 'installed' };
  });
}

export function clientInstallStatus(projectDir, client) {
  const root = projectRoot(projectDir);
  const loaded = loadJournal(root, client);
  if (!loaded) return { client, projectDir: root, phase: 'not_installed' };
  const { journal } = loaded;
  return { client, projectDir: root, id: journal.id, phase: journal.phase,
    files: journal.files.map((item) => { const current = readInstallFile(root, item.path).hash;
      return { path: item.path, state: current === item.after ? 'installed' : current === item.before ? 'original' : 'modified' }; }) };
}

export function removeClientInstall(projectDir, client, { recover = false } = {}) {
  const root = projectRoot(projectDir);
  return withInstallLock(root, () => {
    const loaded = loadJournal(root, client);
    if (!loaded || ['removed', 'rolled_back'].includes(loaded.journal.phase)) return { client, projectDir: root, phase: 'removed' };
    if (recover && loaded.journal.phase === 'installed') throw new Error('RECOVERY_NOT_NEEDED');
    if (!recover && loaded.journal.phase !== 'installed') throw new Error('INSTALL_RECOVERY_REQUIRED');
    rollback(root, loaded, recover ? 'rolled_back' : 'removed');
    return { client, projectDir: root, phase: recover ? 'rolled_back' : 'removed' };
  });
}
