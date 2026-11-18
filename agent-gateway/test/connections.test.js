import test from 'node:test';
import assert from 'node:assert/strict';
import { Gateway } from '../src/gateway.js';
import { startDevApi } from '../src/dev-api.js';

const password = 'Connections test password 123!';

test('connection listing paginates active own sessions and grants without exposing credentials or another user', async () => {
  const gateway = new Gateway();
  try {
    gateway.bootstrapAdmin({ username: 'admin', password });
    const admin = gateway.login({ username: 'admin', password, clientId: 'admin' }).token;
    const alice = gateway.createUser(admin, { username: 'alice', password });
    const bob = gateway.createUser(admin, { username: 'bob', password });
    const token = gateway.login({ username: 'alice', password, clientId: 'session-test' }).token;
    const store = gateway.configureOAuthStore(Buffer.alloc(32, 1));
    for (let i = 0; i < 51; i++) await store.adapter('Grant').upsert('private-grant-' + i, { accountId: alice.id, clientId: 'client-' + String(i).padStart(2, '0') }, 60);
    await store.adapter('Grant').upsert('bob-grant', { accountId: bob.id, clientId: 'bob-only' }, 60);
    await store.adapter('Grant').upsert('expired', { accountId: alice.id, clientId: 'expired-only' }, -1);
    const first = gateway.listMyConnections(token);
    assert.equal(first.connections.length, 50);
    assert.equal(first.nextCursor, 'client-49');
    const second = gateway.listMyConnections(token, { after: first.nextCursor });
    assert.deepEqual(second.connections.map((item) => item.clientId), ['client-50', 'session-test']);
    assert.equal(second.nextCursor, null);
    const text = JSON.stringify({ first, second });
    assert.equal(text.includes('bob-only'), false);
    assert.equal(text.includes('expired-only'), false);
    assert.equal(text.includes('private-grant'), false);
    assert.equal(text.includes(token), false);
    assert.throws(() => gateway.listMyConnections(token, { after: 'bad cursor' }), { code: 'INVALID_CURSOR' });
    gateway.revokeClientSessions(token, 'client-00');
    assert.equal(gateway.listMyConnections(token).connections.some((item) => item.clientId === 'client-00'), false);
    assert.ok(store.find('Grant', 'bob-grant'));
  } finally { gateway.close(); }
});

test('server-only browser session deadlines cannot extend platform sessions and are enforced after cookie theft', () => {
  let now = 100000;
  const gateway = new Gateway({ now: () => now });
  try {
    gateway.bootstrapAdmin({ username: 'admin', password });
    const signed = gateway.login({ username: 'admin', password, clientId: 'account-browser' }, { sessionMs: 1000 });
    assert.equal(signed.expiresAt, now + 1000);
    assert.throws(() => gateway.login({ username: 'admin', password, clientId: 'any' }, { sessionMs: 9 * 60 * 60 * 1000 }), { code: 'INVALID_SESSION_LIFETIME' });
    now += 1000;
    assert.throws(() => gateway.profile(signed.token), { code: 'AUTH_REQUIRED' });
  } finally { gateway.close(); }
});

test('connections API enforces bearer ownership, cursor validation and revoked session rejection', async () => {
  const gateway = new Gateway();
  let server;
  try {
    gateway.bootstrapAdmin({ username: 'admin', password });
    const admin = gateway.login({ username: 'admin', password, clientId: 'admin' }).token;
    gateway.createUser(admin, { username: 'alice', password });
    const token = gateway.login({ username: 'alice', password, clientId: 'workbuddy' }).token;
    const api = await startDevApi(gateway); server = api.server;
    const get = (path, access) => fetch(api.url + path, { headers: access ? { Authorization: 'Bearer ' + access } : {} });
    assert.equal((await get('/v1/connections')).status, 401);
    const first = await get('/v1/connections', token);
    assert.equal(first.status, 200);
    assert.deepEqual((await first.json()).connections.map((item) => item.clientId), ['workbuddy']);
    assert.equal((await get('/v1/connections?userId=other', token)).status, 400);
    assert.equal((await get('/v1/connections?after=aa&after=bb', token)).status, 400);
    assert.equal((await get('/v1/connections?after=bad%20cursor', token)).status, 400);
    assert.deepEqual((await (await get('/v1/connections?after=workbuddy', token)).json()).connections, []);
    gateway.revokeSession(token);
    assert.equal((await get('/v1/connections', token)).status, 401);
  } finally { if (server) { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); } gateway.close(); }
});
