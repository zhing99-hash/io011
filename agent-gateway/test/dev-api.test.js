import test from 'node:test';
import assert from 'node:assert/strict';
import { Gateway } from '../src/gateway.js';
import { startDevApi } from '../src/dev-api.js';

const password = 'Long Test Password 123!';

async function request(url, path, { method = 'GET', token, body, contentType = 'application/json' } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = contentType;
  const response = await fetch(url + path, {
    method, headers, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  return { status: response.status, headers: response.headers, value: await response.json() };
}

test('loopback API enforces login, group authorization and revocation', async () => {
  const gateway = new Gateway({ allowedConnectorOrigins: ['https://workflow.example.test'] });
  gateway.bootstrapAdmin({ username: 'admin', password });
  const { server, url } = await startDevApi(gateway);
  try {
    assert.equal(server.address().address, '127.0.0.1');
    assert.equal((await request(url, '/v1/me')).status, 401);
    const login = await request(url, '/v1/login', { method: 'POST', body: { username: 'admin', password, clientId: 'codex' } });
    assert.equal(login.status, 200);
    assert.equal(login.headers.get('cache-control'), 'no-store');
    const adminToken = login.value.token;
    const alice = await request(url, '/v1/admin/users', { method: 'POST', token: adminToken, body: { username: 'alice', password } });
    assert.equal(alice.status, 201);
    const aliceLogin = await request(url, '/v1/login', { method: 'POST', body: { username: 'alice', password, clientId: 'workbuddy' } });
    const aliceToken = aliceLogin.value.token;
    assert.equal((await request(url, '/v1/admin/groups', { method: 'POST', token: aliceToken, body: { name: 'team' } })).status, 403);
    const target = await request(url, '/v1/admin/connectors', { method: 'POST', token: adminToken,
      body: { name: 'Review', endpoint: 'https://workflow.example.test/receive', fileTypes: ['pdf'] } });
    const group = await request(url, '/v1/admin/groups', { method: 'POST', token: adminToken, body: { name: 'reviewers' } });
    assert.equal(target.status, 201);
    assert.equal(group.status, 201);
    const args = { connectorId: target.value.id, fileType: 'pdf' };
    assert.equal((await request(url, '/v1/authorize/submission', { method: 'POST', token: aliceToken, body: args })).status, 403);
    await request(url, '/v1/admin/group-members', { method: 'POST', token: adminToken,
      body: { groupId: group.value.id, userId: alice.value.id } });
    await request(url, '/v1/admin/group-grants', { method: 'POST', token: adminToken,
      body: { groupId: group.value.id, connectorId: target.value.id, fileTypes: ['pdf'] } });
    assert.equal((await request(url, '/v1/authorize/submission', { method: 'POST', token: aliceToken, body: args })).status, 200);
    await request(url, '/v1/admin/group-members/remove', { method: 'POST', token: adminToken,
      body: { groupId: group.value.id, userId: alice.value.id } });
    assert.equal((await request(url, '/v1/authorize/submission', { method: 'POST', token: aliceToken, body: args })).status, 403);
    await request(url, '/v1/admin/users/disable', { method: 'POST', token: adminToken, body: { userId: alice.value.id } });
    assert.equal((await request(url, '/v1/me', { token: aliceToken })).status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    gateway.close();
  }
});

test('loopback API bounds JSON requests and reports invalid credentials without leaking details', async () => {
  const gateway = new Gateway();
  gateway.bootstrapAdmin({ username: 'admin', password });
  const { server, url } = await startDevApi(gateway);
  try {
    const wrong = await request(url, '/v1/login', { method: 'POST', body: { username: 'admin', password: 'wrong', clientId: 'codex' } });
    assert.deepEqual(wrong.value, { error: 'INVALID_CREDENTIALS' });
    assert.equal(wrong.status, 401);
    const tooLarge = await request(url, '/v1/login', { method: 'POST', body: { pad: 'x'.repeat(17_000) } });
    assert.equal(tooLarge.value.error, 'BODY_TOO_LARGE');
    assert.equal((await request(url, '/v1/login', { method: 'POST', body: '{', contentType: 'application/json' })).value.error, 'INVALID_JSON');
  } finally {
    await new Promise((resolve) => server.close(resolve));
    gateway.close();
  }
});
