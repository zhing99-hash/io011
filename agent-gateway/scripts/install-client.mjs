import { readFileSync, writeFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { readClientConfig } from '../src/client-config.js';
import { planClientInstall, applyClientInstall, clientInstallStatus, removeClientInstall } from '../src/client-installer.js';

function readJson(path) {
  if (!isAbsolute(path ?? '')) throw new Error('ABSOLUTE_FILE_PATH_REQUIRED');
  const bytes = readFileSync(path);
  if (bytes.length > 32768) throw new Error('INSTALL_INPUT_TOO_LARGE');
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}
function showPlan(plan) {
  process.stdout.write(`客户端：${plan.request.client}\n项目：${plan.request.projectDir}\n企业地址：${plan.request.connection.serverUrl}\n`);
  for (const change of plan.changes) process.stdout.write(`${change.operation === 'create' ? '新增' : '合入'}：${change.path}\n`);
  for (const note of plan.notes) process.stdout.write(note + '\n');
}

try {
  const [command, first, second] = process.argv.slice(2);
  if (command === 'setup' && process.argv.length === 4) {
    if (!process.stdin.isTTY) throw new Error('SETUP_REQUIRES_INTERACTIVE_TERMINAL');
    const connection = readClientConfig(first);
    const terminal = createInterface({ input: process.stdin, output: process.stdout });
    try {
      const choice = await terminal.question('选择助手：1 Codex，2 WorkBuddy，3 DeepSeek Harness：');
      const client = ['codex', 'workbuddy', 'deepseek-harness'][Number(choice.trim()) - 1];
      const projectDir = (await terminal.question(client === 'deepseek-harness' ? '正在使用的 Harness profile 目录（绝对路径）：' : '使用助手的项目目录（绝对路径）：')).trim();
      const plan = planClientInstall({ client, projectDir, connection });
      showPlan(plan);
      if ((await terminal.question('确认安装以上内容？输入“安装”继续，其他输入退出：')).trim() !== '安装') process.stdout.write('已退出，没有修改客户端配置。\n');
      else process.stdout.write(JSON.stringify(applyClientInstall(plan)) + '\n');
    } finally { terminal.close(); }
  } else if (command === 'plan' && process.argv.length === 5) {
    if (!isAbsolute(second ?? '')) throw new Error('ABSOLUTE_FILE_PATH_REQUIRED');
    const plan = planClientInstall(readJson(first));
    writeFileSync(second, JSON.stringify(plan, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    showPlan(plan); process.stdout.write('安装计划已保存，可检查后用 apply 执行。\n');
  } else if (command === 'apply' && process.argv.length === 4) process.stdout.write(JSON.stringify(applyClientInstall(readJson(first))) + '\n');
  else if (['status', 'remove', 'recover'].includes(command) && process.argv.length === 5) {
    const result = command === 'status' ? clientInstallStatus(second, first) : removeClientInstall(second, first, { recover: command === 'recover' });
    process.stdout.write(JSON.stringify(result) + '\n');
  } else throw new Error('INVALID_INSTALL_COMMAND');
} catch (error) {
  const code = /^[A-Z_]+$/.test(error.message) ? error.message : typeof error.code === 'string' ? error.code : 'CLIENT_INSTALL_ERROR';
  process.stderr.write('安装操作失败：' + code + '\n'); process.exitCode = 1;
}
