/** Bounded, in-process fixed-window limits for a single server instance. */
export class RequestLimiter {
  #entries = new Map();
  #now;
  #maxKeys;
  constructor({ now = () => Date.now(), maxKeys = 10_000 } = {}) {
    if (!Number.isInteger(maxKeys) || maxKeys < 1) throw new Error('INVALID_RATE_LIMIT_CONFIG');
    this.#now = now;
    this.#maxKeys = maxKeys;
  }
  consume(key, { limit, windowMs }) {
    if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(windowMs) || windowMs < 1) throw new Error('INVALID_RATE_LIMIT_CONFIG');
    const now = this.#now();
    let entry = this.#entries.get(key);
    if (entry && entry.until <= now) { this.#entries.delete(key); entry = undefined; }
    if (!entry) {
      if (this.#entries.size >= this.#maxKeys) {
        for (const [id, item] of this.#entries) if (item.until <= now) this.#entries.delete(id);
        if (this.#entries.size >= this.#maxKeys) return { allowed: false, retryAfter: Math.ceil(windowMs / 1000) };
      }
      entry = { count: 0, until: now + windowMs };
      this.#entries.set(key, entry);
    }
    if (entry.count >= limit) return { allowed: false, retryAfter: Math.max(1, Math.ceil((entry.until - now) / 1000)) };
    entry.count++;
    return { allowed: true };
  }
}
