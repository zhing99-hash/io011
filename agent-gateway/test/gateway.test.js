import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Gateway } from '../src/gateway.js';

const PASSWORD = 'Correct Horse Battery 123!';
const OTHER_PASSWORD = 'Another Long Password 456!';

function setup(now = () => Date.now()) {
  const gateway = new Gateway({ now, allowedConnectorOrigins: ['https://workflow.example.test'] });
  const admin = gateway.bootstrapAdmin({ username: 'Admin.One', password: PASSWORD });
  const adminToken = gateway.login({ username: 'admin.one', password: PASSWORD, clientId: 'codex' }).token;
  const alice = gateway.createUser(adminToken, { username: 'alice', password: OTHER_PASSWORD });
  const bob = gateway.createUser(adminToken, { username: 'bob', password: OTHER_PASSWORD });
  const aliceToken = gateway.login({ username: 'alice', password: OTHER_PASSWORD, clientId: 'workbuddy' }).token;
  const bobToken = gateway.login({ username: 'bob', password: OTHER_PASSWORD, clientId: 'deepseek-harness' }).token;
  const connector = gateway.registerConnector(adminToken, { name: 'Contract workflow', endpoint: 'https://workflow.example.test/receive', fileTypes: ['pdf', 'docx'] });
  return { gateway, admin, adminToken, alice, bob, aliceToken, bobToken, connector };
}

test('bootstrap is one-time and roles control administration', () => {
  const c = setup();
  try {
    assert.equal(c.gateway.profile(c.adminToken).username, 'admin.one');
    assert.throws(() => c.gateway.bootstrapAdmin({ username: 'other', password: PASSWORD }), { code: 'ALREADY_BOOTSTRAPPED' });
    assert.throws(() => c.gateway.createUser(c.aliceToken, { username: 'eve', password: PASSWORD }), { code: 'FORBIDDEN' });
    assert.throws(() => c.gateway.registerConnector(c.aliceToken, { name: 'Other', endpoint: 'https://workflow.example.test/other', fileTypes: ['pdf'] }), { code: 'FORBIDDEN' });
  } finally { c.gateway.close(); }
});

test('submission requires explicit matching user, connector and file type grant', () => {
  const c = setup();
  try {
    assert.throws(() => c.gateway.authorizeSubmission(c.aliceToken, { connectorId: c.connector.id, fileType: 'pdf' }), { code: 'FORBIDDEN' });
    c.gateway.grantSubmit(c.adminToken, { userId: c.alice.id, connectorId: c.connector.id, fileTypes: ['pdf'] });
    assert.equal(c.gateway.authorizeSubmission(c.aliceToken, { connectorId: c.connector.id, fileType: 'pdf' }).principalId, c.alice.id);
    assert.equal(c.gateway.auditForAdmin(c.adminToken).findLast((event) => event.action === 'authorize_submission').client_id, 'workbuddy');
    assert.throws(() => c.gateway.authorizeSubmission(c.aliceToken, { connectorId: c.connector.id, fileType: 'docx' }), { code: 'FORBIDDEN' });
    assert.throws(() => c.gateway.authorizeSubmission(c.bobToken, { connectorId: c.connector.id, fileType: 'pdf' }), { code: 'FORBIDDEN' });
    c.gateway.revokeSubmit(c.adminToken, { userId: c.alice.id, connectorId: c.connector.id });
    assert.throws(() => c.gateway.authorizeSubmission(c.aliceToken, { connectorId: c.connector.id, fileType: 'pdf' }), { code: 'FORBIDDEN' });
  } finally { c.gateway.close(); }
});

test('disabled connector and user are rejected on subsequent access', () => {
  const c = setup();
  try {
    c.gateway.grantSubmit(c.adminToken, { userId: c.alice.id, connectorId: c.connector.id, fileTypes: ['pdf'] });
    c.gateway.setConnectorEnabled(c.adminToken, c.connector.id, false);
    assert.throws(() => c.gateway.authorizeSubmission(c.aliceToken, { connectorId: c.connector.id, fileType: 'pdf' }), { code: 'FORBIDDEN' });
    c.gateway.setConnectorEnabled(c.adminToken, c.connector.id, true);
    c.gateway.disableUser(c.adminToken, c.alice.id);
    assert.throws(() => c.gateway.profile(c.aliceToken), { code: 'AUTH_REQUIRED' });
    assert.throws(() => c.gateway.authorizeSubmission(c.aliceToken, { connectorId: c.connector.id, fileType: 'pdf' }), { code: 'AUTH_REQUIRED' });
  } finally { c.gateway.close(); }
});

test('group access follows current membership and group grant', () => {
  const c = setup();
  try {
    const group = c.gateway.createGroup(c.adminToken, 'Reviewers');
    c.gateway.grantGroupSubmit(c.adminToken, { groupId: group.id, connectorId: c.connector.id, fileTypes: ['docx'] });
    assert.throws(() => c.gateway.authorizeSubmission(c.aliceToken, { connectorId: c.connector.id, fileType: 'docx' }), { code: 'FORBIDDEN' });
    c.gateway.addUserToGroup(c.adminToken, { userId: c.alice.id, groupId: group.id });
    const membershipAudit = c.gateway.auditForAdmin(c.adminToken).findLast((event) => event.action === 'add_group_member');
    assert.deepEqual(JSON.parse(membershipAudit.resource_id), { groupId: group.id, userId: c.alice.id });
    assert.equal(membershipAudit.client_id, 'codex');
    assert.equal(c.gateway.authorizeSubmission(c.aliceToken, { connectorId: c.connector.id, fileType: 'docx' }).principalId, c.alice.id);
    assert.throws(() => c.gateway.authorizeSubmission(c.bobToken, { connectorId: c.connector.id, fileType: 'docx' }), { code: 'FORBIDDEN' });
    c.gateway.removeUserFromGroup(c.adminToken, { userId: c.alice.id, groupId: group.id });
    assert.throws(() => c.gateway.authorizeSubmission(c.aliceToken, { connectorId: c.connector.id, fileType: 'docx' }), { code: 'FORBIDDEN' });
    c.gateway.addUserToGroup(c.adminToken, { userId: c.alice.id, groupId: group.id });
    c.gateway.revokeGroupSubmit(c.adminToken, { groupId: group.id, connectorId: c.connector.id });
    assert.throws(() => c.gateway.authorizeSubmission(c.aliceToken, { connectorId: c.connector.id, fileType: 'docx' }), { code: 'FORBIDDEN' });
  } finally { c.gateway.close(); }
});

test('connector registration requires an exact preapproved HTTPS origin', () => {
  const c = setup();
  try {
    for (const endpoint of [
      'http://workflow.example.test/receive',
      'https://workflow.example.test.evil.test/receive',
      'https://workflow.example.test@evil.test/receive',
      'https://workflow.example.test/receive?redirect=https://evil.test',
      'https://workflow.example.test/receive#fragment',
      'https://127.0.0.1/receive',
    ]) {
      assert.throws(() => c.gateway.registerConnector(c.adminToken, { name: 'Bad target', endpoint, fileTypes: ['pdf'] }), { code: 'ENDPOINT_NOT_ALLOWED' });
    }
    const accepted = c.gateway.registerConnector(c.adminToken, { name: 'Approved target', endpoint: 'https://workflow.example.test/v1/receive', fileTypes: ['pdf'] });
    assert.equal(accepted.endpoint, 'https://workflow.example.test/v1/receive');
  } finally { c.gateway.close(); }
});

test('session revocation and expiration are enforced', () => {
  let time = 1_000_000;
  const c = setup(() => time);
  try {
    c.gateway.revokeSession(c.aliceToken);
    assert.throws(() => c.gateway.profile(c.aliceToken), { code: 'AUTH_REQUIRED' });
    const newToken = c.gateway.login({ username: 'alice', password: OTHER_PASSWORD, clientId: 'codex' }).token;
    time += 8 * 60 * 60 * 1000;
    assert.throws(() => c.gateway.profile(newToken), { code: 'AUTH_REQUIRED' });
  } finally { c.gateway.close(); }
});

test('a user can revoke their own client sessions without touching another user', () => {
  const c = setup();
  try {
    const aliceCodex = c.gateway.login({ username: 'alice', password: OTHER_PASSWORD, clientId: 'codex' }).token;
    const bobCodex = c.gateway.login({ username: 'bob', password: OTHER_PASSWORD, clientId: 'codex' }).token;
    assert.equal(c.gateway.revokeClientSessions(c.aliceToken, 'codex').revoked, 1);
    assert.throws(() => c.gateway.profile(aliceCodex), { code: 'AUTH_REQUIRED' });
    assert.equal(c.gateway.profile(c.aliceToken).id, c.alice.id);
    assert.equal(c.gateway.profile(bobCodex).id, c.bob.id);
  } finally { c.gateway.close(); }
});

test('account, grant and revocation persist across restart', () => {
  const folder = mkdtempSync(join(tmpdir(), 'agent-gateway-'));
  const filename = join(folder, 'gateway.sqlite');
  let gateway = new Gateway({ filename, allowedConnectorOrigins: ['https://workflow.example.test'] });
  try {
    gateway.bootstrapAdmin({ username: 'admin', password: PASSWORD });
    const adminToken = gateway.login({ username: 'admin', password: PASSWORD, clientId: 'codex' }).token;
    const user = gateway.createUser(adminToken, { username: 'alice', password: OTHER_PASSWORD });
    const connector = gateway.registerConnector(adminToken, { name: 'Review', endpoint: 'https://workflow.example.test/receive', fileTypes: ['pdf'] });
    gateway.grantSubmit(adminToken, { userId: user.id, connectorId: connector.id, fileTypes: ['pdf'] });
    gateway.close();
    gateway = new Gateway({ filename, allowedConnectorOrigins: ['https://workflow.example.test'] });
    const token = gateway.login({ username: 'alice', password: OTHER_PASSWORD, clientId: 'workbuddy' }).token;
    assert.equal(gateway.authorizeSubmission(token, { connectorId: connector.id, fileType: 'pdf' }).principalId, user.id);
    gateway.revokeClientSessions(token, 'workbuddy');
    gateway.close();
    gateway = new Gateway({ filename, allowedConnectorOrigins: ['https://workflow.example.test'] });
    assert.throws(() => gateway.profile(token), { code: 'AUTH_REQUIRED' });
  } finally {
    gateway.close();
    rmSync(folder, { recursive: true, force: true });
  }
});

test('repeated wrong passwords lock account temporarily and leave audit trail', () => {
  let time = 2_000_000;
  const c = setup(() => time);
  try {
    for (let i = 0; i < 5; i++) {
      assert.throws(() => c.gateway.login({ username: 'alice', password: 'wrong', clientId: 'codex' }), { code: 'INVALID_CREDENTIALS' });
    }
    assert.throws(() => c.gateway.login({ username: 'alice', password: OTHER_PASSWORD, clientId: 'codex' }), { code: 'INVALID_CREDENTIALS' });
    time += 15 * 60 * 1000;
    assert.equal(c.gateway.login({ username: 'alice', password: OTHER_PASSWORD, clientId: 'codex' }).user.id, c.alice.id);
    const denied = c.gateway.auditForAdmin(c.adminToken).filter((event) => event.action === 'login' && event.result === 'denied');
    assert.equal(denied.length, 6);
    assert.equal(JSON.stringify(denied).includes(OTHER_PASSWORD), false);
  } finally { c.gateway.close(); }
});
