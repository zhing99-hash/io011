import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync, execFileSync } from 'node:child_process';
import { parse as parseToml } from 'smol-toml';
import { parseDocument } from 'yaml';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { planClientInstall, applyClientInstall, clientInstallStatus, removeClientInstall } from '../src/client-installer.js';
import { addCodexServer, addWorkBuddyServer, addHarnessPatch } from '../src/client-formats.js';
import { withInstallLock } from '../src/install-files.js';

const connection = { serverUrl: 'https://gateway.example.com/mcp', clientId: 'enterprise-desktop' };
const marker = 'private-existing-setting-keep-this-value';
const originals = {
  codex: '# keep comment\nmodel="existing-model"\nprivate_value="' + marker + '"\n[mcp_servers.other]\ncommand="existing-command"\n',
  workbuddy: '{"private":"' + marker + '","big":9007199254740993,"mcpServers":{"other":{"command":"existing-command"}}}\n',
  'deepseek-harness': '# keep comment\n- target: other\n  config:\n    private: ' + marker + '\n    big: 9007199254740993\n    expression: !!js (globalThis.installerExecuted = true)\n',
};
const targets = { codex: '.codex/config.toml', workbuddy: '.workbuddy/mcp.json', 'deepseek-harness': 'cordis.patch.yml' };
const root = fileURLToPath(new URL('../', import.meta.url));
const flags = ['--preserve-symlinks', '--preserve-symlinks-main'];

function fixture(client = 'workbuddy', { empty = false } = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'gateway-install-'));
  const project = join(directory, 'client project with spaces'); mkdirSync(project);
  const target = join(project, ...targets[client].split('/'));
  mkdirSync(join(target, '..'), { recursive: true });
  if (!empty) writeFileSync(target, originals[client]);
  return { directory, project, target, request: { client, projectDir: project, connection },
    close: () => rmSync(directory, { recursive: true, force: true }) };
}

for (const client of ['codex', 'workbuddy', 'deepseek-harness']) test(`${client} install preserves existing settings, discovers real stdio tools and restores original bytes`, async () => {
  const c = fixture(client); let mcp;
  try {
    const plan = planClientInstall(c.request);
    assert.equal(JSON.stringify(plan).includes(marker), false);
    assert.equal(existsSync(join(c.project, '.enterprise-gateway')), false, 'planning does not mutate the project');
    assert.equal(readFileSync(c.target, 'utf8'), originals[client]);
    assert.equal(applyClientInstall(plan).phase, 'installed');
    assert.equal(clientInstallStatus(c.project, client).files.every((file) => file.state === 'installed'), true);
    assert.throws(() => applyClientInstall(plan), /INSTALL_ALREADY_PRESENT/);
    const text = readFileSync(c.target, 'utf8');
    assert.ok(text.includes(marker));
    let server;
    if (client === 'codex') { assert.ok(text.startsWith(originals[client])); server = parseToml(text).mcp_servers.enterprise_gateway; }
    else if (client === 'workbuddy') { assert.ok(text.includes('9007199254740993')); server = JSON.parse(text).mcpServers.enterprise_gateway; }
    else {
      assert.ok(text.includes('9007199254740993'));
      assert.ok(text.includes('!!js (globalThis.installerExecuted = true)'));
      assert.equal(globalThis.installerExecuted, undefined);
      const doc = parseDocument(text);
      server = doc.getIn([1, 'insert', 0, 'config']).toJSON();
    }
    mcp = new Client({ name: 'installed-connector-check', version: '1' });
    await mcp.connect(new StdioClientTransport({ command: server.command, args: server.args, stderr: 'pipe' }));
    assert.equal((await mcp.listTools()).tools.length, 4);
    await mcp.close(); mcp = undefined;
    assert.equal(removeClientInstall(c.project, client).phase, 'removed');
    assert.equal(readFileSync(c.target, 'utf8'), originals[client]);
    assert.equal(clientInstallStatus(c.project, client).files.every((file) => file.state === 'original'), true);
    assert.equal(existsSync(join(c.project, '.enterprise-gateway', client, 'connection.json')), false);
    assert.equal(readFileSync(join(c.project, '.enterprise-gateway', '.gitignore'), 'utf8'), '*\n');
    const next = planClientInstall(c.request);
    assert.notEqual(next.id, plan.id);
    assert.equal(applyClientInstall(next).phase, 'installed');
    removeClientInstall(c.project, client);
  } finally { await mcp?.close(); c.close(); }
});

test('stale and modified plans cannot overwrite changed settings or add arbitrary paths', () => {
  const c = fixture();
  try {
    const plan = planClientInstall(c.request);
    const altered = structuredClone(plan); altered.changes[0].path = '../outside.json';
    assert.throws(() => applyClientInstall(altered), /PLAN_CHANGED/);
    writeFileSync(c.target, '{"newUserSetting":true}\n');
    assert.throws(() => applyClientInstall(plan), /PLAN_CHANGED/);
    assert.equal(readFileSync(c.target, 'utf8'), '{"newUserSetting":true}\n');
    assert.equal(existsSync(join(c.project, '.enterprise-gateway')), false);
    assert.equal(existsSync(join(c.project, '.enterprise-gateway.install.lock')), false);
  } finally { c.close(); }
});

test('formats reject conflicting names, duplicate keys, malformed data and unsupported alias patches without evaluation', () => {
  const server = { command: 'node', args: [] };
  assert.throws(() => addWorkBuddyServer('{"mcpServers":{},"mcpServers":{}}', server), /DUPLICATE/);
  assert.throws(() => addWorkBuddyServer('{"mcpServers":{"enterprise_gateway":{}}}', server), /CONFLICT/);
  assert.throws(() => addWorkBuddyServer('{"mcpServers":{', server), /JSON/);
  assert.throws(() => addCodexServer('[mcp_servers.enterprise_gateway]\ncommand="other"', server, 210), /CONFLICT/);
  assert.throws(() => addCodexServer('a=[1 #', server, 210), /TOML/);
  assert.throws(() => addCodexServer('mcp_servers={other={command="existing"}}', server, 210), /LAYOUT/);
  assert.throws(() => addHarnessPatch('target: wrong-root\n', server, 210000), /HARNESS_PATCH/);
  assert.throws(() => addHarnessPatch('- &anchor {target: other}\n- *anchor\n', server, 210000), /ALIAS/);
  assert.throws(() => addHarnessPatch('- insert: [{id: mcp-enterprise-gateway}]\n', server, 210000), /CONFLICT/);
  assert.ok(addHarnessPatch('# empty user patch\n', server, 210000).includes('empty user patch'));
});

test('unknown reserved directories and linked client configuration directories are refused', () => {
  const c = fixture();
  try {
    mkdirSync(join(c.project, '.enterprise-gateway'));
    writeFileSync(join(c.project, '.enterprise-gateway', 'user.txt'), 'keep');
    assert.throws(() => planClientInstall(c.request), /RESERVED_DIRECTORY/);
    assert.equal(readFileSync(join(c.project, '.enterprise-gateway', 'user.txt'), 'utf8'), 'keep');
    const other = join(c.directory, 'linked-project'); mkdirSync(other);
    symlinkSync(join(c.project, '.workbuddy'), join(other, '.workbuddy'), process.platform === 'win32' ? 'junction' : 'dir');
    assert.throws(() => planClientInstall({ ...c.request, projectDir: other }), /UNSAFE_INSTALL_PATH/);
    assert.equal(readFileSync(c.target, 'utf8'), originals.workbuddy);
  } finally { c.close(); }
});

test('a mid-install write failure automatically rolls back every applied client change', () => {
  const c = fixture();
  try {
    assert.throws(() => applyClientInstall(planClientInstall(c.request), { beforeWrite: (index) => { if (index === 2) throw new Error('SIMULATED_FAILURE'); } }), /FAILED_ROLLED_BACK/);
    assert.equal(readFileSync(c.target, 'utf8'), originals.workbuddy);
    assert.equal(clientInstallStatus(c.project, 'workbuddy').phase, 'rolled_back');
    assert.equal(existsSync(join(c.project, '.enterprise-gateway', 'workbuddy', 'connection.json')), false);
  } finally { c.close(); }
});

test('uninstall refuses concurrent user edits and never drops a newly added configuration field', () => {
  const c = fixture();
  try {
    applyClientInstall(planClientInstall(c.request));
    const installed = readFileSync(c.target, 'utf8');
    const edited = JSON.parse(installed); edited.newUserSetting = 'must survive'; writeFileSync(c.target, JSON.stringify(edited));
    assert.equal(clientInstallStatus(c.project, 'workbuddy').files.find((item) => item.path === targets.workbuddy).state, 'modified');
    assert.throws(() => removeClientInstall(c.project, 'workbuddy'), /INSTALLED_FILE_MODIFIED/);
    assert.equal(JSON.parse(readFileSync(c.target)).newUserSetting, 'must survive');
    assert.equal(existsSync(join(c.project, '.enterprise-gateway', 'workbuddy', 'connection.json')), true);
    writeFileSync(c.target, installed); removeClientInstall(c.project, 'workbuddy');
  } finally { c.close(); }
});

test('crashed process leaves a durable journal; recovery clears its dead lock and restores original files', () => {
  const c = fixture();
  try {
    const requestFile = join(c.directory, 'request.json'); writeFileSync(requestFile, JSON.stringify(c.request));
    const child = spawnSync(process.execPath, [...flags, join(root, 'test-support', 'install-crash.mjs'), requestFile], { encoding: 'utf8', timeout: 30000 });
    assert.equal(child.status, 77, child.stderr);
    assert.equal(clientInstallStatus(c.project, 'workbuddy').phase, 'applying');
    assert.equal(removeClientInstall(c.project, 'workbuddy', { recover: true }).phase, 'rolled_back');
    assert.equal(readFileSync(c.target, 'utf8'), originals.workbuddy);
    assert.equal(existsSync(join(c.project, '.enterprise-gateway.install.lock')), false);
  } finally { c.close(); }
});

test('recovery preserves unexpected edits and validates all backup hashes before restoring anything', () => {
  const c = fixture();
  try {
    let installed;
    assert.throws(() => applyClientInstall(planClientInstall(c.request), { beforeWrite: (index) => {
      if (index === 2) { installed = readFileSync(c.target, 'utf8'); writeFileSync(c.target, '{"concurrentUserEdit":true}'); throw new Error('SIMULATED_FAILURE'); }
    } }), /RECOVERY_REQUIRED/);
    assert.throws(() => removeClientInstall(c.project, 'workbuddy', { recover: true }), /INSTALLED_FILE_MODIFIED/);
    assert.equal(readFileSync(c.target, 'utf8'), '{"concurrentUserEdit":true}');
    writeFileSync(c.target, installed);
    const status = clientInstallStatus(c.project, 'workbuddy');
    const backup = join(c.project, '.enterprise-gateway', 'workbuddy', 'history', status.id, 'backup-1.bin');
    const saved = readFileSync(backup); writeFileSync(backup, 'tampered');
    assert.throws(() => removeClientInstall(c.project, 'workbuddy', { recover: true }), /BACKUP_MODIFIED/);
    assert.equal(existsSync(join(c.project, '.enterprise-gateway', 'workbuddy', 'connection.json')), true);
    writeFileSync(backup, saved); removeClientInstall(c.project, 'workbuddy', { recover: true });
    assert.equal(readFileSync(c.target, 'utf8'), originals.workbuddy);
  } finally { c.close(); }
});

test('CLI plans and applies to an explicit project, prints no existing credentials, and removes only owned files', () => {
  const c = fixture('codex', { empty: true });
  try {
    const request = join(c.directory, 'request.json'), plan = join(c.directory, 'review plan.json');
    writeFileSync(request, JSON.stringify(c.request));
    const run = (args) => spawnSync(process.execPath, [...flags, join(root, 'scripts', 'install-client.mjs'), ...args], { encoding: 'utf8', timeout: 30000 });
    const preview = run(['plan', request, plan]); assert.equal(preview.status, 0, preview.stderr);
    assert.equal(existsSync(c.target), false);
    const install = run(['apply', plan]); assert.equal(install.status, 0, install.stderr);
    const status = run(['status', 'codex', c.project]); assert.equal(JSON.parse(status.stdout).phase, 'installed');
    writeFileSync(join(c.project, 'user-file.txt'), marker);
    const remove = run(['remove', 'codex', c.project]); assert.equal(remove.status, 0, remove.stderr);
    assert.equal(existsSync(c.target), false);
    assert.equal(readFileSync(join(c.project, 'user-file.txt'), 'utf8'), marker);
    assert.equal([preview, install, status, remove].some((result) => result.stdout.includes(marker) || result.stderr.includes(marker)), false);
  } finally { c.close(); }
});

test('an active installer lock prevents another operation without changing client files', () => {
  const c = fixture();
  try {
    const plan = planClientInstall(c.request);
    withInstallLock(c.project, () => assert.throws(() => applyClientInstall(plan), /INSTALL_BUSY/));
    assert.equal(readFileSync(c.target, 'utf8'), originals.workbuddy);
    assert.equal(existsSync(join(c.project, '.enterprise-gateway')), false);
  } finally { c.close(); }
});

test('Windows installation and rollback preserve a protected original ACL and protect saved credentials', { skip: process.platform !== 'win32' }, () => {
  const c = fixture();
  const security = (file, protect = false) => {
    const script = "$ErrorActionPreference='Stop'; $taskAcl=[System.IO.File]::GetAccessControl($env:AGENT_GATEWAY_ACL_FILE); if($env:AGENT_GATEWAY_ACL_TEST_PROTECT -eq '1'){$taskAcl.SetAccessRuleProtection($true,$true);[System.IO.File]::SetAccessControl($env:AGENT_GATEWAY_ACL_FILE,$taskAcl)}; $taskCheck=[System.IO.File]::GetAccessControl($env:AGENT_GATEWAY_ACL_FILE); [Console]::Out.Write($taskCheck.GetSecurityDescriptorSddlForm([System.Security.AccessControl.AccessControlSections]::Access -bor [System.Security.AccessControl.AccessControlSections]::Owner -bor [System.Security.AccessControl.AccessControlSections]::Group))";
    return execFileSync(join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], { encoding: 'utf8', windowsHide: true, timeout: 10000,
        env: { ...process.env, AGENT_GATEWAY_ACL_FILE: file, AGENT_GATEWAY_ACL_TEST_PROTECT: protect ? '1' : '0' } });
  };
  try {
    const originalAcl = security(c.target, true);
    assert.match(originalAcl, /D:P/);
    const applied = applyClientInstall(planClientInstall(c.request));
    assert.equal(security(c.target), originalAcl);
    assert.match(security(join(c.project, '.enterprise-gateway', 'workbuddy', 'history', applied.id, 'backup-1.bin')), /D:P/);
    removeClientInstall(c.project, 'workbuddy');
    assert.equal(security(c.target), originalAcl);
    assert.equal(readFileSync(c.target, 'utf8'), originals.workbuddy);
  } finally { c.close(); }
});
