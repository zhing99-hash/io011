import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, existsSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { prepareClientPackage, removeClientPackage } from '../src/client-package.js';
import { validateClientConfig, readClientConfig } from '../src/client-config.js';

const config = { serverUrl: 'https://gateway.example.com/mcp', clientId: 'enterprise-desktop' };

test('client config accepts no credential fields and requires an unambiguous HTTPS endpoint', () => {
  assert.equal(validateClientConfig(config).openBrowser, true);
  for (const value of [{ ...config, token: 'secret' }, { ...config, clientSecret: 'secret' },
    { ...config, serverUrl: 'http://gateway.example.com/mcp' }, { ...config, serverUrl: 'https://user:pass@gateway.example.com/mcp' },
    { ...config, serverUrl: 'https://gateway.example.com/mcp?token=secret' }, { ...config, serverUrl: 'https://gateway.example.com/mcp#' },
    { ...config, serverUrl: 'https://gateway.example.com/other' }, { ...config, authorizationTimeoutMs: 900000 },
    { ...config, openBrowser: 'true' }, { ...config, clientId: 'space id' }]) assert.throws(() => validateClientConfig(value));
  assert.throws(() => readClientConfig('relative.json'), /ABSOLUTE_PATH/);
});

test('generated adapters launch a real stdio child without browser login or credentials; cleanup preserves extra files', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'gateway-client-package-'));
  const destination = join(dir, 'new-parent', 'client package with spaces');
  let client;
  try {
    const result = prepareClientPackage(config, destination);
    assert.equal(result.directory, destination);
    assert.throws(() => prepareClientPackage(config, destination), /NEW_ABSOLUTE_DIRECTORY/);
    const adapter = JSON.parse(readFileSync(join(destination, 'workbuddy', 'mcp.json'))).mcpServers.enterprise_gateway;
    const dsh = JSON.parse(readFileSync(join(destination, 'deepseek-harness', 'mcp-entry.json')));
    const codex = JSON.parse(readFileSync(join(destination, 'codex', 'mcp.json'))).mcpServers.enterprise_gateway;
    assert.deepEqual(dsh.config.args, adapter.args);
    assert.deepEqual(codex.args, adapter.args);
    assert.equal(readClientConfig(join(destination, 'client.json')).serverUrl, config.serverUrl);
    assert.equal(Object.keys(adapter).includes('env'), false);
    let stderr = '';
    const transport = new StdioClientTransport({ ...adapter, stderr: 'pipe' });
    transport.stderr.on('data', (part) => { stderr += part; });
    client = new Client({ name: 'package-test', version: '1' });
    await client.connect(transport);
    assert.equal((await client.listTools()).tools.length, 4);
    assert.equal(stderr.includes('请在企业网页'), false);
    await client.close(); client = undefined;
    writeFileSync(join(destination, 'keep.txt'), 'user file');
    mkdirSync(join(destination, 'workbuddy', 'keep-folder'));
    writeFileSync(join(destination, 'workbuddy', 'keep-folder', 'note.txt'), 'user file');
    removeClientPackage(destination);
    assert.equal(readFileSync(join(destination, 'keep.txt'), 'utf8'), 'user file');
    assert.equal(readFileSync(join(destination, 'workbuddy', 'keep-folder', 'note.txt'), 'utf8'), 'user file');
    assert.equal(existsSync(join(destination, 'client.json')), false);
  } finally { await client?.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('cleanup refuses modified files and traversal receipts before deleting any generated file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'gateway-client-cleanup-'));
  const destination = join(dir, 'package');
  try {
    prepareClientPackage(config, destination);
    const file = join(destination, 'client.json'); const original = readFileSync(file);
    writeFileSync(file, '{}');
    assert.throws(() => removeClientPackage(destination), /MODIFIED/);
    assert.equal(existsSync(join(destination, 'codex', 'plugin.json')), true);
    writeFileSync(file, original);
    const receiptFile = join(destination, 'package-receipt.json');
    const receipt = JSON.parse(readFileSync(receiptFile)); receipt.files.push({ path: '../outside', sha256: 'irrelevant' });
    writeFileSync(receiptFile, JSON.stringify(receipt));
    assert.throws(() => removeClientPackage(destination), /RECEIPT/);
    assert.equal(existsSync(file), true);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
