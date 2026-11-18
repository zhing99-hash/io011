import { randomUUID, createHash } from 'node:crypto';
import { GatewayError } from './gateway.js';
import { RequestLimiter } from './rate-limit.js';
import { handleMcpRequest } from './mcp.js';

function statusFor(code) {
  if (code === 'AUTH_REQUIRED' || code === 'INVALID_CREDENTIALS') return 401;
  if (['FORBIDDEN', 'TYPE_FORBIDDEN', 'PASSWORD_CHANGE_REQUIRED'].includes(code)) return 403;
  if (['RESOURCE_NOT_FOUND', 'CONNECTOR_NOT_FOUND', 'USER_NOT_FOUND'].includes(code)) return 404;
  if (['USERNAME_EXISTS', 'GROUP_EXISTS', 'ALREADY_BOOTSTRAPPED', 'IDEMPOTENCY_CONFLICT'].includes(code)) return 409;
  if (['BODY_TOO_LARGE', 'INVALID_FILE_SIZE'].includes(code)) return 413;
  return 400;
}

async function readBody(req, limit, type) {
  const mediaType = (req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
  if (mediaType !== type) throw new GatewayError(type === 'application/json' ? 'JSON_REQUIRED' : 'BINARY_REQUIRED');
  if (req.headers['content-length'] && Number(req.headers['content-length']) > limit) throw new GatewayError('BODY_TOO_LARGE');
  const parts = [];
  let size = 0;
  for await (const part of req) {
    size += part.length;
    if (size > limit) throw new GatewayError('BODY_TOO_LARGE');
    parts.push(part);
  }
  return Buffer.concat(parts);
}

async function readJson(req, fields) {
  const bytes = await readBody(req, 16 * 1024, 'application/json');
  let value;
  try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new GatewayError('INVALID_JSON'); }
  if (!value || Array.isArray(value) || typeof value !== 'object') throw new GatewayError('INVALID_JSON');
  if (Object.keys(value).some((key) => !fields.includes(key))) throw new GatewayError('UNKNOWN_FIELD');
  for (const field of fields) {
    if (field === 'role' && value[field] === undefined) continue;
    const valid = field === 'fileTypes' ? Array.isArray(value[field])
      : field === 'enabled' ? typeof value[field] === 'boolean'
        : typeof value[field] === 'string';
    if (!valid) throw new GatewayError('INVALID_FIELDS');
  }
  return value;
}

function bearerToken(req) {
  const header = req.headers.authorization;
  const match = typeof header === 'string' && /^Bearer ([A-Za-z0-9._~+\/-]{32,2048})$/.exec(header);
  if (!match) throw new GatewayError('AUTH_REQUIRED');
  return match[1];
}

export function createApiHandler(gateway, {
  secure = false, expectedAuthority = () => null, allowedOrigin = () => null,
  rateLimits = {}, now = () => Date.now(), oauth,
} = {}) {
  const limits = {
    requests: { limit: 120, windowMs: 60_000 },
    loginSource: { limit: 10, windowMs: 60_000 },
    loginAccount: { limit: 5, windowMs: 15 * 60_000 }, ...rateLimits,
  };
  for (const value of Object.values(limits)) {
    if (!Number.isInteger(value.limit) || value.limit < 1 || !Number.isInteger(value.windowMs) || value.windowMs < 1) {
      throw new Error('INVALID_RATE_LIMIT_CONFIG');
    }
  }
  const limiter = new RequestLimiter({ now });
  const routes = {
    'POST /v1/admin/users': [['username', 'password', 'role'], (token, body) => gateway.createUser(token, body), 201],
    'POST /v1/admin/groups': [['name'], (token, body) => gateway.createGroup(token, body.name), 201],
    'POST /v1/admin/group-members': [['userId', 'groupId'], (token, body) => gateway.addUserToGroup(token, body)],
    'POST /v1/admin/group-members/remove': [['userId', 'groupId'], (token, body) => gateway.removeUserFromGroup(token, body)],
    'POST /v1/admin/connectors': [['name', 'endpoint', 'fileTypes'], (token, body) => gateway.registerConnector(token, body), 201],
    'POST /v1/admin/connectors/state': [['connectorId', 'enabled'], (token, body) => gateway.setConnectorEnabled(token, body.connectorId, body.enabled)],
    'POST /v1/admin/grants': [['userId', 'connectorId', 'fileTypes'], (token, body) => gateway.grantSubmit(token, body)],
    'POST /v1/admin/grants/revoke': [['userId', 'connectorId'], (token, body) => gateway.revokeSubmit(token, body)],
    'POST /v1/admin/group-grants': [['groupId', 'connectorId', 'fileTypes'], (token, body) => gateway.grantGroupSubmit(token, body)],
    'POST /v1/admin/group-grants/revoke': [['groupId', 'connectorId'], (token, body) => gateway.revokeGroupSubmit(token, body)],
    'POST /v1/admin/users/disable': [['userId'], (token, body) => gateway.disableUser(token, body.userId)],
    'POST /v1/admin/users/reset-password': [['userId', 'temporaryPassword'], (token, body) => gateway.resetUserPassword(token, body)],
    'POST /v1/password/change': [['currentPassword', 'newPassword'], (token, body) => gateway.changePassword(token, body)],
    'POST /v1/revoke-client': [['clientId'], (token, body) => gateway.revokeClientSessions(token, body.clientId)],
    'POST /v1/authorize/submission': [['connectorId', 'fileType'], (token, body) => gateway.authorizeSubmission(token, body)],
    'POST /v1/dev/quarantine/status': [['id'], (token, body) => gateway.getQuarantinedFileStatus(token, body.id)],
    'POST /v1/files/status': [['id'], (token, body) => gateway.getQuarantinedFileStatus(token, body.id)],
  };
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Request-ID', randomUUID());
    if (secure) res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    const reply = (status, value) => {
      if (!req.complete) res.setHeader('Connection', 'close');
      res.statusCode = status; res.end(JSON.stringify(value));
    };
    const allow = (key, policy) => {
      const decision = limiter.consume(key, policy);
      if (decision.allowed) return true;
      res.setHeader('Retry-After', String(decision.retryAfter));
      reply(429, { error: 'RATE_LIMITED' }); return false;
    };
    try {
      const authority = expectedAuthority();
      if (authority && (req.headers.host ?? '').toLowerCase() !== authority.toLowerCase()) {
        reply(421, { error: 'HOST_NOT_ALLOWED' }); return;
      }
      if (req.headers.origin && req.headers.origin !== allowedOrigin()) { reply(403, { error: 'ORIGIN_NOT_ALLOWED' }); return; }
      // Proxy headers are not trusted. Add an explicit trusted-proxy policy before using a reverse proxy.
      const source = req.socket.remoteAddress ?? 'unknown';
      if (!allow('request:' + source, limits.requests)) return;
      const pathname = new URL(req.url, allowedOrigin() || 'http://127.0.0.1').pathname;
      if (oauth?.matches(pathname)) { await oauth.handle(req, res); return; }
      const route = `${req.method} ${req.url}`;
      if (route === 'POST /v1/login') {
        if (!allow('login-source:' + source, limits.loginSource)) return;
        const body = await readJson(req, ['username', 'password', 'clientId']);
        const account = typeof body.username === 'string' ? body.username.trim().toLowerCase() : '';
        if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(account)) throw new GatewayError('INVALID_USERNAME');
        const key = createHash('sha256').update(account).digest('hex');
        if (!allow('login-account:' + key, limits.loginAccount)) return;
        reply(200, gateway.login(body)); return;
      }
      const token = bearerToken(req);
      if (req.url === '/mcp') {
        let context = token;
        try { gateway.assertSession(context); }
        catch (error) {
          if (!oauth || error.code !== 'AUTH_REQUIRED') throw error;
          context = await oauth.resolveToken(token);
        }
        if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); reply(405, { error: 'METHOD_NOT_ALLOWED' }); return; }
        const raw = await readBody(req, 16 * 1024, 'application/json');
        let body;
        try { body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(raw)); }
        catch { throw new GatewayError('INVALID_JSON'); }
        if (body?.method === 'subscriptions/listen') { reply(405, { error: 'SUBSCRIPTIONS_UNAVAILABLE' }); return; }
        await handleMcpRequest(gateway, context, req, res, body);
      }
      else if (route === 'GET /v1/me') reply(200, gateway.profile(token));
      else if (req.method === 'GET' && pathname === '/v1/connections') {
        const params = new URL(req.url, allowedOrigin() || 'http://127.0.0.1').searchParams;
        if ([...params.keys()].some((key) => key !== 'after') || params.getAll('after').length > 1) throw new GatewayError('UNKNOWN_FIELD');
        reply(200, gateway.listMyConnections(token, { after: params.get('after') ?? '' }));
      }
      else if (route === 'GET /v1/targets') reply(200, gateway.listAuthorizedTargets(token));
      else if (route === 'POST /v1/logout') { gateway.revokeSession(token); reply(200, { ok: true }); }
      else if (route === 'GET /v1/admin/audit') reply(200, gateway.auditForAdmin(token));
      else if (route === 'POST /v1/dev/quarantine' || route === 'POST /v1/files') {
        const connectorId = req.headers['x-connector-id'];
        const fileType = req.headers['x-file-type'];
        const idempotencyKey = req.headers['idempotency-key'];
        gateway.authorizeSubmission(token, { connectorId, fileType });
        const content = await readBody(req, 2 * 1024 * 1024, 'application/octet-stream');
        reply(201, gateway.quarantineFile(token, { connectorId, fileType, idempotencyKey, content }));
      } else if (routes[route]) {
        const [fields, execute, status = 200] = routes[route];
        const body = await readJson(req, fields);
        reply(status, execute(token, body) ?? { ok: true });
      } else reply(404, { error: 'NOT_FOUND' });
    } catch (error) {
      if (res.headersSent) { res.destroy(); return; }
      if (oauth && req.url === '/mcp' && error?.code === 'AUTH_REQUIRED') {
        res.setHeader('WWW-Authenticate', `Bearer resource_metadata="${allowedOrigin()}/.well-known/oauth-protected-resource"`);
      }
      if (error instanceof GatewayError) reply(statusFor(error.code), { error: error.code });
      else reply(500, { error: 'INTERNAL_ERROR' });
    }
  };
}
