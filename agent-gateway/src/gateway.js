import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, openSync, writeFileSync, closeSync, unlinkSync, readSync, lstatSync, fstatSync, constants } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { inspectFileFormat } from './format-inspector.js';
import { OAuthStore, oauthHash } from './oauth-store.js';

const SESSION_MS = 8 * 60 * 60 * 1000;
const MAX_FAILED_LOGINS = 5;
const LOCK_MS = 15 * 60 * 1000;
const SUPPORTED_TYPES = new Set(['md', 'pdf', 'docx', 'xlsx', 'xml']);
const ROLES = new Set(['admin', 'user', 'security']);
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const CLIENT_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/;
const GROUP_PATTERN = /^[a-z0-9][a-z0-9._-]{2,63}$/;
const MAX_FILE_BYTES = 2 * 1024 * 1024;

export class GatewayError extends Error {
  constructor(code) {
    super(code);
    this.name = 'GatewayError';
    this.code = code;
  }
}

const fail = (code) => { throw new GatewayError(code); };
const digest = (token) => createHash('sha256').update(token).digest('hex');
const normalizeUsername = (value) => typeof value === 'string' ? value.trim().toLowerCase() : '';

function validateUsername(value) {
  const normalized = normalizeUsername(value);
  if (!USERNAME_PATTERN.test(normalized)) fail('INVALID_USERNAME');
  return normalized;
}

function validatePassword(value) {
  if (typeof value !== 'string' || value.length < 12 || value.length > 1024) fail('INVALID_PASSWORD');
}

function passwordHash(password, salt, p = 5) {
  if (![1, 5].includes(p)) fail('PASSWORD_SCHEME_UNSUPPORTED');
  return scryptSync(password, Buffer.from(salt, 'hex'), 64, { N: 16384, r: 8, p }).toString('hex');
}

function validateTypes(types) {
  if (!Array.isArray(types) || types.length === 0 ||
      !types.every((type) => SUPPORTED_TYPES.has(type)) || new Set(types).size !== types.length) {
    fail('INVALID_FILE_TYPES');
  }
}

function normalizeEndpoint(value, allowedOrigins) {
  let url;
  try { url = new URL(value); } catch { fail('INVALID_ENDPOINT'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search ||
      !allowedOrigins.has(url.origin)) fail('ENDPOINT_NOT_ALLOWED');
  return url.href;
}

/**
 * Single-instance development service. The HTTP/OAuth boundary uses this
 * service's opaque sessions and internally validated OAuth capabilities.
 * Persistence and authorization here do not constitute production acceptance.
 */
export class Gateway {
  #db;
  #now;
  #allowedOrigins;
  #quarantineDir;
  #scanner;
  #scanTimeoutMs;
  #oauthStore;
  #oauthContexts = new WeakMap();

  constructor({ filename = ':memory:', now = () => Date.now(), allowedConnectorOrigins = [], quarantineDir,
    scanner, scanTimeoutMs = 30_000 } = {}) {
    if (!Number.isInteger(scanTimeoutMs) || scanTimeoutMs < 1 || scanTimeoutMs > 30_000) fail('INVALID_SCAN_TIMEOUT');
    this.#scanner = scanner;
    this.#scanTimeoutMs = scanTimeoutMs;
    if (quarantineDir !== undefined) {
      if (typeof quarantineDir !== 'string' || !isAbsolute(quarantineDir)) fail('INVALID_QUARANTINE_DIR');
      mkdirSync(quarantineDir, { recursive: true, mode: 0o700 });
      if (!lstatSync(quarantineDir).isDirectory()) fail('INVALID_QUARANTINE_DIR');
      this.#quarantineDir = quarantineDir;
    }
    this.#allowedOrigins = new Set(allowedConnectorOrigins.map((value) => {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
        fail('INVALID_ALLOWED_ORIGIN');
      }
      return url.origin;
    }));
    this.#db = new DatabaseSync(filename);
    this.#now = now;
    if (this.#db.prepare('PRAGMA user_version').get().user_version > 2) {
      this.#db.close();
      fail('DATABASE_VERSION_UNSUPPORTED');
    }
    this.#db.exec('PRAGMA foreign_keys = ON');
    this.#db.exec('PRAGMA busy_timeout = 5000');
    this.#db.exec('PRAGMA journal_mode = WAL');
    this.#db.exec('BEGIN IMMEDIATE');
    try {
    this.#db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
        salt TEXT NOT NULL, role TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
        failed_logins INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
        client_id TEXT NOT NULL, expires_at INTEGER NOT NULL, revoked_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS connectors (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1,
        endpoint TEXT NOT NULL, file_types TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id)
      );
      CREATE TABLE IF NOT EXISTS groups (
        id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE
      );
      CREATE TABLE IF NOT EXISTS group_members (
        group_id TEXT NOT NULL REFERENCES groups(id), user_id TEXT NOT NULL REFERENCES users(id),
        PRIMARY KEY(group_id, user_id)
      );
      CREATE TABLE IF NOT EXISTS grants (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
        connector_id TEXT NOT NULL REFERENCES connectors(id), action TEXT NOT NULL,
        file_types TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
        UNIQUE(user_id, connector_id, action)
      );
      CREATE TABLE IF NOT EXISTS group_grants (
        id TEXT PRIMARY KEY, group_id TEXT NOT NULL REFERENCES groups(id),
        connector_id TEXT NOT NULL REFERENCES connectors(id), action TEXT NOT NULL,
        file_types TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
        UNIQUE(group_id, connector_id, action)
      );
      CREATE TABLE IF NOT EXISTS quarantined_files (
        id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id),
        connector_id TEXT NOT NULL REFERENCES connectors(id), file_type TEXT NOT NULL,
        sha256 TEXT NOT NULL, size INTEGER NOT NULL, storage_key TEXT NOT NULL UNIQUE,
        idempotency_key TEXT NOT NULL, state TEXT NOT NULL, created_at INTEGER NOT NULL,
        UNIQUE(owner_id, idempotency_key)
      );
      CREATE TABLE IF NOT EXISTS file_reviews (
        id TEXT PRIMARY KEY, file_id TEXT NOT NULL REFERENCES quarantined_files(id),
        sha256 TEXT NOT NULL, policy_version TEXT NOT NULL, state TEXT NOT NULL,
        reason TEXT NOT NULL, engine_version TEXT, started_at INTEGER NOT NULL, finished_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS file_format_checks (
        review_id TEXT PRIMARY KEY REFERENCES file_reviews(id), inspector_version TEXT NOT NULL,
        verdict TEXT NOT NULL, reason TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS audit_events (
        id TEXT PRIMARY KEY, at INTEGER NOT NULL, actor_id TEXT,
        client_id TEXT, action TEXT NOT NULL, resource_id TEXT, result TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS oauth_records (
        model TEXT NOT NULL, id_hash TEXT NOT NULL, payload BLOB NOT NULL, expires_at INTEGER,
        grant_hash TEXT, account_hash TEXT, client_id TEXT, uid_hash TEXT, user_code_hash TEXT,
        consumed_at INTEGER, PRIMARY KEY(model,id_hash)
      );
      CREATE INDEX IF NOT EXISTS oauth_grants ON oauth_records(grant_hash);
      CREATE INDEX IF NOT EXISTS oauth_accounts ON oauth_records(account_hash,client_id);
      CREATE INDEX IF NOT EXISTS oauth_uids ON oauth_records(model,uid_hash);
    `);
      // Additive upgrades for the recorded local prototype schemas, preserving accounts and files.
      const hasColumn = (table, column) => this.#db.prepare(`PRAGMA table_info(${table})`).all().some((item) => item.name === column);
      if (!hasColumn('users', 'password_p')) this.#db.exec('ALTER TABLE users ADD COLUMN password_p INTEGER NOT NULL DEFAULT 1');
      if (!hasColumn('users', 'must_change_password')) this.#db.exec('ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0');
      if (!hasColumn('audit_events', 'client_id')) this.#db.exec('ALTER TABLE audit_events ADD COLUMN client_id TEXT');
      if (!hasColumn('connectors', 'endpoint')) {
        this.#db.exec('ALTER TABLE connectors ADD COLUMN endpoint TEXT');
        this.#db.exec('UPDATE connectors SET enabled = 0 WHERE endpoint IS NULL');
      }
      this.#db.exec('PRAGMA user_version = 2');
      this.#db.exec('COMMIT');
    } catch (error) {
      this.#db.exec('ROLLBACK');
      this.#db.close();
      throw error;
    }
  }

  close() { this.#db.close(); }

  isInitialized() { return this.#db.prepare('SELECT COUNT(*) AS n FROM users').get().n > 0; }

  configureOAuthStore(key) {
    if (this.#oauthStore) fail('OAUTH_ALREADY_CONFIGURED');
    this.#oauthStore = new OAuthStore(this.#db, key);
    return this.#oauthStore;
  }

  oauthAccount(id) {
    const row = this.#db.prepare('SELECT id,username,active,must_change_password FROM users WHERE id = ?').get(id);
    return row?.active === 1 && row.must_change_password === 0 ? { id: row.id, username: row.username } : undefined;
  }

  createOAuthContext({ accountId, clientId, accessTokenId, grantId, resource }) {
    const context = Object.freeze({});
    this.#oauthContexts.set(context, { accountId, clientId, accessTokenId, grantId, resource });
    this.#requireUser(context);
    return context;
  }

  recordOAuthEvent(action, { accountId = null, clientId = null } = {}) {
    if (!['oauth_login', 'oauth_consent', 'oauth_denied', 'oauth_token_issued', 'oauth_grant_revoked'].includes(action)) fail('INVALID_OAUTH_AUDIT_EVENT');
    this.#audit(accountId, action, clientId, action === 'oauth_denied' ? 'denied' : 'allowed', clientId);
  }

  #revokeOAuthUser(userId, clientId) {
    const account = oauthHash('Account', userId);
    if (clientId === undefined) this.#db.prepare('DELETE FROM oauth_records WHERE account_hash = ?').run(account);
    else this.#db.prepare('DELETE FROM oauth_records WHERE account_hash = ? AND client_id = ?').run(account, clientId);
  }

  #atomic(work) {
    this.#db.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      this.#db.exec('COMMIT');
      return result;
    } catch (error) {
      this.#db.exec('ROLLBACK');
      throw error;
    }
  }

  #audit(actorId, action, resourceId, result, clientId = null) {
    this.#db.prepare('INSERT INTO audit_events(id,at,actor_id,client_id,action,resource_id,result) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), this.#now(), actorId, clientId, action, resourceId, result);
  }

  #requireUser(token, { allowPasswordChange = false } = {}) {
    if (token && typeof token === 'object' && this.#oauthContexts.has(token)) {
      const context = this.#oauthContexts.get(token);
      const access = this.#oauthStore?.find('AccessToken', context.accessTokenId);
      const grant = this.#oauthStore?.find('Grant', context.grantId);
      if (!access || !grant || access.consumed || access.accountId !== context.accountId ||
          access.clientId !== context.clientId || access.grantId !== context.grantId ||
          grant.accountId !== context.accountId || grant.clientId !== context.clientId ||
          access.aud !== context.resource || !access.scope?.split(' ').includes('mcp:read')) fail('AUTH_REQUIRED');
      const row = this.#db.prepare('SELECT id,username,role,active,must_change_password FROM users WHERE id = ?').get(context.accountId);
      if (!row || row.active !== 1 || row.must_change_password !== 0) fail('AUTH_REQUIRED');
      return { id: row.id, username: row.username, role: row.role, clientId: context.clientId, mustChangePassword: false, oauth: true };
    }
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) fail('AUTH_REQUIRED');
    const row = this.#db.prepare(`
      SELECT u.id, u.username, u.role, u.active, u.must_change_password, s.client_id
      FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
    `).get(digest(token), this.#now());
    if (!row || row.active !== 1) fail('AUTH_REQUIRED');
    if (row.must_change_password === 1 && !allowPasswordChange) fail('PASSWORD_CHANGE_REQUIRED');
    return { id: row.id, username: row.username, role: row.role, clientId: row.client_id, mustChangePassword: row.must_change_password === 1 };
  }

  #requireAdmin(token) {
    const user = this.#requireUser(token);
    if (user.role !== 'admin' || user.oauth) fail('FORBIDDEN');
    return user;
  }

  bootstrapAdmin({ username, password }) {
    const name = validateUsername(username);
    validatePassword(password);
    const salt = randomBytes(32).toString('hex');
    const hash = passwordHash(password, salt);
    return this.#atomic(() => {
      if (this.#db.prepare('SELECT COUNT(*) AS n FROM users').get().n !== 0) fail('ALREADY_BOOTSTRAPPED');
      const id = randomUUID();
      this.#db.prepare('INSERT INTO users(id,username,password_hash,salt,role,password_p) VALUES (?,?,?,?,?,5)')
        .run(id, name, hash, salt, 'admin');
      this.#audit(id, 'bootstrap_admin', id, 'allowed');
      return { id, username: name, role: 'admin' };
    });
  }

  createUser(adminToken, { username, password, role = 'user' }) {
    const admin = this.#requireAdmin(adminToken);
    const name = validateUsername(username);
    validatePassword(password);
    if (!ROLES.has(role)) fail('INVALID_ROLE');
    const salt = randomBytes(32).toString('hex');
    const hash = passwordHash(password, salt);
    return this.#atomic(() => {
      if (this.#db.prepare('SELECT id FROM users WHERE username = ?').get(name)) fail('USERNAME_EXISTS');
      const id = randomUUID();
      this.#db.prepare('INSERT INTO users(id,username,password_hash,salt,role,password_p) VALUES (?,?,?,?,?,5)')
        .run(id, name, hash, salt, role);
      this.#audit(admin.id, 'create_user', id, 'allowed');
      return { id, username: name, role };
    });
  }

  login({ username, password, clientId }, { sessionMs = SESSION_MS } = {}) {
    // This second argument is server-only. HTTP bodies cannot choose a lifetime.
    if (!Number.isInteger(sessionMs) || sessionMs < 1 || sessionMs > SESSION_MS) fail('INVALID_SESSION_LIFETIME');
    const name = validateUsername(username);
    if (typeof password !== 'string' || password.length > 1024 ||
        !CLIENT_PATTERN.test(clientId ?? '')) fail('INVALID_LOGIN');
    const result = this.#atomic(() => {
      const row = this.#db.prepare('SELECT * FROM users WHERE username = ?').get(name);
      // A dummy hash keeps missing-account attempts from taking the trivial fast path.
      const candidate = passwordHash(password, row?.salt ?? '00'.repeat(32), row?.password_p ?? 5);
      const expected = Buffer.from(row?.password_hash ?? '00'.repeat(64), 'hex');
      const matched = timingSafeEqual(Buffer.from(candidate, 'hex'), expected);
      if (!row || row.active !== 1 || row.locked_until > this.#now() || !matched) {
        if (row && row.active === 1 && row.locked_until <= this.#now()) {
          const failures = row.failed_logins + 1;
          this.#db.prepare('UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?')
            .run(failures, failures >= MAX_FAILED_LOGINS ? this.#now() + LOCK_MS : 0, row.id);
        }
        this.#audit(row?.id ?? null, 'login', null, 'denied', clientId);
        return { denied: true };
      }
      if (row.password_p === 1) {
        const salt = randomBytes(32).toString('hex');
        this.#db.prepare('UPDATE users SET password_hash = ?, salt = ?, password_p = 5 WHERE id = ?')
          .run(passwordHash(password, salt), salt, row.id);
      }
      this.#db.prepare('UPDATE users SET failed_logins = 0, locked_until = 0 WHERE id = ?').run(row.id);
      const token = randomBytes(32).toString('hex');
      const expiresAt = this.#now() + sessionMs;
      this.#db.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?, NULL)')
        .run(digest(token), row.id, clientId, expiresAt);
      this.#audit(row.id, 'login', clientId, 'allowed', clientId);
      return { token, expiresAt, user: { id: row.id, username: row.username, role: row.role, mustChangePassword: row.must_change_password === 1 } };
    });
    if (result.denied) fail('INVALID_CREDENTIALS');
    return result;
  }

  profile(token) { return this.#requireUser(token, { allowPasswordChange: true }); }

  assertSession(token) { this.#requireUser(token); }

  listMyConnections(token, { after = '' } = {}) {
    const user = this.#requireUser(token);
    if (user.oauth) fail('FORBIDDEN');
    if (typeof after !== 'string' || (after !== '' && !CLIENT_PATTERN.test(after))) fail('INVALID_CURSOR');
    const rows = this.#db.prepare(`WITH active AS (
      SELECT client_id, COUNT(*) AS sessions, 0 AS grants, MAX(expires_at) AS expires_at
      FROM sessions WHERE user_id = ? AND revoked_at IS NULL AND expires_at > ? GROUP BY client_id
      UNION ALL
      SELECT client_id, 0 AS sessions, COUNT(*) AS grants, MAX(expires_at) AS expires_at
      FROM oauth_records WHERE model = 'Grant' AND account_hash = ? AND (expires_at IS NULL OR expires_at > ?)
      GROUP BY client_id
    ) SELECT client_id, SUM(sessions) AS sessions, SUM(grants) AS grants, MAX(expires_at) AS expires_at
      FROM active WHERE client_id > ? GROUP BY client_id ORDER BY client_id LIMIT 51`)
      .all(user.id, this.#now(), oauthHash('Account', user.id), Date.now(), after);
    const page = rows.slice(0, 50);
    return { connections: page.map((row) => ({ clientId: row.client_id, platformSessions: Number(row.sessions),
      oauthGrants: Number(row.grants), expiresAt: row.expires_at })),
      nextCursor: rows.length > 50 ? page.at(-1).client_id : null };
  }

  listAuthorizedTargets(token) {
    const user = this.#requireUser(token);
    const rows = this.#db.prepare(`
      SELECT c.id,c.name,c.file_types FROM connectors c WHERE c.enabled = 1 AND c.id IN (
        SELECT connector_id FROM grants WHERE user_id = ? AND active = 1 AND action = 'submit'
        UNION SELECT gg.connector_id FROM group_grants gg JOIN group_members gm ON gm.group_id = gg.group_id
        WHERE gm.user_id = ? AND gg.active = 1 AND gg.action = 'submit'
      ) ORDER BY c.id LIMIT 1000`).all(user.id, user.id);
    const types = this.#db.prepare(`SELECT file_types FROM grants WHERE user_id = ? AND connector_id = ? AND action = 'submit' AND active = 1
      UNION ALL SELECT gg.file_types FROM group_grants gg JOIN group_members gm ON gm.group_id = gg.group_id
      WHERE gm.user_id = ? AND gg.connector_id = ? AND gg.action = 'submit' AND gg.active = 1`);
    return { targets: rows.map((row) => {
      const allowed = new Set(types.all(user.id, row.id, user.id, row.id).flatMap((grant) => JSON.parse(grant.file_types)));
      return { id: row.id, name: row.name, fileTypes: JSON.parse(row.file_types).filter((type) => allowed.has(type)) };
    }).filter((target) => target.fileTypes.length > 0) };
  }

  changePassword(token, { currentPassword, newPassword }) {
    const user = this.#requireUser(token, { allowPasswordChange: true });
    if (user.oauth) fail('FORBIDDEN');
    validatePassword(newPassword);
    if (typeof currentPassword !== 'string' || currentPassword.length > 1024) fail('INVALID_PASSWORD');
    const result = this.#atomic(() => {
      const row = this.#db.prepare('SELECT password_hash,salt,password_p,failed_logins,locked_until FROM users WHERE id = ?').get(user.id);
      if (row.locked_until > this.#now()) {
        this.#audit(user.id, 'change_password', user.id, 'denied', user.clientId);
        return { denied: true };
      }
      if (!timingSafeEqual(Buffer.from(passwordHash(currentPassword, row.salt, row.password_p), 'hex'), Buffer.from(row.password_hash, 'hex'))) {
        const failures = row.failed_logins + 1;
        this.#db.prepare('UPDATE users SET failed_logins = ?, locked_until = ? WHERE id = ?')
          .run(failures, failures >= MAX_FAILED_LOGINS ? this.#now() + LOCK_MS : 0, user.id);
        this.#audit(user.id, 'change_password', user.id, 'denied', user.clientId);
        return { denied: true };
      }
      if (currentPassword === newPassword) fail('PASSWORD_UNCHANGED');
      const salt = randomBytes(32).toString('hex');
      this.#db.prepare('UPDATE users SET password_hash = ?, salt = ?, password_p = 5, must_change_password = 0, failed_logins = 0, locked_until = 0 WHERE id = ?')
        .run(passwordHash(newPassword, salt), salt, user.id);
      this.#db.prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').run(this.#now(), user.id);
      this.#revokeOAuthUser(user.id);
      this.#audit(user.id, 'change_password', user.id, 'allowed', user.clientId);
      return { reauthenticationRequired: true };
    });
    if (result.denied) fail('INVALID_CREDENTIALS');
    return result;
  }

  resetUserPassword(adminToken, { userId, temporaryPassword }) {
    const admin = this.#requireAdmin(adminToken);
    if (admin.id === userId) fail('USE_CHANGE_PASSWORD');
    validatePassword(temporaryPassword);
    return this.#atomic(() => {
      const user = this.#db.prepare('SELECT active FROM users WHERE id = ?').get(userId);
      if (!user || user.active !== 1) fail('USER_NOT_FOUND');
      const salt = randomBytes(32).toString('hex');
      this.#db.prepare('UPDATE users SET password_hash = ?, salt = ?, password_p = 5, must_change_password = 1, failed_logins = 0, locked_until = 0 WHERE id = ?')
        .run(passwordHash(temporaryPassword, salt), salt, userId);
      this.#db.prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').run(this.#now(), userId);
      this.#revokeOAuthUser(userId);
      this.#audit(admin.id, 'reset_user_password', userId, 'allowed', admin.clientId);
      return { mustChangePassword: true };
    });
  }

  revokeSession(token) {
    const user = this.#requireUser(token, { allowPasswordChange: true });
    if (user.oauth) fail('FORBIDDEN');
    this.#atomic(() => {
      this.#db.prepare('UPDATE sessions SET revoked_at = ? WHERE token_hash = ?').run(this.#now(), digest(token));
      this.#audit(user.id, 'revoke_session', user.clientId, 'allowed');
    });
  }

  revokeClientSessions(token, clientId) {
    const user = this.#requireUser(token, { allowPasswordChange: true });
    if (user.oauth) fail('FORBIDDEN');
    if (!CLIENT_PATTERN.test(clientId ?? '')) fail('INVALID_CLIENT');
    return this.#atomic(() => {
      const result = this.#db.prepare(`
        UPDATE sessions SET revoked_at = ?
        WHERE user_id = ? AND client_id = ? AND revoked_at IS NULL
      `).run(this.#now(), user.id, clientId);
      this.#revokeOAuthUser(user.id, clientId);
      this.#audit(user.id, 'revoke_client_sessions', clientId, 'allowed');
      return { revoked: Number(result.changes) };
    });
  }

  disableUser(adminToken, userId) {
    const admin = this.#requireAdmin(adminToken);
    if (admin.id === userId) fail('CANNOT_DISABLE_SELF');
    return this.#atomic(() => {
      const result = this.#db.prepare('UPDATE users SET active = 0 WHERE id = ? AND active = 1').run(userId);
      if (result.changes !== 1) fail('USER_NOT_FOUND');
      this.#db.prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL')
        .run(this.#now(), userId);
      this.#revokeOAuthUser(userId);
      this.#audit(admin.id, 'disable_user', userId, 'allowed');
    });
  }

  registerConnector(adminToken, { name, endpoint, fileTypes }) {
    const admin = this.#requireAdmin(adminToken);
    if (typeof name !== 'string' || name.trim().length < 2 || name.length > 120) fail('INVALID_CONNECTOR');
    const validatedEndpoint = normalizeEndpoint(endpoint, this.#allowedOrigins);
    validateTypes(fileTypes);
    return this.#atomic(() => {
      const id = randomUUID();
      this.#db.prepare('INSERT INTO connectors(id,name,endpoint,file_types,created_by) VALUES (?,?,?,?,?)')
        .run(id, name.trim(), validatedEndpoint, JSON.stringify(fileTypes), admin.id);
      this.#audit(admin.id, 'register_connector', id, 'allowed');
      return { id, name: name.trim(), endpoint: validatedEndpoint, fileTypes };
    });
  }

  createGroup(adminToken, name) {
    const admin = this.#requireAdmin(adminToken);
    const normalized = typeof name === 'string' ? name.trim().toLowerCase() : '';
    if (!GROUP_PATTERN.test(normalized)) fail('INVALID_GROUP');
    return this.#atomic(() => {
      if (this.#db.prepare('SELECT id FROM groups WHERE name = ?').get(normalized)) fail('GROUP_EXISTS');
      const id = randomUUID();
      this.#db.prepare('INSERT INTO groups VALUES (?, ?)').run(id, normalized);
      this.#audit(admin.id, 'create_group', id, 'allowed');
      return { id, name: normalized };
    });
  }

  addUserToGroup(adminToken, { userId, groupId }) {
    const admin = this.#requireAdmin(adminToken);
    return this.#atomic(() => {
      const user = this.#db.prepare('SELECT active FROM users WHERE id = ?').get(userId);
      const group = this.#db.prepare('SELECT id FROM groups WHERE id = ?').get(groupId);
      if (!user || user.active !== 1 || !group) fail('RESOURCE_NOT_FOUND');
      this.#db.prepare('INSERT OR IGNORE INTO group_members VALUES (?, ?)').run(groupId, userId);
      this.#audit(admin.id, 'add_group_member', JSON.stringify({ groupId, userId }), 'allowed', admin.clientId);
    });
  }

  removeUserFromGroup(adminToken, { userId, groupId }) {
    const admin = this.#requireAdmin(adminToken);
    return this.#atomic(() => {
      this.#db.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ?').run(groupId, userId);
      this.#audit(admin.id, 'remove_group_member', JSON.stringify({ groupId, userId }), 'allowed', admin.clientId);
    });
  }

  grantGroupSubmit(adminToken, { groupId, connectorId, fileTypes }) {
    const admin = this.#requireAdmin(adminToken);
    validateTypes(fileTypes);
    return this.#atomic(() => {
      const group = this.#db.prepare('SELECT id FROM groups WHERE id = ?').get(groupId);
      const connector = this.#db.prepare('SELECT file_types FROM connectors WHERE id = ?').get(connectorId);
      if (!group || !connector) fail('RESOURCE_NOT_FOUND');
      if (!fileTypes.every((type) => JSON.parse(connector.file_types).includes(type))) fail('TYPE_FORBIDDEN');
      this.#db.prepare(`INSERT INTO group_grants(id,group_id,connector_id,action,file_types,active)
        VALUES (?, ?, ?, 'submit', ?, 1)
        ON CONFLICT(group_id,connector_id,action) DO UPDATE SET file_types=excluded.file_types, active=1`)
        .run(randomUUID(), groupId, connectorId, JSON.stringify(fileTypes));
      this.#audit(admin.id, 'grant_group_submit', JSON.stringify({ groupId, connectorId, fileTypes }), 'allowed', admin.clientId);
    });
  }

  revokeGroupSubmit(adminToken, { groupId, connectorId }) {
    const admin = this.#requireAdmin(adminToken);
    return this.#atomic(() => {
      this.#db.prepare(`UPDATE group_grants SET active = 0
        WHERE group_id = ? AND connector_id = ? AND action = 'submit'`).run(groupId, connectorId);
      this.#audit(admin.id, 'revoke_group_submit', JSON.stringify({ groupId, connectorId }), 'allowed', admin.clientId);
    });
  }

  setConnectorEnabled(adminToken, connectorId, enabled) {
    const admin = this.#requireAdmin(adminToken);
    if (typeof enabled !== 'boolean') fail('INVALID_CONNECTOR');
    return this.#atomic(() => {
      const result = this.#db.prepare('UPDATE connectors SET enabled = ? WHERE id = ?').run(Number(enabled), connectorId);
      if (result.changes !== 1) fail('CONNECTOR_NOT_FOUND');
      this.#audit(admin.id, enabled ? 'enable_connector' : 'disable_connector', connectorId, 'allowed');
    });
  }

  grantSubmit(adminToken, { userId, connectorId, fileTypes }) {
    const admin = this.#requireAdmin(adminToken);
    validateTypes(fileTypes);
    return this.#atomic(() => {
      const user = this.#db.prepare('SELECT active FROM users WHERE id = ?').get(userId);
      const connector = this.#db.prepare('SELECT file_types FROM connectors WHERE id = ?').get(connectorId);
      if (!user || user.active !== 1 || !connector) fail('RESOURCE_NOT_FOUND');
      const accepted = JSON.parse(connector.file_types);
      if (!fileTypes.every((type) => accepted.includes(type))) fail('TYPE_FORBIDDEN');
      const id = randomUUID();
      this.#db.prepare(`INSERT INTO grants(id,user_id,connector_id,action,file_types,active)
        VALUES (?, ?, ?, 'submit', ?, 1)
        ON CONFLICT(user_id,connector_id,action) DO UPDATE SET file_types=excluded.file_types, active=1`)
        .run(id, userId, connectorId, JSON.stringify(fileTypes));
      this.#audit(admin.id, 'grant_submit', JSON.stringify({ userId, connectorId, fileTypes }), 'allowed', admin.clientId);
    });
  }

  revokeSubmit(adminToken, { userId, connectorId }) {
    const admin = this.#requireAdmin(adminToken);
    this.#atomic(() => {
      this.#db.prepare("UPDATE grants SET active = 0 WHERE user_id = ? AND connector_id = ? AND action = 'submit'")
        .run(userId, connectorId);
      this.#audit(admin.id, 'revoke_submit', JSON.stringify({ userId, connectorId }), 'allowed', admin.clientId);
    });
  }

  authorizeSubmission(token, { connectorId, fileType }) {
    const user = this.#requireUser(token);
    if (!SUPPORTED_TYPES.has(fileType)) fail('TYPE_FORBIDDEN');
    const connector = this.#db.prepare('SELECT enabled, file_types FROM connectors WHERE id = ?').get(connectorId);
    const direct = this.#db.prepare(`SELECT file_types FROM grants
      WHERE connector_id = ? AND user_id = ? AND action = 'submit' AND active = 1`).all(connectorId, user.id);
    const inherited = this.#db.prepare(`SELECT gg.file_types FROM group_grants gg
      JOIN group_members gm ON gm.group_id = gg.group_id
      WHERE gg.connector_id = ? AND gm.user_id = ? AND gg.action = 'submit' AND gg.active = 1`).all(connectorId, user.id);
    const allowed = connector?.enabled === 1 && JSON.parse(connector.file_types).includes(fileType) &&
      [...direct, ...inherited].some((grant) => JSON.parse(grant.file_types).includes(fileType));
    this.#audit(user.id, 'authorize_submission', connectorId, allowed ? 'allowed' : 'denied', user.clientId);
    if (!allowed) fail('FORBIDDEN');
    return { principalId: user.id, clientId: user.clientId, connectorId, fileType };
  }

  /** Development quarantine: scan workers are local-only and no delivery path is exposed. */
  quarantineFile(token, { connectorId, fileType, idempotencyKey, content }) {
    if (token && typeof token === 'object' && this.#oauthContexts.has(token)) fail('FORBIDDEN');
    if (!this.#quarantineDir) fail('QUARANTINE_UNAVAILABLE');
    if (!Buffer.isBuffer(content) || content.length === 0 || content.length > MAX_FILE_BYTES) fail('INVALID_FILE_SIZE');
    if (typeof idempotencyKey !== 'string' || !/^[A-Za-z0-9_-]{16,128}$/.test(idempotencyKey)) fail('INVALID_IDEMPOTENCY_KEY');
    const principal = this.authorizeSubmission(token, { connectorId, fileType });
    const sha256 = createHash('sha256').update(content).digest('hex');
    return this.#atomic(() => {
      // Authorization is repeated before commit. No async work occurs inside this transaction.
      this.authorizeSubmission(token, { connectorId, fileType });
      const existing = this.#db.prepare('SELECT * FROM quarantined_files WHERE owner_id = ? AND idempotency_key = ?')
        .get(principal.principalId, idempotencyKey);
      if (existing) {
        if (existing.sha256 !== sha256 || existing.connector_id !== connectorId || existing.file_type !== fileType) fail('IDEMPOTENCY_CONFLICT');
        return { id: existing.id, state: existing.state, sha256: existing.sha256, size: existing.size };
      }
      const id = randomUUID();
      const storageKey = randomBytes(32).toString('hex');
      const path = join(this.#quarantineDir, storageKey);
      let created = false;
      try {
        const fd = openSync(path, 'wx', 0o600);
        created = true;
        try { writeFileSync(fd, content); } finally { closeSync(fd); }
        this.#db.prepare('INSERT INTO quarantined_files VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
          .run(id, principal.principalId, connectorId, fileType, sha256, content.length, storageKey, idempotencyKey, 'quarantined', this.#now());
        this.#audit(principal.principalId, 'quarantine_file', id, 'allowed', principal.clientId);
        return { id, state: 'quarantined', sha256, size: content.length };
      } catch (error) {
        if (created) { try { unlinkSync(path); } catch {} }
        throw error;
      }
    });
  }

  getQuarantinedFileStatus(token, id) {
    const user = this.#requireUser(token);
    if (!this.#quarantineDir) fail('QUARANTINE_UNAVAILABLE');
    const row = this.#db.prepare('SELECT * FROM quarantined_files WHERE id = ? AND owner_id = ?').get(id, user.id);
    if (!row) fail('RESOURCE_NOT_FOUND');
    let intact = false;
    try { this.#readQuarantinedContent(row); intact = true; } catch { /* Integrity is mandatory. */ }
    const review = this.#db.prepare(`SELECT r.state, r.reason, r.policy_version, r.engine_version,
      f.inspector_version, f.verdict AS format_verdict, f.reason AS format_reason
      FROM file_reviews r LEFT JOIN file_format_checks f ON f.review_id = r.id
      WHERE r.file_id = ? ORDER BY r.rowid DESC LIMIT 1`).get(id);
    return { id: row.id, state: row.state, sha256: row.sha256, size: row.size,
      integrity: intact ? 'intact' : 'failed', review: review ?? null };
  }

  #readQuarantinedContent(row) {
    if (!this.#quarantineDir) fail('QUARANTINE_UNAVAILABLE');
    const path = join(this.#quarantineDir, row.storage_key);
    let fd;
    try {
      if (!lstatSync(path).isFile()) fail('FILE_INTEGRITY_FAILED');
      fd = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      const info = fstatSync(fd);
      if (!info.isFile() || info.size !== row.size || info.size > MAX_FILE_BYTES) fail('FILE_INTEGRITY_FAILED');
      // Read at most the expected size plus one byte; a concurrent file expansion cannot exhaust memory.
      const content = Buffer.alloc(row.size + 1);
      let bytes = 0;
      while (bytes < content.length) {
        const n = readSync(fd, content, bytes, content.length - bytes, null);
        if (n === 0) break;
        bytes += n;
      }
      if (bytes !== row.size || createHash('sha256').update(content.subarray(0, bytes)).digest('hex') !== row.sha256) {
        fail('FILE_INTEGRITY_FAILED');
      }
      return content.subarray(0, bytes);
    } catch { fail('FILE_INTEGRITY_FAILED'); }
    finally { if (fd !== undefined) closeSync(fd); }
  }

  /** Trusted local worker entry point. No HTTP endpoint accepts or overrides scan results. */
  async scanQuarantinedFile(id) {
    const snapshot = this.#atomic(() => {
      const file = this.#db.prepare('SELECT * FROM quarantined_files WHERE id = ?').get(id);
      if (!file) fail('RESOURCE_NOT_FOUND');
      const previous = this.#db.prepare('SELECT * FROM file_reviews WHERE file_id = ? ORDER BY rowid DESC LIMIT 1').get(id);
      if (file.state === 'scanning') {
        if (previous && this.#now() - previous.started_at < 60_000) fail('SCAN_IN_PROGRESS');
        if (previous) this.#db.prepare("UPDATE file_reviews SET state = 'scan_failed', reason = 'SCAN_LEASE_EXPIRED', finished_at = ? WHERE id = ?")
          .run(this.#now(), previous.id);
      } else if (!['quarantined', 'scan_failed', 'review_required'].includes(file.state)) fail('SCAN_STATE_INVALID');
      const reviewId = randomUUID();
      this.#db.prepare('INSERT INTO file_reviews VALUES (?, ?, ?, ?, ?, ?, NULL, ?, NULL)')
        .run(reviewId, id, file.sha256, 'v2-antivirus-format', 'scanning', 'SCAN_STARTED', this.#now());
      this.#db.prepare("UPDATE quarantined_files SET state = 'scanning' WHERE id = ?").run(id);
      this.#audit(null, 'file_scan_started', id, 'scanning', 'local-scan-worker');
      return { file, reviewId };
    });
    let result;
    let formatResult;
    let failure;
    let timer;
    try {
      const content = this.#readQuarantinedContent(snapshot.file);
      formatResult = await inspectFileFormat(content, snapshot.file.file_type);
      if (formatResult.verdict !== 'rejected') {
        if (!this.#scanner || typeof this.#scanner.scan !== 'function') fail('SCANNER_UNAVAILABLE');
        result = await Promise.race([
          Promise.resolve().then(() => this.#scanner.scan(content)),
          new Promise((_, reject) => { timer = setTimeout(() => reject(new GatewayError('SCANNER_TIMEOUT')), this.#scanTimeoutMs); }),
        ]);
      }
    } catch (error) {
      const known = ['FILE_INTEGRITY_FAILED', 'SCANNER_UNAVAILABLE', 'SCANNER_TIMEOUT', 'SCANNER_INVALID_REPLY',
        'SCANNER_INCOMPATIBLE', 'SCANNER_SCAN_ERROR'];
      failure = known.includes(error?.code) ? error.code : 'SCANNER_SCAN_ERROR';
    } finally { clearTimeout(timer); }
    return this.#atomic(() => {
      const latest = this.#db.prepare('SELECT id FROM file_reviews WHERE file_id = ? ORDER BY rowid DESC LIMIT 1').get(id);
      if (latest?.id !== snapshot.reviewId) fail('SCAN_SUPERSEDED');
      try { this.#readQuarantinedContent(snapshot.file); } catch { failure = 'FILE_INTEGRITY_FAILED'; }
      let state = 'scan_failed';
      let reason = failure ?? 'SCANNER_INVALID_REPLY';
      let engineVersion = null;
      if (failure === 'FILE_INTEGRITY_FAILED') state = 'isolated';
      if (!failure && formatResult?.verdict === 'rejected') { state = 'rejected'; reason = formatResult.reason; }
      if (!failure && typeof result?.engineVersion === 'string' && result.engineVersion.length > 0 && result.engineVersion.length <= 512) {
        engineVersion = result.engineVersion;
        if (result.verdict === 'infected') { state = 'isolated'; reason = 'MALWARE_DETECTED'; }
        if (result.verdict === 'clean') {
          state = 'review_required';
          reason = formatResult?.verdict === 'inspected' ? 'ENTERPRISE_POLICY_REQUIRED' : (formatResult?.reason ?? 'FORMAT_CHECK_REQUIRED');
        }
      }
      if (formatResult) this.#db.prepare('INSERT INTO file_format_checks VALUES (?, ?, ?, ?)')
        .run(snapshot.reviewId, formatResult.inspectorVersion, formatResult.verdict, formatResult.reason);
      this.#db.prepare('UPDATE file_reviews SET state = ?, reason = ?, engine_version = ?, finished_at = ? WHERE id = ?')
        .run(state, reason, engineVersion, this.#now(), snapshot.reviewId);
      this.#db.prepare('UPDATE quarantined_files SET state = ? WHERE id = ?').run(state, id);
      this.#audit(null, 'file_scan_finished', id, state, 'local-scan-worker');
      return { id, state, reason };
    });
  }

  auditForAdmin(adminToken) {
    this.#requireAdmin(adminToken);
    return this.#db.prepare(`SELECT at,actor_id,client_id,action,resource_id,result FROM (
      SELECT rowid AS position,at,actor_id,client_id,action,resource_id,result FROM audit_events ORDER BY rowid DESC LIMIT 500
    ) ORDER BY position`).all();
  }
}
