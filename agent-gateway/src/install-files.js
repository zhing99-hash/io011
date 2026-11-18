import { readFileSync, openSync, closeSync, fstatSync, fchmodSync, readSync, writeFileSync, fsyncSync, existsSync, lstatSync, mkdirSync, renameSync, unlinkSync, realpathSync, linkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative, resolve, sep, isAbsolute, dirname, parse } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const sha = (data) => data === null ? null : createHash('sha256').update(data).digest('hex');
export const json = (data) => JSON.stringify(data, null, 2) + '\n';

export function projectRoot(path) {
  if (!isAbsolute(path ?? '') || !lstatSync(path).isDirectory() || lstatSync(path).isSymbolicLink()) throw new Error('INVALID_PROJECT_DIRECTORY');
  const root = realpathSync.native(path);
  if (root === parse(root).root) throw new Error('INVALID_PROJECT_DIRECTORY');
  return root;
}

export function installPath(root, name) {
  if (typeof name !== 'string' || !/^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(name) || name.split('/').some((part) => part === '.' || part === '..')) throw new Error('UNSAFE_INSTALL_PATH');
  const path = resolve(root, ...name.split('/'));
  const contained = relative(root, path);
  if (!contained || contained.startsWith('..' + sep) || isAbsolute(contained)) throw new Error('UNSAFE_INSTALL_PATH');
  let current = root;
  const parts = name.split('/');
  for (let i = 0; i < parts.length; i++) {
    current = join(current, parts[i]);
    let stat;
    try { stat = lstatSync(current); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (stat.isSymbolicLink() || (i < parts.length - 1 && !stat.isDirectory()) || (i === parts.length - 1 && !stat.isFile())) throw new Error('UNSAFE_INSTALL_PATH');
  }
  return path;
}

export function readInstallFile(root, name, max = 256 * 1024) {
  const path = installPath(root, name);
  let fd;
  try { fd = openSync(path, 'r'); } catch (error) { if (error.code === 'ENOENT') return { data: null, hash: null, mode: 0o600 }; throw error; }
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile() || stat.size > max) throw new Error('INSTALL_FILE_TOO_LARGE');
    const data = Buffer.alloc(max + 1);
    let size = 0;
    while (size <= max) { const n = readSync(fd, data, size, max + 1 - size); if (!n) break; size += n; }
    const last = fstatSync(fd);
    if (size > max) throw new Error('INSTALL_FILE_TOO_LARGE');
    if (last.size !== stat.size || last.mtimeMs !== stat.mtimeMs) throw new Error('INSTALL_FILE_CHANGED');
    const bytes = data.subarray(0, size);
    return { data: bytes, hash: sha(bytes), mode: stat.mode & 0o777 };
  } finally { closeSync(fd); }
}

export const utf8 = (bytes) => bytes === null ? null : new TextDecoder('utf-8', { fatal: true }).decode(bytes);

function preserveWindowsSecurity(source, destination, descriptor) {
  if (process.platform !== 'win32' || (!source && !descriptor)) return null;
  // Windows PowerShell's .NET Framework API avoids ambient PSModulePath rules.
  const script = readFileSync(new URL('./install-acl.ps1', import.meta.url), 'utf8');
  try {
    const original = execFileSync(join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')], {
        windowsHide: true, stdio: 'pipe', timeout: 10000,
        env: { ...process.env, AGENT_GATEWAY_ACL_SOURCE: source ?? '', AGENT_GATEWAY_ACL_TARGET: destination,
          AGENT_GATEWAY_ACL_VALUE: descriptor ?? '', AGENT_GATEWAY_ACL_PROTECT: source && dirname(source) !== dirname(destination) ? '1' : '0' },
      });
    const value = original.toString('ascii');
    if (value.length > 16384 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error();
    return value;
  } catch { throw new Error('FILE_SECURITY_COPY_FAILED'); }
}

/** fsync + same-directory replace; no shell commands or recursive deletion. */
export function replaceInstallFile(root, name, data, expectedHash, { mode = 0o600, securitySource, securityDescriptor } = {}) {
  const path = installPath(root, name);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 }); installPath(root, name);
  const temporary = join(dirname(path), '.gateway-tmp-' + randomUUID());
  let fd;
  let security;
  try {
    fd = openSync(temporary, 'wx', mode);
    if (process.platform !== 'win32') fchmodSync(fd, mode);
    // Apply an existing file's Windows ACL before copying any of its content.
    security = preserveWindowsSecurity(securitySource, temporary, securityDescriptor);
    writeFileSync(fd, data); fsyncSync(fd); closeSync(fd); fd = undefined;
    if (readInstallFile(root, name).hash !== expectedHash) throw new Error('INSTALL_FILE_CHANGED');
    if (expectedHash === null) { linkSync(temporary, path); unlinkSync(temporary); }
    else renameSync(temporary, path);
    return { securityDescriptor: security };
  } finally { if (fd !== undefined) closeSync(fd); if (existsSync(temporary)) unlinkSync(temporary); }
}

export function deleteInstallFile(root, name, expectedHash) {
  if (readInstallFile(root, name).hash !== expectedHash) throw new Error('INSTALL_FILE_CHANGED');
  unlinkSync(installPath(root, name));
}

export function withInstallLock(root, action) {
  const name = '.enterprise-gateway.install.lock';
  const path = installPath(root, name);
  let fd;
  try { fd = openSync(path, 'wx', 0o600); } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const previous = readInstallFile(root, name, 4096);
    let lock;
    try { lock = JSON.parse(utf8(previous.data)); } catch { throw new Error('INSTALL_LOCK_INVALID'); }
    if (lock.owner !== 'enterprise-agent-gateway' || !Number.isSafeInteger(lock.pid) || lock.pid < 1) throw new Error('INSTALL_LOCK_INVALID');
    try { process.kill(lock.pid, 0); throw new Error('INSTALL_BUSY'); }
    catch (failure) { if (failure.code !== 'ESRCH') throw new Error('INSTALL_BUSY'); }
    deleteInstallFile(root, name, previous.hash);
    fd = openSync(path, 'wx', 0o600);
  }
  writeFileSync(fd, json({ owner: 'enterprise-agent-gateway', pid: process.pid })); fsyncSync(fd); closeSync(fd);
  const own = readInstallFile(root, name, 4096).hash;
  try { return action(); } finally { if (readInstallFile(root, name, 4096).hash === own) deleteInstallFile(root, name, own); }
}
