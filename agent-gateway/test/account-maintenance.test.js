import test from 'node:test';
import assert from 'node:assert/strict';
import { Gateway } from '../src/gateway.js';

const password = 'Account maintenance password 123!';
test('password reset revokes every old session and restricts temporary-password sessions until changed', () => {
  const gateway = new Gateway();
  try {
    gateway.bootstrapAdmin({ username: 'admin', password });
    const admin = gateway.login({ username: 'admin', password, clientId: 'codex' }).token;
    const alice = gateway.createUser(admin, { username: 'alice', password });
    const old1 = gateway.login({ username: 'alice', password, clientId: 'codex' }).token;
    const old2 = gateway.login({ username: 'alice', password, clientId: 'workbuddy' }).token;
    assert.throws(() => gateway.resetUserPassword(old1, { userId: alice.id, temporaryPassword: 'Temporary password 456!' }), { code: 'FORBIDDEN' });
    gateway.resetUserPassword(admin, { userId: alice.id, temporaryPassword: 'Temporary password 456!' });
    for (const token of [old1, old2]) assert.throws(() => gateway.profile(token), { code: 'AUTH_REQUIRED' });
    const temporary = gateway.login({ username: 'alice', password: 'Temporary password 456!', clientId: 'codex' });
    assert.equal(temporary.user.mustChangePassword, true);
    assert.equal(gateway.profile(temporary.token).mustChangePassword, true);
    assert.throws(() => gateway.authorizeSubmission(temporary.token, { connectorId: 'any', fileType: 'pdf' }), { code: 'PASSWORD_CHANGE_REQUIRED' });
    assert.throws(() => gateway.changePassword(temporary.token, { currentPassword: 'wrong', newPassword: 'New permanent password 789!' }), { code: 'INVALID_CREDENTIALS' });
    assert.deepEqual(gateway.changePassword(temporary.token, { currentPassword: 'Temporary password 456!', newPassword: 'New permanent password 789!' }), { reauthenticationRequired: true });
    assert.throws(() => gateway.profile(temporary.token), { code: 'AUTH_REQUIRED' });
    assert.throws(() => gateway.login({ username: 'alice', password: 'Temporary password 456!', clientId: 'codex' }), { code: 'INVALID_CREDENTIALS' });
    const permanent = gateway.login({ username: 'alice', password: 'New permanent password 789!', clientId: 'codex' });
    assert.equal(permanent.user.mustChangePassword, false);
    const events = gateway.auditForAdmin(admin);
    assert.equal(events.filter((event) => event.action === 'change_password').length, 2);
    assert.equal(JSON.stringify(events).includes('Temporary password'), false);
  } finally { gateway.close(); }
});

test('password changes share persistent failure lockout with login and recover after the lock window', () => {
  let now = 100000;
  const gateway = new Gateway({ now: () => now });
  try {
    gateway.bootstrapAdmin({ username: 'admin', password });
    const token = gateway.login({ username: 'admin', password, clientId: 'account-browser' }).token;
    for (let i = 0; i < 5; i++) assert.throws(() => gateway.changePassword(token, { currentPassword: 'wrong', newPassword: 'A new permanent password 456!' }), { code: 'INVALID_CREDENTIALS' });
    assert.throws(() => gateway.changePassword(token, { currentPassword: password, newPassword: 'A new permanent password 456!' }), { code: 'INVALID_CREDENTIALS' });
    assert.throws(() => gateway.login({ username: 'admin', password, clientId: 'codex' }), { code: 'INVALID_CREDENTIALS' });
    now += 15 * 60 * 1000;
    assert.equal(gateway.changePassword(token, { currentPassword: password, newPassword: 'A new permanent password 456!' }).reauthenticationRequired, true);
  } finally { gateway.close(); }
});
