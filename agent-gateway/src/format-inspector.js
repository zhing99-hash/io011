import { Worker } from 'node:worker_threads';

/** Worker isolation bounds parser execution; it is not an operating-system security sandbox. */
export function inspectFileFormat(content, fileType, { timeoutMs = 3000 } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    let worker;
    let timer;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      worker?.terminate();
      resolve(value);
    };
    const pending = (reason) => ({ verdict: 'review_required', reason, inspectorVersion: 'format-v1' });
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10_000) {
      finish(pending('FORMAT_INVALID_TIMEOUT'));
      return;
    }
    if (!Buffer.isBuffer(content) || !content.length || content.length > 2 * 1024 * 1024) {
      finish({ verdict: 'rejected', reason: 'FORMAT_SIZE_LIMIT', inspectorVersion: 'format-v1' });
      return;
    }
    try {
      worker = new Worker(new URL('./format-worker.mjs', import.meta.url), {
        workerData: { content, fileType }, resourceLimits: { maxOldGenerationSizeMb: 64, stackSizeMb: 4 },
      });
      timer = setTimeout(() => finish(pending('FORMAT_CHECK_TIMEOUT')), timeoutMs);
      worker.once('message', finish);
      worker.once('error', () => finish(pending('FORMAT_WORKER_FAILED')));
      worker.once('exit', () => finish(pending('FORMAT_WORKER_FAILED')));
    } catch { finish(pending('FORMAT_WORKER_FAILED')); }
  });
}
