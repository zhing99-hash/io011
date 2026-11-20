import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';
import { RequestLimiter } from './rate-limit.js';

export const equal = (left, right) => typeof left === 'string' && typeof right === 'string' &&
  Buffer.byteLength(left) === Buffer.byteLength(right) && timingSafeEqual(Buffer.from(left), Buffer.from(right));

/** Signed, expiring HttpOnly cookies and session-bound form CSRF. */
export class BrowserSecurity {
  constructor(keys, { now = () => Date.now() } = {}) { this.keys = keys; this.now = now; this.limiter = new RequestLimiter({ now }); }
  sign(key, text) { return createHmac('sha256', key).update(text).digest('hex'); }
  cookie(req, name) {
    const matches = (req.headers.cookie ?? '').split(';').map((value) => value.trim()).filter((value) => value.startsWith(name + '='));
    return matches.length === 1 ? matches[0].slice(name.length + 1) : undefined;
  }
  read(req, name) {
    const value = this.cookie(req, name);
    if (!value || value.length > 2048) return undefined;
    const parts = value.split('.');
    if (parts.length !== 2 || !this.keys.some((key) => equal(parts[1], this.sign(key, name + ':' + parts[0])))) return undefined;
    try {
      const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
      return Number.isSafeInteger(payload.expiresAt) && payload.expiresAt > this.now() ? { value, payload } : undefined;
    } catch { return undefined; }
  }
  set(res, name, data, maxAgeMs) {
    const payload = { ...data, nonce: randomBytes(16).toString('hex'), expiresAt: this.now() + maxAgeMs };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const value = encoded + '.' + this.sign(this.keys[0], name + ':' + encoded);
    this.append(res, `${name}=${value}; Path=/; Max-Age=${Math.floor(maxAgeMs / 1000)}; Secure; HttpOnly; SameSite=Lax`);
    return { value, payload };
  }
  append(res, cookie) {
    const previous = res.getHeader('Set-Cookie');
    res.setHeader('Set-Cookie', [...(Array.isArray(previous) ? previous : previous ? [previous] : []), cookie]);
  }
  clear(res, name) { this.append(res, `${name}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax`); }
  csrf(value, purpose) { return this.sign(this.keys[0], 'csrf:' + purpose + ':' + value); }
  checkCsrf(value, purpose, token) { return this.keys.some((key) => equal(token, this.sign(key, 'csrf:' + purpose + ':' + value))); }
  allowPassword(req, res, username) {
    const account = typeof username === 'string' ? username.trim().toLowerCase() : '';
    const source = this.limiter.consume('source:' + (req.socket.remoteAddress ?? 'unknown'), { limit: 10, windowMs: 60000 });
    const user = this.limiter.consume('account:' + this.sign(this.keys[0], account), { limit: 5, windowMs: 900000 });
    if (source.allowed && user.allowed) return true;
    res.setHeader('Retry-After', String(Math.max(source.retryAfter ?? 0, user.retryAfter ?? 0)));
    return false;
  }
}
