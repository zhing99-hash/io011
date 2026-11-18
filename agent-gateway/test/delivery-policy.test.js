import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateDelivery } from '../src/delivery-policy.js';

function validCase() {
  const hash = 'a'.repeat(64);
  return {
    principal: { id: 'user-1', active: true },
    clientAuthorization: { active: true, principalId: 'user-1', clientId: 'client-1' },
    grant: { active: true, principalId: 'user-1', action: 'deliver', targetId: 'target-1', fileTypes: ['pdf'], fileIds: ['file-1'] },
    target: { id: 'target-1', enabled: true, fileTypes: ['pdf'] },
    file: { id: 'file-1', version: 'v1', sha256: hash, type: 'pdf', storageState: 'quarantined' },
    scan: { status: 'passed', fileId: 'file-1', fileVersion: 'v1', sha256: hash, policyVersion: 'policy-1', engineVersion: 'engine-1' },
    policy: { active: true, version: 'policy-1' },
  };
}

test('allows a matching active grant, target and scan', () => {
  assert.deepEqual(evaluateDelivery(validCase()), { allowed: true, reason: 'ALLOWED' });
});

test('fails closed when an identity or authorization is revoked or mismatched', () => {
  for (const change of [
    c => { c.principal.active = false; },
    c => { c.clientAuthorization.active = false; },
    c => { c.clientAuthorization.principalId = 'someone-else'; },
    c => { c.grant.active = false; },
    c => { c.grant.principalId = 'someone-else'; },
    c => { c.grant.action = 'read'; },
    c => { c.target.enabled = false; },
    c => { c.target.id = 'another-target'; },
    c => { c.grant.fileTypes = []; },
    c => { c.target.fileTypes = []; },
    c => { c.grant.fileIds = ['another-file']; },
  ]) {
    const c = validCase(); change(c);
    assert.equal(evaluateDelivery(c).allowed, false);
  }
});

test('fails closed for failed, stale, absent or mismatched scan evidence', () => {
  for (const change of [
    c => { c.scan.status = 'scan_failed'; },
    c => { c.scan.status = 'scanning'; },
    c => { c.scan.status = 'isolated'; },
    c => { c.scan = undefined; },
    c => { c.file.version = 'v2'; },
    c => { c.file.sha256 = 'b'.repeat(64); },
    c => { c.scan.fileId = 'another-file'; },
    c => { c.policy.version = 'policy-2'; },
    c => { c.policy.active = false; },
    c => { c.scan.engineVersion = ''; },
    c => { c.file.storageState = 'public'; },
  ]) {
    const c = validCase(); change(c);
    assert.equal(evaluateDelivery(c).allowed, false);
  }
});

test('rejects missing or malformed input', () => {
  assert.equal(evaluateDelivery().allowed, false);
  const c = validCase(); c.file.sha256 = 'not-a-digest';
  assert.equal(evaluateDelivery(c).allowed, false);
});
