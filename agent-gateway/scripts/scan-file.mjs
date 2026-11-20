import { isAbsolute } from 'node:path';
import { statSync } from 'node:fs';
import { Gateway, GatewayError } from '../src/gateway.js';
import { ClamAvScanner, ScannerError } from '../src/clamav.js';

// Local operator entry point; never invoke this script with paths supplied by remote users.
let gateway;
try {
  const [database, quarantineDir, fileId, ...extra] = process.argv.slice(2);
  if (extra.length || !database || !quarantineDir || !fileId || !isAbsolute(database) || !isAbsolute(quarantineDir)) {
    throw new GatewayError('USAGE: scan-file.mjs <absolute-database> <absolute-quarantine-directory> <file-id>');
  }
  if (!statSync(database).isFile() || !statSync(quarantineDir).isDirectory()) throw new GatewayError('INVALID_STORAGE_PATH');
  const scanner = new ClamAvScanner({
    port: Number(process.env.GATEWAY_CLAMD_PORT ?? 3310),
    socketPath: process.env.GATEWAY_CLAMD_SOCKET || undefined,
  });
  gateway = new Gateway({ filename: database, quarantineDir, scanner });
  const result = await gateway.scanQuarantinedFile(fileId);
  process.stdout.write(JSON.stringify(result) + '\n');
  if (result.state === 'scan_failed') process.exitCode = 2;
} catch (error) {
  const code = error instanceof GatewayError || error instanceof ScannerError ? error.code : 'SCAN_WORKER_FAILED';
  process.stderr.write(JSON.stringify({ error: code }) + '\n');
  process.exitCode = 1;
} finally { gateway?.close(); }
