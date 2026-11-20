import { randomBytes, createHash, createCipheriv, createDecipheriv } from 'node:crypto';

export const oauthHash = (kind, value) => createHash('sha256').update(kind + '\0' + value).digest('hex');

/** oidc-provider adapter storage. Values are encrypted using a separately managed key. */
export class OAuthStore {
  #db;
  #key;
  constructor(db, key) {
    if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('INVALID_OAUTH_STORAGE_KEY');
    this.#db = db;
    this.#key = Buffer.from(key);
    const id = oauthHash('KeyCheck', 'storage');
    const existing = db.prepare("SELECT * FROM oauth_records WHERE model = 'KeyCheck' AND id_hash = ?").get(id);
    if (existing) {
      try { if (this.#open(existing)?.version !== 1) throw new Error(); }
      catch { throw new Error('OAUTH_STORAGE_KEY_MISMATCH'); }
    } else {
      db.prepare(`INSERT INTO oauth_records(model,id_hash,payload,expires_at) VALUES ('KeyCheck',?,?,NULL)`)
        .run(id, this.#seal('KeyCheck', id, { version: 1 }));
    }
  }
  #seal(model, idHash, payload) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.#key, iv);
    cipher.setAAD(Buffer.from(model + ':' + idHash));
    return Buffer.concat([iv, cipher.update(JSON.stringify(payload), 'utf8'), cipher.final(), cipher.getAuthTag()]);
  }
  #open(row) {
    if (!row || (row.expires_at !== null && row.expires_at <= Date.now())) return undefined;
    const value = Buffer.from(row.payload);
    const cipher = createDecipheriv('aes-256-gcm', this.#key, value.subarray(0, 12));
    cipher.setAAD(Buffer.from(row.model + ':' + row.id_hash));
    cipher.setAuthTag(value.subarray(-16));
    const payload = JSON.parse(Buffer.concat([cipher.update(value.subarray(12, -16)), cipher.final()]).toString('utf8'));
    if (row.consumed_at !== null) payload.consumed = row.consumed_at;
    return payload;
  }
  find(model, id) {
    if (typeof id !== 'string') return undefined;
    return this.#open(this.#db.prepare('SELECT * FROM oauth_records WHERE model = ? AND id_hash = ?').get(model, oauthHash(model, id)));
  }
  adapter(model) {
    const lookupBy = (column, kind, value) => this.#open(this.#db.prepare(`SELECT * FROM oauth_records WHERE model = ? AND ${column} = ?`).get(model, oauthHash(kind, value)));
    return {
      upsert: async (id, payload, expiresIn) => {
        const idHash = oauthHash(model, id);
        this.#db.prepare(`INSERT INTO oauth_records(model,id_hash,payload,expires_at,grant_hash,account_hash,client_id,uid_hash,user_code_hash,consumed_at)
          VALUES (?,?,?,?,?,?,?,?,?,?) ON CONFLICT(model,id_hash) DO UPDATE SET payload=excluded.payload,
          expires_at=excluded.expires_at,grant_hash=excluded.grant_hash,account_hash=excluded.account_hash,
          client_id=excluded.client_id,uid_hash=excluded.uid_hash,user_code_hash=excluded.user_code_hash,
          consumed_at=COALESCE(excluded.consumed_at,oauth_records.consumed_at)`)
          .run(model, idHash, this.#seal(model, idHash, payload), typeof expiresIn === 'number' ? Date.now() + expiresIn * 1000 : null,
            payload.grantId ? oauthHash('Grant', payload.grantId) : null,
            payload.accountId ? oauthHash('Account', payload.accountId) : null, payload.clientId ?? null,
            payload.uid ? oauthHash('Uid', payload.uid) : null, payload.userCode ? oauthHash('UserCode', payload.userCode) : null,
            payload.consumed ?? null);
      },
      find: async (id) => this.find(model, id),
      findByUid: async (uid) => lookupBy('uid_hash', 'Uid', uid),
      findByUserCode: async (code) => lookupBy('user_code_hash', 'UserCode', code),
      destroy: async (id) => { this.#db.prepare('DELETE FROM oauth_records WHERE model = ? AND id_hash = ?').run(model, oauthHash(model, id)); },
      consume: async (id) => {
        const changed = this.#db.prepare('UPDATE oauth_records SET consumed_at = ? WHERE model = ? AND id_hash = ? AND consumed_at IS NULL')
          .run(Math.floor(Date.now() / 1000), model, oauthHash(model, id));
        if (changed.changes !== 1) throw new Error('OAUTH_ARTIFACT_ALREADY_CONSUMED');
      },
      revokeByGrantId: async (id) => {
        const hash = oauthHash('Grant', id);
        this.#db.prepare("DELETE FROM oauth_records WHERE grant_hash = ? OR (model = 'Grant' AND id_hash = ?)").run(hash, hash);
      },
    };
  }
}
