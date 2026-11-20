import { createServer } from 'node:net';

// Protocol fixture only. It has no virus-detection capability and is not a test itself.
export async function startClamdFixture({ reply = 'stream: OK', onContent = () => {}, hang = false } = {}) {
  const sockets = new Set();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => {});
    let buffered = Buffer.alloc(0);
    let streaming = false;
    let parts = [];
    socket.on('data', (chunk) => {
      buffered = Buffer.concat([buffered, chunk]);
      if (!streaming) {
        const end = buffered.indexOf(0);
        if (end < 0) return;
        const command = buffered.subarray(0, end).toString('ascii');
        buffered = buffered.subarray(end + 1);
        if (command === 'zVERSIONCOMMANDS') {
          socket.end('ClamAV 1.4.0/12345/Test database| COMMANDS: INSTREAM VERSION PING\0');
          return;
        }
        if (command !== 'zINSTREAM') return socket.destroy();
        streaming = true;
      }
      while (buffered.length >= 4) {
        const size = buffered.readUInt32BE();
        if (buffered.length < size + 4) return;
        if (size === 0) {
          onContent(Buffer.concat(parts));
          if (!hang) socket.end(reply + '\0');
          return;
        }
        parts.push(buffered.subarray(4, size + 4));
        buffered = buffered.subarray(size + 4);
      }
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { port: server.address().port, close: async () => {
    for (const socket of sockets) socket.destroy();
    await new Promise((resolve) => server.close(resolve));
  } };
}
