import Provider, { errors } from 'oidc-provider';
import { createHmac } from 'node:crypto';
import { GatewayError } from './gateway.js';
import { BrowserSecurity, equal } from './browser-security.js';
import { renderPage, readForm, escapeHtml as escape, loginFields, passwordFields, passwordFormError } from './web-ui.js';
import { createAccountPages } from './account-pages.js';

const PASSWORD_COOKIE = '__Host-gw_oauth_password';

export function validateOAuthClients(clients) {
  if (!Array.isArray(clients) || !clients.length || clients.length > 32) throw new Error('INVALID_OAUTH_CLIENTS');
  const seen = new Set();
  return clients.map((client) => {
    if (!client || Object.keys(client).some((key) => !['clientId', 'clientName', 'redirectUris'].includes(key)) ||
        typeof client.clientId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/.test(client.clientId) ||
        seen.has(client.clientId) || typeof client.clientName !== 'string' || client.clientName.length > 100 ||
        !Array.isArray(client.redirectUris) || !client.redirectUris.length || client.redirectUris.length > 10) throw new Error('INVALID_OAUTH_CLIENTS');
    seen.add(client.clientId);
    for (const redirect of client.redirectUris) {
      const url = new URL(redirect);
      if (url.username || url.password || url.hash || url.search ||
          !(url.protocol === 'https:' || (url.protocol === 'http:' && ['127.0.0.1', '[::1]'].includes(url.hostname)))) {
        throw new Error('INVALID_OAUTH_REDIRECT');
      }
    }
    return { client_id: client.clientId, client_name: client.clientName,
      redirect_uris: [...new Set(client.redirectUris)], application_type: 'native',
      token_endpoint_auth_method: 'none', grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'] };
  });
}

export function createOAuthServer(gateway, { issuer, secrets, clients }) {
  const resource = issuer + '/mcp';
  const registrations = validateOAuthClients(clients);
  if (!secrets || !Array.isArray(secrets.jwks?.keys) || !secrets.jwks.keys.length ||
      !Array.isArray(secrets.cookieKeys) || secrets.cookieKeys.length < 2 ||
      secrets.cookieKeys.some((key) => typeof key !== 'string' || key.length < 43) ||
      typeof secrets.storageKey !== 'string' || !/^[a-f0-9]{64}$/.test(secrets.storageKey)) throw new Error('INVALID_OAUTH_SECRETS');
  const store = gateway.configureOAuthStore(Buffer.from(secrets.storageKey, 'hex'));
  const security = new BrowserSecurity(secrets.cookieKeys);
  const accountPages = createAccountPages(gateway, { issuer, security, registrations });
  const provider = new Provider(issuer, {
    clients: registrations,
    adapter: (model) => store.adapter(model),
    jwks: secrets.jwks, cookies: { keys: secrets.cookieKeys,
      names: { session: 'gw_oidc_session', interaction: 'gw_oidc_interaction', resume: 'gw_oidc_resume' },
      long: { httpOnly: true, secure: true, sameSite: 'lax' }, short: { httpOnly: true, secure: true, sameSite: 'lax' } },
    responseTypes: ['code'], scopes: ['openid', 'offline_access'], pkce: { required: () => true },
    features: { devInteractions: { enabled: false }, registration: { enabled: false },
      clientIdMetadataDocument: { enabled: false }, pushedAuthorizationRequests: { enabled: false },
      revocation: { enabled: true, allowedPolicy: (_ctx, client, token) => token.clientId === client.clientId },
      userinfo: { enabled: false }, rpInitiatedLogout: { enabled: false },
      resourceIndicators: { enabled: true, useGrantedResource: () => true,
        getResourceServerInfo: (_ctx, indicator) => {
          if (indicator !== resource) throw new errors.InvalidTarget();
          return { scope: 'mcp:read', audience: resource, accessTokenFormat: 'opaque', accessTokenTTL: 600 };
        } } },
    rotateRefreshToken: true,
    issueRefreshToken: (_ctx, client) => client.grantTypeAllowed('refresh_token'),
    findAccount: (_ctx, id) => {
      const account = gateway.oauthAccount(id);
      return account ? { accountId: id, claims: async () => ({ sub: id }) } : undefined;
    },
    ttl: { AccessToken: 600, AuthorizationCode: 60, Interaction: 600, Grant: 86400,
      Session: 28800, RefreshToken: 86400, IdToken: 600 },
    interactions: { url: (_ctx, interaction) => '/oauth/interaction/' + interaction.uid },
    routes: { authorization: '/oauth/auth', token: '/oauth/token', revocation: '/oauth/revoke', jwks: '/oauth/jwks' },
    renderError: (_ctx, _out, _error) => { _ctx.status = 400; _ctx.type = 'text/plain'; _ctx.body = '授权请求无效或已失效，请从客户端重新连接。'; },
  });
  provider.on('server_error', () => {});
  provider.on('grant.success', (ctx) => gateway.recordOAuthEvent('oauth_token_issued', {
    accountId: ctx.oidc.entities.Account?.accountId ?? null, clientId: ctx.oidc.client?.clientId ?? null,
  }));
  provider.on('grant.revoked', (ctx) => gateway.recordOAuthEvent('oauth_grant_revoked', {
    accountId: ctx.oidc.entities.RefreshToken?.accountId ?? ctx.oidc.entities.AccessToken?.accountId ?? null,
    clientId: ctx.oidc.client?.clientId ?? null,
  }));
  const callback = provider.callback();
  const csrf = (details, pending) => createHmac('sha256', secrets.cookieKeys[0]).update(details.uid + ':' + details.prompt.name + ':' + (pending?.value ?? '')).digest('hex');
  const pendingPassword = (req, details) => {
    if (details.prompt.name !== 'login') return undefined;
    const signed = security.read(req, PASSWORD_COOKIE);
    if (!signed || signed.payload.uid !== details.uid || typeof signed.payload.token !== 'string') return undefined;
    try {
      const user = gateway.profile(signed.payload.token);
      return user.mustChangePassword && user.clientId === 'oauth-browser' ? { ...signed, user } : undefined;
    } catch { return undefined; }
  };
  const page = (res, details, notice, status = 200, pending) => {
    const client = registrations.find((item) => item.client_id === details.params.client_id);
    const hidden = `<input type="hidden" name="csrf" value="${csrf(details, pending)}">`;
    const action = '/oauth/interaction/' + encodeURIComponent(details.uid);
    const fields = pending
      ? `<p>账号：<strong>${escape(pending.user.username)}</strong></p><p>请先更新临时密码。已有会话和客户端授权会被撤销，本次连接随后继续。</p>${passwordFields}<div class="actions"><button name="action" value="change-password">更新密码并继续</button><button class="secondary" name="action" value="deny" formnovalidate>取消</button></div>`
      : details.prompt.name === 'login'
        ? loginFields + '<div class="actions"><button name="action" value="login">登录并继续</button><button class="secondary" name="action" value="deny" formnovalidate>取消</button></div>'
        : '<p>允许此客户端查看您的平台身份、已授权的对接目标，以及本人文件审查状态。它不会因此获得额外业务权限。</p><p>连接可持续至授权到期；您可随时在<a href="/account/connections" target="_blank" rel="noopener noreferrer">账号管理页面</a>撤销连接。</p><div class="actions"><button name="action" value="approve">允许连接</button><button class="secondary" name="action" value="deny">拒绝</button></div>';
    renderPage(res, { title: pending ? '更新临时密码' : details.prompt.name === 'login' ? '登录企业账号' : '确认客户端授权', client: client?.client_name,
      body: `<form method="post" action="${action}">${hidden}${fields}</form>`, notice, status });
  };
  return {
    metadata: {
      issuer, authorization_endpoint: issuer + '/oauth/auth', token_endpoint: issuer + '/oauth/token',
      revocation_endpoint: issuer + '/oauth/revoke', jwks_uri: issuer + '/oauth/jwks',
      response_types_supported: ['code'], grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'], token_endpoint_auth_methods_supported: ['none'],
      revocation_endpoint_auth_methods_supported: ['none'], scopes_supported: ['mcp:read', 'offline_access', 'openid'],
      authorization_response_iss_parameter_supported: true,
    },
    resourceMetadata: { resource, authorization_servers: [issuer], scopes_supported: ['mcp:read'], bearer_methods_supported: ['header'] },
    async resolveToken(value) {
      const token = await provider.AccessToken.find(value);
      if (!token || token.isExpired || !registrations.some((item) => item.client_id === token.clientId) ||
          token.aud !== resource || !token.scope?.split(' ').includes('mcp:read')) throw new GatewayError('AUTH_REQUIRED');
      if (!await provider.Grant.find(token.grantId)) throw new GatewayError('AUTH_REQUIRED');
      return gateway.createOAuthContext({ accountId: token.accountId, clientId: token.clientId,
        accessTokenId: token.jti, grantId: token.grantId, resource });
    },
    matches(path) {
      return path === '/account' || path.startsWith('/account/') || path.startsWith('/oauth/') || path === '/.well-known/openid-configuration' ||
        path === '/.well-known/oauth-authorization-server' || path === '/.well-known/oauth-protected-resource' ||
        path === '/.well-known/oauth-protected-resource/mcp';
    },
    async handle(req, res) {
      const url = new URL(req.url, issuer);
      if (url.pathname === '/account' || url.pathname.startsWith('/account/')) { await accountPages.handle(req, res); return; }
      if (url.pathname === '/.well-known/oauth-authorization-server' || url.pathname.startsWith('/.well-known/oauth-protected-resource')) {
        if (req.method !== 'GET') { res.statusCode = 405; res.end(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' })); return; }
        res.end(JSON.stringify(url.pathname.includes('oauth-protected-resource') ? this.resourceMetadata : this.metadata)); return;
      }
      if (!/^\/oauth\/interaction\/[^/]+$/.test(url.pathname)) { await callback(req, res); return; }
      let details;
      try { details = await provider.interactionDetails(req, res); }
      catch { renderPage(res, { title: '连接已失效', notice: '请返回客户端，重新发起连接。', status: 400 }); return; }
      if (!['login', 'consent'].includes(details.prompt.name)) { renderPage(res, { title: '暂不支持此授权步骤', status: 400 }); return; }
      const pending = pendingPassword(req, details);
      const showPage = (notice, status = 200, passwordSession = pending) => page(res, details, notice, status, passwordSession);
      if (req.method === 'GET') { showPage(); return; }
      if (req.method !== 'POST' || req.headers.origin !== issuer) {
        renderPage(res, { title: '请求已拒绝', notice: '请在企业登录页面完成操作。', status: 403 }); return;
      }
      let form;
      try { form = await readForm(req, ['csrf', 'action', 'username', 'password', 'currentPassword', 'newPassword', 'confirmPassword']); } catch { showPage('提交内容无效，请重新操作。', 400); return; }
      if (!equal(form.get('csrf'), csrf(details, pending))) { showPage('页面已失效，请重新打开连接。', 403); return; }
      if (form.get('action') === 'deny') {
        if (pending) gateway.revokeSession(pending.payload.token);
        security.clear(res, PASSWORD_COOKIE);
        gateway.recordOAuthEvent('oauth_denied', { accountId: details.session?.accountId ?? null, clientId: details.params.client_id });
        await provider.interactionFinished(req, res, { error: 'access_denied', error_description: 'User declined authorization' }, { mergeWithLastSubmission: false }); return;
      }
      if (pending && form.get('action') === 'change-password') {
        if (!form.get('newPassword') || form.get('newPassword') !== form.get('confirmPassword')) { showPage('两次输入的新密码不一致。', 400); return; }
        if (!security.allowPassword(req, res, pending.user.username)) { showPage('密码验证过于频繁，请稍后再试。', 429); return; }
        try { gateway.changePassword(pending.payload.token, { currentPassword: form.get('currentPassword'), newPassword: form.get('newPassword') }); }
        catch (error) { showPage(passwordFormError(error), 400); return; }
        security.clear(res, PASSWORD_COOKIE);
        gateway.recordOAuthEvent('oauth_login', { accountId: pending.user.id, clientId: details.params.client_id });
        await provider.interactionFinished(req, res, { login: { accountId: pending.user.id } }, { mergeWithLastSubmission: false }); return;
      }
      if (!pending && details.prompt.name === 'login' && form.get('action') === 'login') {
        const username = form.get('username')?.trim().toLowerCase() ?? '';
        if (!security.allowPassword(req, res, username)) {
          showPage('登录尝试过于频繁，请稍后再试。', 429); return;
        }
        let login;
        try {
          login = gateway.login({ username, password: form.get('password'), clientId: 'oauth-browser' }, { sessionMs: 10 * 60 * 1000 });
        } catch {
          showPage('账号或密码无效，请重试。', 401); return;
        }
        if (login.user.mustChangePassword) {
          const previous = security.read(req, PASSWORD_COOKIE);
          if (previous?.payload.token) { try { gateway.revokeSession(previous.payload.token); } catch {} }
          const signed = security.set(res, PASSWORD_COOKIE, { token: login.token, uid: details.uid }, 10 * 60 * 1000);
          page(res, details, '', 200, { ...signed, user: login.user }); return;
        }
        gateway.revokeSession(login.token);
        gateway.recordOAuthEvent('oauth_login', { accountId: login.user.id, clientId: details.params.client_id });
        await provider.interactionFinished(req, res, { login: { accountId: login.user.id } }, { mergeWithLastSubmission: false }); return;
      }
      if (details.prompt.name === 'consent' && form.get('action') === 'approve') {
        if (!gateway.oauthAccount(details.session?.accountId)) { page(res, details, '账号状态已变化，请重新登录。', 401); return; }
        const grant = details.grantId ? await provider.Grant.find(details.grantId) : new provider.Grant({ accountId: details.session.accountId, clientId: details.params.client_id });
        if (!grant) { page(res, details, '授权已失效，请重新连接。', 400); return; }
        const missing = details.prompt.details;
        if (missing.missingOIDCScope) grant.addOIDCScope(missing.missingOIDCScope.join(' '));
        if (missing.missingOIDCClaims) grant.addOIDCClaims(missing.missingOIDCClaims);
        for (const [indicator, scopes] of Object.entries(missing.missingResourceScopes ?? {})) grant.addResourceScope(indicator, scopes.join(' '));
        const grantId = await grant.save();
        gateway.recordOAuthEvent('oauth_consent', { accountId: details.session.accountId, clientId: details.params.client_id });
        await provider.interactionFinished(req, res, { consent: { grantId } }, { mergeWithLastSubmission: true }); return;
      }
      showPage('操作无效，请重新操作。', 400);
    },
  };
}
