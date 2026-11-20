import { renderPage, escapeHtml, readForm, loginFields, passwordFields, passwordFormError } from './web-ui.js';

const SESSION = '__Host-gw_account';
const GUEST = '__Host-gw_account_guest';
const SESSION_MS = 30 * 60 * 1000;
const hidden = (name, value) => `<input type="hidden" name="${name}" value="${escapeHtml(value)}">`;
const nav = '<nav aria-label="账号导航"><a href="/account">账号首页</a><a href="/account/connections">我的连接</a><a href="/account/password">修改密码</a></nav>';
const clientPattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,63}$/;
const redirect = (res, location) => { res.statusCode = 303; res.setHeader('Location', location); res.end(); };

export function createAccountPages(gateway, { issuer, security, registrations }) {
  const label = (id) => registrations.find((item) => item.client_id === id)?.client_name ?? (id === 'account-browser' ? '账号管理网页' : id);
  const session = (req) => {
    const signed = security.read(req, SESSION);
    if (!signed || typeof signed.payload.token !== 'string') return undefined;
    try { return { ...signed, user: gateway.profile(signed.payload.token) }; } catch { return undefined; }
  };
  const loginPage = (res, guest, notice = '', status = 200, success = false) => renderPage(res, {
    title: '登录账号管理', notice, status, success,
    body: '<p>使用企业平台账号管理自己的连接和密码。</p><form method="post" action="/account/login">' +
      hidden('csrf', security.csrf(guest.value, '/account/login')) + loginFields + '<button>登录</button></form>',
  });
  const logoutForm = (active) => '<form method="post" action="/account/logout">' + hidden('csrf', security.csrf(active.value, '/account/logout')) + '<button class="secondary">退出本网页</button></form>';
  const passwordPage = (res, active, notice = '', status = 200) => renderPage(res, {
    title: active.user.mustChangePassword ? '更新临时密码' : '修改密码', notice, status,
    body: nav + `<p>当前账号：<strong>${escapeHtml(active.user.username)}</strong></p><p>更新后，已有登录会话及客户端授权都会失效。请重新登录并按需连接助手。</p>` +
      '<form method="post" action="/account/password">' + hidden('csrf', security.csrf(active.value, '/account/password')) + passwordFields + '<button>更新密码</button></form>' + logoutForm(active),
  });
  return {
    async handle(req, res) {
      const url = new URL(req.url, issuer);
      const path = url.pathname;
      const known = ['/account', '/account/login', '/account/logout', '/account/password', '/account/connections', '/account/connections/revoke'];
      if (!known.includes(path)) { renderPage(res, { title: '页面不存在', status: 404, body: '<a href="/account">返回账号首页</a>' }); return; }
      if (!['GET', 'POST'].includes(req.method) || (req.method === 'GET' && path === '/account/logout') || (req.method === 'POST' && ['/account', '/account/connections'].includes(path))) {
        res.setHeader('Allow', path === '/account/logout' ? 'POST' : 'GET');
        renderPage(res, { title: '请求方式不支持', status: 405 }); return;
      }
      if (req.method === 'POST' && req.headers.origin !== issuer) { renderPage(res, { title: '请求已拒绝', notice: '请在企业账号页面完成操作。', status: 403 }); return; }
      let active = session(req);
      if (path === '/account/login') {
        if (active && req.method === 'GET') { redirect(res, active.user.mustChangePassword ? '/account/password' : '/account'); return; }
        let guest = security.read(req, GUEST);
        if (req.method === 'GET') {
          guest = security.set(res, GUEST, {}, 10 * 60 * 1000);
          loginPage(res, guest, url.searchParams.get('updated') === '1' ? '密码已更新，原有连接已撤销。请使用新密码登录。' : '', 200, true); return;
        }
        if (!guest) { renderPage(res, { title: '登录页面已失效', status: 403, body: '<a href="/account/login">重新打开登录页</a>' }); return; }
        let form;
        try { form = await readForm(req, ['csrf', 'username', 'password']); } catch { loginPage(res, guest, '提交内容无效，请重新操作。', 400); return; }
        if (!security.checkCsrf(guest.value, path, form.get('csrf'))) { loginPage(res, guest, '页面已失效，请重新打开登录页。', 403); return; }
        if (!security.allowPassword(req, res, form.get('username'))) { loginPage(res, guest, '登录尝试过于频繁，请稍后再试。', 429); return; }
        let login;
        try { login = gateway.login({ username: form.get('username'), password: form.get('password'), clientId: 'account-browser' }, { sessionMs: SESSION_MS }); }
        catch { loginPage(res, guest, '账号或密码无效，请重试。', 401); return; }
        if (active) { try { gateway.revokeSession(active.payload.token); } catch {} }
        security.set(res, SESSION, { token: login.token }, SESSION_MS); security.clear(res, GUEST);
        redirect(res, login.user.mustChangePassword ? '/account/password' : '/account'); return;
      }
      if (!active) { security.clear(res, SESSION); redirect(res, '/account/login'); return; }
      if (active.user.mustChangePassword && !['/account/password', '/account/logout'].includes(path)) { redirect(res, '/account/password'); return; }
      if (path === '/account') {
        renderPage(res, { title: '我的企业账号', body: nav + `<p>已登录：<strong>${escapeHtml(active.user.username)}</strong></p><p>您可以查看并撤销已连接的客户端，或更新账号密码。</p><p>本网页登录最长持续 30 分钟。</p>` + logoutForm(active) }); return;
      }
      if (path === '/account/password' && req.method === 'GET') { passwordPage(res, active); return; }
      if (path === '/account/connections' && req.method === 'GET') {
        let page;
        try {
          if ([...url.searchParams.keys()].some((key) => !['after', 'revoked'].includes(key)) || url.searchParams.getAll('after').length > 1) throw new Error();
          page = gateway.listMyConnections(active.payload.token, { after: url.searchParams.get('after') ?? '' });
        } catch { renderPage(res, { title: '连接列表请求无效', status: 400, body: nav }); return; }
        const items = page.connections.map((connection) => `<li><h2>${escapeHtml(label(connection.clientId))}</h2><p class="meta">客户端标识：${escapeHtml(connection.clientId)}</p><p>平台会话 ${connection.platformSessions} 个 · 助手授权 ${connection.oauthGrants} 个</p>` +
          (connection.clientId === active.user.clientId ? '<p class="hint">包含本网页登录；撤销后需要重新登录。</p>' : '') +
          `<a class="button secondary" href="/account/connections/revoke?clientId=${encodeURIComponent(connection.clientId)}">撤销此客户端连接</a></li>`).join('');
        renderPage(res, { title: '我的连接', wide: true, notice: url.searchParams.get('revoked') === '1' ? '已撤销该客户端的会话与授权。' : '', success: true,
          body: nav + `<p>当前账号：<strong>${escapeHtml(active.user.username)}</strong></p><p>仅显示本账号尚未过期的会话和授权。同一客户端标识下的多台设备会一起撤销。</p>` +
            (items ? `<ul class="connections">${items}</ul>` : '<p>当前没有有效连接。</p>') +
            (page.nextCursor ? `<a class="button secondary" href="/account/connections?after=${encodeURIComponent(page.nextCursor)}">下一页</a>` : '') }); return;
      }
      if (path === '/account/connections/revoke' && req.method === 'GET') {
        const clientId = url.searchParams.get('clientId');
        if (!clientPattern.test(clientId ?? '') || [...url.searchParams.keys()].some((key) => key !== 'clientId') || url.searchParams.getAll('clientId').length !== 1) {
          renderPage(res, { title: '客户端标识无效', status: 400, body: nav }); return;
        }
        renderPage(res, { title: '撤销客户端连接', body: nav + `<p>将撤销您使用 <strong>${escapeHtml(label(clientId))}</strong>（${escapeHtml(clientId)}）建立的全部有效会话和授权。同一标识下的设备会一起断开。</p><p>撤销后，客户端再次使用时需要重新授权。</p>` +
          '<form method="post" action="/account/connections/revoke">' + hidden('clientId', clientId) + hidden('csrf', security.csrf(active.value, path + ':' + clientId)) +
          '<div class="actions"><button class="danger">确认撤销连接</button><a class="button secondary" href="/account/connections">返回列表</a></div></form>' }); return;
      }
      let form;
      try { form = await readForm(req, path === '/account/password' ? ['csrf', 'currentPassword', 'newPassword', 'confirmPassword'] : path === '/account/logout' ? ['csrf'] : ['csrf', 'clientId']); }
      catch { renderPage(res, { title: '提交内容无效', status: 400, body: nav }); return; }
      const clientId = form.get('clientId');
      const purpose = path === '/account/connections/revoke' ? path + ':' + clientId : path;
      if (!security.checkCsrf(active.value, purpose, form.get('csrf'))) { renderPage(res, { title: '请求已拒绝', notice: '页面已失效，请返回页面重新操作。', status: 403, body: nav }); return; }
      if (path === '/account/logout') { gateway.revokeSession(active.payload.token); security.clear(res, SESSION); security.clear(res, GUEST); redirect(res, '/account/login'); return; }
      if (path === '/account/password') {
        if (!form.get('newPassword') || form.get('newPassword') !== form.get('confirmPassword')) { passwordPage(res, active, '两次输入的新密码不一致。', 400); return; }
        if (!security.allowPassword(req, res, active.user.username)) { passwordPage(res, active, '密码验证过于频繁，请稍后再试。', 429); return; }
        try { gateway.changePassword(active.payload.token, { currentPassword: form.get('currentPassword'), newPassword: form.get('newPassword') }); }
        catch (error) { passwordPage(res, active, passwordFormError(error), 400); return; }
        security.clear(res, SESSION); security.clear(res, GUEST); redirect(res, '/account/login?updated=1'); return;
      }
      if (!clientPattern.test(clientId ?? '')) { renderPage(res, { title: '客户端标识无效', status: 400, body: nav }); return; }
      gateway.revokeClientSessions(active.payload.token, clientId);
      if (clientId === active.user.clientId) { security.clear(res, SESSION); redirect(res, '/account/login'); return; }
      redirect(res, '/account/connections?revoked=1');
    },
  };
}
