import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { scryptSync } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Gateway } from '../src/gateway.js';

test('legacy prototype database upgrades without losing accounts, audits or connectors', () => {
  const root = mkdtempSync(join(tmpdir(), 'gateway-upgrade-'));
  const filename = join(root, 'gateway.sqlite');
  const db = new DatabaseSync(filename);
  const password = 'Legacy prototype password 123!';
  const salt = '12'.repeat(32);
  const hash = scryptSync(password, Buffer.from(salt, 'hex'), 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  db.exec(`
    CREATE TABLE users(id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
      salt TEXT NOT NULL, role TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1,
      failed_logins INTEGER NOT NULL DEFAULT 0, locked_until INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE connectors(id TEXT PRIMARY KEY, name TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1,
      file_types TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id));
    CREATE TABLE audit_events(id TEXT PRIMARY KEY, at INTEGER NOT NULL, actor_id TEXT,
      action TEXT NOT NULL, resource_id TEXT, result TEXT NOT NULL);
  `);
  db.prepare('INSERT INTO users(id,username,password_hash,salt,role) VALUES (?,?,?,?,?)').run('old-admin', 'admin', hash, salt, 'admin');
  db.prepare('INSERT INTO connectors VALUES (?, ?, 1, ?, ?)').run('old-target', 'Legacy target', '["pdf"]', 'old-admin');
  db.prepare('INSERT INTO audit_events VALUES (?, ?, ?, ?, ?, ?)').run('old-audit', 1, 'old-admin', 'old_action', null, 'allowed');
  db.close();
  let gateway;
  try {
    gateway = new Gateway({ filename });
    const login = gateway.login({ username: 'admin', password, clientId: 'codex' });
    assert.equal(login.user.id, 'old-admin');
    assert.equal(gateway.auditForAdmin(login.token).some((event) => event.action === 'old_action'), true);
    gateway.close(); gateway = undefined;
    const upgraded = new DatabaseSync(filename);
    try {
      assert.equal(upgraded.prepare('PRAGMA user_version').get().user_version, 2);
      assert.equal(upgraded.prepare('SELECT password_p FROM users').get().password_p, 5);
      assert.equal(upgraded.prepare('SELECT enabled FROM connectors WHERE id = ?').get('old-target').enabled, 0);
      assert.equal(upgraded.prepare('SELECT client_id FROM audit_events WHERE action = ?').get('login').client_id, 'codex');
    } finally { upgraded.close(); }
    gateway = new Gateway({ filename }); // Upgrade is repeatable.
    assert.equal(gateway.login({ username: 'admin', password, clientId: 'codex' }).user.id, 'old-admin');
  } finally { gateway?.close(); rmSync(root, { recursive: true, force: true }); }
});

test('newer database schema is refused without changing its version', () => {
  const root = mkdtempSync(join(tmpdir(), 'gateway-future-'));
  const filename = join(root, 'gateway.sqlite');
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA user_version = 99'); db.close();
  try {
    assert.throws(() => new Gateway({ filename }), { code: 'DATABASE_VERSION_UNSUPPORTED' });
    const check = new DatabaseSync(filename);
    try { assert.equal(check.prepare('PRAGMA user_version').get().user_version, 99); } finally { check.close(); }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
