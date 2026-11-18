import { randomBytes } from 'node:crypto';

export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export async function readForm(req, fields) {
  if ((req.headers['content-type'] ?? '').split(';')[0] !== 'application/x-www-form-urlencoded') throw new Error('FORM_REQUIRED');
  let length = 0;
  const chunks = [];
  for await (const chunk of req) {
    length += chunk.length;
    if (length > 16 * 1024) throw new Error('FORM_TOO_LARGE');
    chunks.push(chunk);
  }
  const form = new URLSearchParams(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)));
  if ([...form.keys()].some((key) => form.getAll(key).length !== 1 || !fields.includes(key))) throw new Error('INVALID_FORM');
  return form;
}

export function renderPage(res, { title, client = '', body = '', notice = '', status = 200, success = false, wide = false }) {
  const nonce = randomBytes(16).toString('base64');
  res.statusCode = status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', `default-src 'none'; style-src 'nonce-${nonce}'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'`);
  res.end(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(title)} · 企业连接网关</title>
<style nonce="${nonce}">:root{--bg:#f4f6f8;--surface:#fff;--text:#152536;--muted:#45596b;--border:#c4cdd5;--brand:#145ab6;--error:#a31525;--success:#146438}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.6 system-ui,sans-serif}main{max-width:${wide ? '46' : '32'}rem;margin:6vh auto;padding:2rem;background:var(--surface);border:1px solid var(--border);border-radius:12px}h1{font-size:1.65rem;margin:.5rem 0}h2{font-size:1.1rem;margin:0;overflow-wrap:anywhere}p{color:var(--muted)}label{display:block;margin-top:1rem;font-weight:600}input{width:100%;min-height:44px;padding:.65rem;border:1px solid var(--border);border-radius:6px;font:inherit}button,.button{display:inline-block;min-height:44px;padding:.65rem 1rem;margin-top:1rem;font:inherit;border:1px solid var(--brand);border-radius:6px;background:var(--brand);color:white;cursor:pointer;text-decoration:none}button.secondary,.button.secondary{background:var(--surface);color:var(--brand)}.actions{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.danger{background:var(--surface);border-color:var(--error);color:var(--error)}a{color:var(--brand);text-underline-offset:.15em}nav{display:flex;flex-wrap:wrap;gap:8px;margin:1rem 0}nav a{padding:.5rem;min-height:44px}:focus-visible{outline:3px solid #1273de;outline-offset:3px}.notice{color:var(--error);border-left:3px solid var(--error);padding-left:1rem}.notice.success{color:var(--success);border-color:var(--success)}.connections{list-style:none;padding:0}.connections li{border:1px solid var(--border);border-radius:8px;padding:1rem;margin:1rem 0}.meta{font-size:.9rem;overflow-wrap:anywhere}.hint{margin-top:.4rem;font-size:.9rem}form{margin:0}button:active,.button:active{filter:brightness(.92)}@media(max-width:550px){main{margin:1rem;padding:1.25rem}.actions>*{flex:1;text-align:center}}</style></head>
<body><main><p>企业连接网关</p><h1>${escapeHtml(title)}</h1>${client ? `<p>客户端：<strong>${escapeHtml(client)}</strong></p>` : ''}${notice ? `<p class="notice${success ? ' success' : ''}" role="${success ? 'status' : 'alert'}">${escapeHtml(notice)}</p>` : ''}${body}</main></body></html>`);
}

export const loginFields = '<label for="username">平台账号</label><input id="username" name="username" autocomplete="username" maxlength="64" required><label for="password">密码</label><input id="password" name="password" type="password" autocomplete="current-password" maxlength="1024" required>';
export const passwordFields = '<label for="currentPassword">当前密码</label><input id="currentPassword" name="currentPassword" type="password" autocomplete="current-password" maxlength="1024" required><label for="newPassword">新密码</label><input id="newPassword" name="newPassword" type="password" autocomplete="new-password" minlength="12" maxlength="1024" aria-describedby="password-hint" required><p id="password-hint" class="hint">使用 12～1024 个字符，不能与当前密码相同。支持密码管理器和粘贴。</p><label for="confirmPassword">再次输入新密码</label><input id="confirmPassword" name="confirmPassword" type="password" autocomplete="new-password" minlength="12" maxlength="1024" required>';

export function passwordFormError(error) {
  return ({ INVALID_CREDENTIALS: '当前密码不正确，请重试。', INVALID_PASSWORD: '新密码须为 12～1024 个字符。',
    PASSWORD_UNCHANGED: '新密码不能与当前密码相同。' })[error?.code] ?? '登录状态已变化，请重新登录后操作。';
}
