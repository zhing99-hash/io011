import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Readable } from 'node:stream';
import { resolveOutboundEndpoint, sendOutboundJson } from '../src/outbound.js';

const endpoint = 'https://workflow.example.test/v1/receive';
const allowedOrigins = ['https://workflow.example.test'];
const allowedCidrs = ['203.0.113.0/24'];
const dnsLookup = async () => [{ address: '203.0.113.10', family: 4 }];

test('outbound destination requires exact HTTPS origin and an approved resolved IP', async () => {
  const base = { allowedOrigins, allowedCidrs, dnsLookup };
  assert.equal((await resolveOutboundEndpoint(endpoint, base)).address, '203.0.113.10');
  for (const value of [
    'http://workflow.example.test/v1/receive',
    'https://workflow.example.test.evil.test/v1/receive',
    'https://workflow.example.test@evil.test/v1/receive',
    'https://workflow.example.test/v1/receive?to=evil',
    'https://workflow.example.test/v1/receive#fragment',
  ]) {
    await assert.rejects(resolveOutboundEndpoint(value, base), { code: 'ENDPOINT_NOT_ALLOWED' });
  }
  await assert.rejects(resolveOutboundEndpoint(endpoint, { ...base, dnsLookup: async () => [{ address: '127.0.0.1', family: 4 }] }), { code: 'ADDRESS_NOT_ALLOWED' });
  await assert.rejects(resolveOutboundEndpoint(endpoint, { ...base, dnsLookup: async () => [{ address: '169.254.169.254', family: 4 }] }), { code: 'ADDRESS_NOT_ALLOWED' });
  await assert.rejects(resolveOutboundEndpoint(endpoint, { ...base, dnsLookup: async () => { throw new Error('dns'); } }), { code: 'DNS_FAILED' });
  await assert.rejects(resolveOutboundEndpoint('https://127.0.0.1/test', { ...base, allowedOrigins: ['https://127.0.0.1'] }), { code: 'ENDPOINT_NOT_ALLOWED' });
});

function fakeRequest(status, capture) {
  return (options, callback) => {
    capture.options = options;
    const request = new EventEmitter();
    request.setTimeout = (ms) => { capture.timeout = ms; };
    request.end = (body) => {
      capture.body = body;
      queueMicrotask(() => {
        const response = Readable.from(['{"ok":true}']);
        response.statusCode = status;
        callback(response);
      });
    };
    return request;
  };
}

test('HTTPS request pins the checked IP and rejects redirects', async () => {
  const capture = {};
  const options = { allowedOrigins, allowedCidrs, dnsLookup, requestImpl: fakeRequest(200, capture), bearerToken: 'service-token' };
  const result = await sendOutboundJson(endpoint, { task: 'example' }, options);
  assert.equal(result.status, 200);
  assert.equal(capture.options.hostname, 'workflow.example.test');
  assert.equal(capture.options.servername, 'workflow.example.test');
  assert.equal(capture.options.rejectUnauthorized, true);
  assert.equal(capture.options.agent, false);
  assert.equal(capture.options.headers.authorization, 'Bearer service-token');
  assert.equal(capture.body, '{"task":"example"}');
  await new Promise((resolve) => capture.options.lookup('workflow.example.test', {}, (error, address, family) => {
    assert.equal(error, null);
    assert.equal(address, '203.0.113.10');
    assert.equal(family, 4);
    resolve();
  }));
  await assert.rejects(sendOutboundJson(endpoint, {}, { ...options, requestImpl: fakeRequest(302, {}) }), { code: 'REDIRECT_BLOCKED' });
});

test('blocked address fails before opening a socket', async () => {
  let attempted = false;
  await assert.rejects(sendOutboundJson(endpoint, {}, {
    allowedOrigins, allowedCidrs,
    dnsLookup: async () => [{ address: '10.0.0.1', family: 4 }],
    requestImpl: () => { attempted = true; },
  }), { code: 'ADDRESS_NOT_ALLOWED' });
  assert.equal(attempted, false);
});

test('DNS timeout fails without sending and late DNS resolution cannot initiate a request', async () => {
  let attempted = false;
  let finishLookup;
  const lookup = new Promise((resolve) => { finishLookup = resolve; });
  await assert.rejects(sendOutboundJson(endpoint, {}, {
    allowedOrigins, allowedCidrs, timeoutMs: 10,
    dnsLookup: () => lookup,
    requestImpl: () => { attempted = true; },
  }), { code: 'DNS_TIMEOUT' });
  finishLookup([{ address: '203.0.113.10', family: 4 }]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(attempted, false);
});

test('credential header injection and oversize upstream responses fail closed', async () => {
  const options = { allowedOrigins, allowedCidrs, dnsLookup, requestImpl: fakeRequest(200, {}) };
  await assert.rejects(sendOutboundJson(endpoint, {}, { ...options, bearerToken: 'token\r\nx-other: injected' }), { code: 'INVALID_CREDENTIAL' });
  const oversized = (requestOptions, callback) => {
    const req = new EventEmitter();
    req.end = () => queueMicrotask(() => {
      const response = Readable.from([Buffer.alloc(256 * 1024 + 1)]);
      response.statusCode = 200;
      callback(response);
    });
    return req;
  };
  await assert.rejects(sendOutboundJson(endpoint, {}, { ...options, requestImpl: oversized }), { code: 'RESPONSE_TOO_LARGE' });
});
