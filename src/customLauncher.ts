// out/customLauncher.ts
//
// Handshake-only launcher:
// - Parses argv[2] (NetworkOptions)
// - Establishes IPC (client→connect, server→listen)
// - Reads first message (WorkerArgs)
// - THEN pauses in debugger and sits idle
//
// Use this to debug NetworkOptions + first WorkerArgs with zero VS Code/Electron noise.

import type { Socket } from 'node:net';
import * as inspector from 'node:inspector';
import {
  createConnection,
  receiveConnection,
  readMessages,
} from 'vscode-test-adapter-remoting-util';

type NetRole = 'server' | 'client';
type NetworkOptions = { host?: string; port: number; role: NetRole };

const BUILD_TAG = 'launcher@handshake-only:client->connect/server->listen:2025-10-30T18:00:00Z';
const TIMEOUT = Number(process.env.MTE_IPC_TIMEOUT ?? 60000);
const log = (s: string) => process.stderr.write(`[launcher] ${s}\n`);
const toV4 = (h?: string) => (h === 'localhost' || h === '::1') ? '127.0.0.1' : h;

async function handshake(net: NetworkOptions) {
  log(`build=${BUILD_TAG}`);
  log(`argv role=${net.role} port=${net.port} host=${net.host ?? '<none>'}`);

  let socket: Socket;
  if (net.role === 'client') {
    const host = toV4(net.host) ?? '127.0.0.1';
    log(`createConnection -> ${host}:${net.port} timeout=${TIMEOUT}`);
    socket = await createConnection(net.port, { host, timeout: TIMEOUT });
  } else {
    log(`receiveConnection <- 0.0.0.0:${net.port} timeout=${TIMEOUT}`);
    socket = await receiveConnection(net.port, { timeout: TIMEOUT });
  }

  socket.once('connect', () => log('socket: connect'));
  socket.once('ready',   () => log('socket: ready'));
  socket.once('end',     () => log('socket: end'));
  socket.once('close', h => log(`socket: close hadErr=${h}`));
  socket.once('error', e => log(`socket: error ${String(e)}`));

  const workerArgs: any = await new Promise((resolve, reject) => {
    let settled = false;
    readMessages(socket, (msg: unknown) => {
      if (!settled) {
        settled = true;
        const action = (msg && typeof msg === 'object' && (msg as any).action) || '?';
        log(`WorkerArgs received (action=${action})`);
        resolve(msg);
      }
    });
    const t = setTimeout(() => {
      if (!settled) { settled = true; reject(new Error('Timed out waiting for WorkerArgs')); }
    }, TIMEOUT);
    // @ts-ignore
    t.unref?.();
  });

  return { socket, workerArgs };
}

(async () => {
  try {
    const net = JSON.parse(process.argv[2] ?? '{}') as NetworkOptions;
    if (!net || typeof net.port !== 'number' || !net.role) {
      throw new Error('Invalid NetworkOptions in argv[2]');
    }

    // Do the handshake first (don’t block before this)
    const { socket, workerArgs } = await handshake(net);

    // NOW stop and wait for you to attach.
    const port = Number(process.env.MTE_DEBUG_LAUNCHER_PORT ?? 9231);
    log(`Pausing after handshake. Inspector on ${port}. Attach now.`);
    inspector.open(port, '127.0.0.1', /*wait*/ true);

    // Keep process alive so you can inspect `workerArgs` in Locals/Watch
    // (Nothing else runs — no VS Code launch.)
    await new Promise(() => {});
  } catch (err) {
    log(`failed: ${String(err instanceof Error ? err.stack ?? err.message : err)}`);
    process.exit(1);
  }
})();
