import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';

function same(a, b) {
  if (typeof a !== 'string') return false;
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Ephemeral native-app redirect. Never accepts a configurable listen address. */
export async function startOAuthCallback({ state, issuer, timeoutMs, signal }) {
  let accept, fail, done = false;
  const result = new Promise((resolve, reject) => { accept = resolve; fail = reject; });
  // Rejection can precede the client's awaited discovery request.
  result.catch(() => {});
  let timer;
  let redirectUrl;
  const server = createServer((req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
    if (req.method !== 'GET' || req.headers.host !== new URL(redirectUrl).host || req.headers.origin || (req.url?.length ?? 0) > 4096) {
      res.writeHead(400); res.end('无效回调。请返回助手重试。'); return;
    }
    let url;
    try { url = new URL(req.url, redirectUrl); } catch { res.writeHead(400); res.end('无效回调。'); return; }
    const params = url.searchParams;
    const allowed = ['state', 'iss', 'code', 'error', 'error_description'];
    const valid = !done && url.origin === new URL(redirectUrl).origin && url.pathname === '/callback' &&
      [...params.keys()].every((key) => allowed.includes(key) && params.getAll(key).length === 1) &&
      same(params.get('state'), state) && params.get('iss') === issuer &&
      (Boolean(params.get('code')) !== Boolean(params.get('error')));
    if (!valid) { res.writeHead(400); res.end('无效或已失效的回调。请返回助手重试。'); return; }
    done = true;
    clearTimeout(timer);
    res.end(params.has('error') ? '授权未完成。请返回助手重试。' : '已收到授权，请返回助手继续。此页面可以关闭。');
    if (params.has('error')) fail(new Error('AUTHORIZATION_DENIED'));
    else accept(params);
  });
  server.requestTimeout = 5000;
  server.headersTimeout = 5000;
  server.maxConnections = 8;
  server.on('clientError', (_error, socket) => socket.destroy());
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  redirectUrl = `http://127.0.0.1:${server.address().port}/callback`;
  const cancel = () => { if (!done) { done = true; fail(new Error('AUTHORIZATION_CANCELLED')); } };
  signal?.addEventListener('abort', cancel, { once: true });
  timer = setTimeout(() => { if (!done) { done = true; fail(new Error('AUTHORIZATION_TIMEOUT')); } }, timeoutMs);
  if (signal?.aborted) cancel();
  return {
    redirectUrl, result,
    async close() {
      clearTimeout(timer); signal?.removeEventListener('abort', cancel); cancel();
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
