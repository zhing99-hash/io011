import test from 'node:test';
import assert from 'node:assert/strict';
import { BrowserSecurity } from '../src/browser-security.js';

test('signed browser cookies expire server-side, reject duplicate cookies and bind CSRF to session and action', () => {
  let now = 100000;
  const security = new BrowserSecurity(['new key', 'old key'], { now: () => now });
  const headers = new Map();
  const response = { getHeader: (name) => headers.get(name), setHeader: (name, value) => headers.set(name, value) };
  const first = security.set(response, '__Host-test', { token: 'opaque-session' }, 60000);
  const req = { headers: { cookie: '__Host-test=' + first.value } };
  assert.equal(security.read(req, '__Host-test').payload.token, 'opaque-session');
  assert.match(headers.get('Set-Cookie')[0], /Path=\/; Max-Age=60; Secure; HttpOnly; SameSite=Lax/);
  assert.equal(security.read({ headers: { cookie: '__Host-test=' + first.value + 'x' } }, '__Host-test'), undefined);
  assert.equal(security.read({ headers: { cookie: req.headers.cookie + '; ' + req.headers.cookie } }, '__Host-test'), undefined);
  assert.equal(security.read({ headers: { cookie: '__Host-other=' + first.value } }, '__Host-other'), undefined);
  const csrf = security.csrf(first.value, '/password');
  assert.ok(security.checkCsrf(first.value, '/password', csrf));
  assert.equal(security.checkCsrf(first.value, '/revoke', csrf), false);
  const second = security.set(response, '__Host-test', {}, 60000);
  assert.equal(security.checkCsrf(second.value, '/password', csrf), false);
  const rotated = new BrowserSecurity(['next key', 'new key'], { now: () => now });
  assert.ok(rotated.read(req, '__Host-test'));
  assert.ok(rotated.checkCsrf(first.value, '/password', csrf));
  now += 60000;
  assert.equal(security.read(req, '__Host-test'), undefined);
});

test('browser login and password actions share normalized account limits across source addresses', () => {
  const security = new BrowserSecurity(['test key']);
  const headers = new Map();
  const response = { setHeader: (name, value) => headers.set(name, value) };
  for (let i = 0; i < 5; i++) assert.equal(security.allowPassword({ socket: { remoteAddress: '127.0.0.' + (i + 1) } }, response, i % 2 ? ' Alice ' : 'alice'), true);
  assert.equal(security.allowPassword({ socket: { remoteAddress: '127.0.0.99' } }, response, 'ALICE'), false);
  assert.ok(Number(headers.get('Retry-After')) > 0);
  assert.equal(security.allowPassword({ socket: { remoteAddress: '127.0.0.99' } }, response, 'bob'), true);
});
