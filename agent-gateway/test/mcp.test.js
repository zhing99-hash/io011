import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { Gateway } from '../src/gateway.js';
import { startDevApi } from '../src/dev-api.js';

const password = 'MCP integration password 123!';
test('official MCP clients discover tools and maintain user isolation and current authorization', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'gateway-mcp-'));
  const gateway = new Gateway({ quarantineDir: dir, allowedConnectorOrigins: ['https://workflow.example.test'] });
  gateway.bootstrapAdmin({ username: 'admin', password });
  const admin = gateway.login({ username: 'admin', password, clientId: 'codex' }).token;
  const alice = gateway.createUser(admin, { username: 'alice', password });
  const bob = gateway.createUser(admin, { username: 'bob', password });
  const tokenA = gateway.login({ username: 'alice', password, clientId: 'codex' }).token;
  const tokenB = gateway.login({ username: 'bob', password, clientId: 'workbuddy' }).token;
  const targetA = gateway.registerConnector(admin, { name: 'Alice target', endpoint: 'https://workflow.example.test/alice', fileTypes: ['md', 'pdf'] });
  const targetB = gateway.registerConnector(admin, { name: 'Bob target', endpoint: 'https://workflow.example.test/bob', fileTypes: ['pdf'] });
  gateway.grantSubmit(admin, { userId: alice.id, connectorId: targetA.id, fileTypes: ['md'] });
  gateway.grantSubmit(admin, { userId: bob.id, connectorId: targetB.id, fileTypes: ['pdf'] });
  const file = gateway.quarantineFile(tokenA, { connectorId: targetA.id, fileType: 'md', idempotencyKey: 'mcp-file-request-123456', content: Buffer.from('# private content') });
  const { server, url } = await startDevApi(gateway);
  const a = new Client({ name: 'client-a', version: '0.1.0' });
  const b = new Client({ name: 'client-b', version: '0.1.0' });
  try {
    await a.connect(new StreamableHTTPClientTransport(new URL(url + '/mcp'), { requestInit: { headers: { Authorization: `Bearer ${tokenA}` } } }));
    await b.connect(new StreamableHTTPClientTransport(new URL(url + '/mcp'), { requestInit: { headers: { Authorization: `Bearer ${tokenB}` } } }));
    const tools = await a.listTools();
    assert.equal(tools.tools.length, 4);
    const [pa, pb] = await Promise.all([
      a.callTool({ name: 'get_my_profile', arguments: {} }), b.callTool({ name: 'get_my_profile', arguments: {} }),
    ]);
    assert.equal(pa.structuredContent.id, alice.id);
    assert.equal(pb.structuredContent.id, bob.id);
    const targets = await a.callTool({ name: 'list_authorized_targets', arguments: {} });
    assert.deepEqual(targets.structuredContent.targets, [{ id: targetA.id, name: 'Alice target', fileTypes: ['md'] }]);
    const foreign = await b.callTool({ name: 'get_file_review_status', arguments: { id: file.id } });
    assert.equal(foreign.isError, true);
    assert.equal(foreign.structuredContent.error, 'RESOURCE_NOT_FOUND');
    gateway.revokeSubmit(admin, { userId: alice.id, connectorId: targetA.id });
    assert.equal((await a.callTool({ name: 'list_authorized_targets', arguments: {} })).structuredContent.targets.length, 0);
    gateway.disableUser(admin, bob.id);
    await assert.rejects(b.callTool({ name: 'get_my_profile', arguments: {} }));
  } finally {
    await Promise.allSettled([a.close(), b.close()]);
    await new Promise((resolve) => server.close(resolve));
    gateway.close(); rmSync(dir, { recursive: true, force: true });
  }
});
