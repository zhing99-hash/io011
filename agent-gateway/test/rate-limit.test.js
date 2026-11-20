import test from 'node:test';
import assert from 'node:assert/strict';
import { RequestLimiter } from '../src/rate-limit.js';

test('rate limiter bounds memory and fails closed until its window expires', () => {
  let now = 1000;
  const limiter = new RequestLimiter({ now: () => now, maxKeys: 2 });
  const policy = { limit: 1, windowMs: 1000 };
  assert.equal(limiter.consume('a', policy).allowed, true);
  assert.equal(limiter.consume('a', policy).allowed, false);
  assert.equal(limiter.consume('b', policy).allowed, true);
  assert.equal(limiter.consume('c', policy).allowed, false);
  now += 1001;
  assert.equal(limiter.consume('c', policy).allowed, true);
});
