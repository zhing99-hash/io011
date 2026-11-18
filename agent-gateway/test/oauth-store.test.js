import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Gateway } from '../src/gateway.js';

test('OAuth storage encrypts payloads, hashes token identifiers and rejects ciphertext modification', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'gateway-oauth-store-'));
  const filename = join(dir, 'gateway.sqlite');
  const gateway = new Gateway({ filename });
  const store = gateway.configureOAuthStore(randomBytes(32));
  const adapter = store.adapter('AccessToken');
  try {
    await adapter.upsert('raw-secret-token-value', { accountId: 'account-id', clientId: 'desktop', grantId: 'grant-id', secret: 'raw-secret-payload' }, 60);
    assert.equal((await adapter.find('raw-secret-token-value')).secret, 'raw-secret-payload');
    const db = new DatabaseSync(filename);
    try {
      const row = db.prepare("SELECT id_hash,payload FROM oauth_records WHERE model='AccessToken'").get();
      assert.equal(row.id_hash.includes('raw-secret-token'), false);
      assert.equal(Buffer.from(row.payload).includes(Buffer.from('raw-secret-payload')), false);
      const corrupted = Buffer.from(row.payload); corrupted[20] ^= 1;
      db.prepare("UPDATE oauth_records SET payload = ? WHERE model='AccessToken'").run(corrupted);
    } finally { db.close(); }
    await assert.rejects(adapter.find('raw-secret-token-value'));
  } finally { gateway.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('OAuth storage preserves consumption and refuses a changed encryption key on restart', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'gateway-oauth-key-'));
  const filename = join(dir, 'gateway.sqlite');
  const key = randomBytes(32);
  let gateway = new Gateway({ filename });
  try {
    const store = gateway.configureOAuthStore(key);
    const codes = store.adapter('AuthorizationCode');
    await codes.upsert('code', { grantId: 'grant', accountId: 'user' }, 60);
    await codes.consume('code');
    await assert.rejects(codes.consume('code'));
    assert.ok((await codes.find('code')).consumed);
    await codes.upsert('expired', {}, -1);
    assert.equal(await codes.find('expired'), undefined);
    gateway.close(); gateway = new Gateway({ filename });
    assert.throws(() => gateway.configureOAuthStore(randomBytes(32)), /OAUTH_STORAGE_KEY_MISMATCH/);
    const restored = gateway.configureOAuthStore(key).adapter('AuthorizationCode');
    assert.ok((await restored.find('code')).consumed);
    await restored.revokeByGrantId('grant');
    assert.equal(await restored.find('code'), undefined);
  } finally { gateway.close(); rmSync(dir, { recursive: true, force: true }); }
});
