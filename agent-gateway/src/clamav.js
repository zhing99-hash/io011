import { createConnection } from 'node:net';
import { isAbsolute } from 'node:path';

export class ScannerError extends Error {
  constructor(code) { super(code); this.name = 'ScannerError'; this.code = code; }
}

/** clamd TCP is not authenticated or encrypted: only loopback or a local socket is supported. */
export class ClamAvScanner {
  #connection;
  #timeout;

  constructor({ host = '127.0.0.1', port = 3310, socketPath, timeoutMs = 5000 } = {}) {
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) throw new ScannerError('INVALID_SCANNER_CONFIG');
    if (socketPath !== undefined) {
      if (typeof socketPath !== 'string' || !isAbsolute(socketPath)) throw new ScannerError('INVALID_SCANNER_CONFIG');
      this.#connection = { path: socketPath };
    } else {
      if (!['127.0.0.1', '::1'].includes(host) || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw new ScannerError('INVALID_SCANNER_CONFIG');
      }
      this.#connection = { host, port };
    }
    this.#timeout = timeoutMs;
  }

  #command(command, content) {
    return new Promise((resolve, reject) => {
      const socket = createConnection(this.#connection);
      let received = Buffer.alloc(0);
      let settled = false;
      const timer = setTimeout(() => finish(new ScannerError('SCANNER_TIMEOUT')), this.#timeout);
      const finish = (error, reply) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        socket.destroy();
        if (error) reject(error); else resolve(reply);
      };
      socket.on('connect', () => {
        socket.write(Buffer.from(`z${command}\0`, 'ascii'));
        if (content) {
          // Memory is bounded to a 2 MiB input, regardless of daemon consumption speed.
          for (let offset = 0; offset < content.length; offset += 65536) {
            const part = content.subarray(offset, offset + 65536);
            const header = Buffer.alloc(4);
            header.writeUInt32BE(part.length);
            socket.write(header);
            socket.write(part);
          }
          socket.write(Buffer.alloc(4));
        }
      });
      socket.on('data', (part) => {
        if (received.length + part.length > 8192) return finish(new ScannerError('SCANNER_INVALID_REPLY'));
        received = Buffer.concat([received, part]);
      });
      socket.on('end', () => {
        if (received.length < 2 || received.at(-1) !== 0 || received.subarray(0, -1).includes(0)) {
          return finish(new ScannerError('SCANNER_INVALID_REPLY'));
        }
        finish(null, received.subarray(0, -1).toString('utf8'));
      });
      socket.on('error', () => finish(new ScannerError('SCANNER_UNAVAILABLE')));
      socket.on('close', () => {
        if (!settled) finish(new ScannerError('SCANNER_INVALID_REPLY'));
      });
    });
  }

  async scan(content) {
    if (!Buffer.isBuffer(content) || !content.length || content.length > 2 * 1024 * 1024) {
      throw new ScannerError('INVALID_SCAN_CONTENT');
    }
    const capabilities = await this.#command('VERSIONCOMMANDS');
    const match = /^(ClamAV [^\r\n|]{1,512})\| COMMANDS: ([A-Z0-9 ]+)$/.exec(capabilities);
    if (!match || !match[2].split(/ +/).includes('INSTREAM')) throw new ScannerError('SCANNER_INCOMPATIBLE');
    const reply = await this.#command('INSTREAM', content);
    if (reply === 'stream: OK') return { verdict: 'clean', engineVersion: match[1] };
    if (/^stream: [^\r\n]{1,512} FOUND$/.test(reply)) return { verdict: 'infected', engineVersion: match[1] };
    throw new ScannerError('SCANNER_SCAN_ERROR');
  }
}
