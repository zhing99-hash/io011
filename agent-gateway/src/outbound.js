import { lookup as systemLookup } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { BlockList, isIP } from 'node:net';

export class OutboundPolicyError extends Error {
  constructor(code) {
    super(code);
    this.name = 'OutboundPolicyError';
    this.code = code;
  }
}

const deny = (code) => { throw new OutboundPolicyError(code); };

function endpointUrl(endpoint, allowedOrigins) {
  if (typeof endpoint !== 'string' || /[\u0000-\u0020\u007f]/.test(endpoint)) deny('INVALID_ENDPOINT');
  let url;
  try { url = new URL(endpoint); } catch { deny('INVALID_ENDPOINT'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash ||
      isIP(url.hostname.replace(/^\[|\]$/g, '')) || !allowedOrigins.has(url.origin)) deny('ENDPOINT_NOT_ALLOWED');
  return url;
}

function addressPolicy(cidrs) {
  if (!Array.isArray(cidrs)) deny('INVALID_CIDR_POLICY');
  const block = new BlockList();
  for (const cidr of cidrs) {
    const match = typeof cidr === 'string' && /^([^/]+)\/(\d{1,3})$/.exec(cidr);
    const family = match ? isIP(match[1]) : 0;
    const prefix = match ? Number(match[2]) : -1;
    if (!family || prefix < 0 || prefix > (family === 4 ? 32 : 128)) deny('INVALID_CIDR_POLICY');
    block.addSubnet(match[1], prefix, family === 4 ? 'ipv4' : 'ipv6');
  }
  return block;
}

/** Resolve and choose an explicitly allowed address. The caller must use the pinned lookup. */
export async function resolveOutboundEndpoint(endpoint, {
  allowedOrigins = [], allowedCidrs = [], dnsLookup = systemLookup,
} = {}) {
  const origins = new Set(allowedOrigins.map((value) => {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
      deny('INVALID_ORIGIN_POLICY');
    }
    return url.origin;
  }));
  const url = endpointUrl(endpoint, origins);
  const block = addressPolicy(allowedCidrs);
  let records;
  try { records = await dnsLookup(url.hostname, { all: true, verbatim: true }); }
  catch { deny('DNS_FAILED'); }
  if (!Array.isArray(records)) deny('DNS_FAILED');
  const selected = records.find(({ address, family }) => {
    const actual = isIP(address);
    return actual !== 0 && actual === family && block.check(address, family === 4 ? 'ipv4' : 'ipv6');
  });
  if (!selected) deny('ADDRESS_NOT_ALLOWED');
  return { url, address: selected.address, family: selected.family };
}

/**
 * Sends a small JSON payload to a trusted registered endpoint. Authorization,
 * file scanning and durable delivery are separate responsibilities.
 */
export async function sendOutboundJson(endpoint, payload, {
  allowedOrigins = [], allowedCidrs = [], dnsLookup = systemLookup,
  requestImpl = httpsRequest, bearerToken, timeoutMs = 5000,
} = {}) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) deny('INVALID_TIMEOUT');
  let body;
  try { body = JSON.stringify(payload); } catch { deny('INVALID_PAYLOAD'); }
  if (typeof body !== 'string' || Buffer.byteLength(body) > 1024 * 1024) deny('PAYLOAD_TOO_LARGE');
  if (bearerToken !== undefined && (typeof bearerToken !== 'string' || !/^[\x21-\x7e]+$/.test(bearerToken))) deny('INVALID_CREDENTIAL');
  let dnsTimer;
  let destination;
  try {
    destination = await Promise.race([
      resolveOutboundEndpoint(endpoint, { allowedOrigins, allowedCidrs, dnsLookup }),
      new Promise((_, reject) => { dnsTimer = setTimeout(() => reject(new OutboundPolicyError('DNS_TIMEOUT')), timeoutMs); }),
    ]);
  } finally { clearTimeout(dnsTimer); }
  const { url, address, family } = destination;
  const headers = { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) };
  if (bearerToken) headers.authorization = `Bearer ${bearerToken}`;

  return new Promise((resolve, reject) => {
    let request;
    let deadline;
    const finish = (callback, value) => {
      clearTimeout(deadline);
      callback(value);
    };
    try {
      request = requestImpl({
        protocol: 'https:', hostname: url.hostname, port: url.port || 443, family,
        method: 'POST', path: url.pathname, headers, agent: false,
        servername: url.hostname, rejectUnauthorized: true,
        lookup: (_hostname, _options, callback) => callback(null, address, family),
      }, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400) {
          response.destroy();
          finish(reject, new OutboundPolicyError('REDIRECT_BLOCKED'));
          return;
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          response.destroy();
          finish(reject, new OutboundPolicyError('UPSTREAM_HTTP_ERROR'));
          return;
        }
        let size = 0;
        const chunks = [];
        response.on('data', (part) => {
          const chunk = Buffer.isBuffer(part) ? part : Buffer.from(part);
          size += chunk.length;
          if (size > 256 * 1024) {
            response.destroy(new OutboundPolicyError('RESPONSE_TOO_LARGE'));
            return;
          }
          chunks.push(chunk);
        });
        response.on('error', (error) => finish(reject, error));
        response.on('aborted', () => finish(reject, new OutboundPolicyError('UPSTREAM_ABORTED')));
        response.on('end', () => finish(resolve, { status: response.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
      });
    } catch (error) { reject(error); return; }
    request.on('error', (error) => finish(reject, error));
    deadline = setTimeout(() => request.destroy(new OutboundPolicyError('UPSTREAM_TIMEOUT')), timeoutMs);
    request.end(body);
  });
}
