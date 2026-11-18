import { parentPort, workerData } from 'node:worker_threads';
import { inspectFormatCore } from './format-core.js';

parentPort.postMessage(await inspectFormatCore(Buffer.from(workerData.content), workerData.fileType));
