// out/customLauncher.ts
//
// DROP-IN LAUNCHER (complete):
// - Parses argv[2] NetworkOptions
// - Establishes IPC and reads first WorkerArgs
// - Debug hooks (early, before VS Code):
//     * MTE_STOP_AFTER_HANDSHAKE=1   -> pause launcher after handshake (attach here)
//     * MTE_DEBUG_LAUNCHER_PORT=9231 -> port for the above pause
//     * MTE_FAKE_EH=1                -> run worker in plain Node with --inspect-brk
//     * MTE_FAKE_WORKER_PORT=9232    -> port for fake worker
// - Normal path launches VS Code via @vscode/test-electron with WorkerArgs in env
//
// Minimal logs go to stderr; no file dumps.

import * as path from 'path';
import * as util from 'util';
import * as inspector from 'node:inspector';
import { spawn } from 'node:child_process';
import type { Socket } from 'node:net';
import {
  createConnection,
  receiveConnection,
  readMessages,
  writeMessage,
} from 'vscode-test-adapter-remoting-util';
import { runTests } from '@vscode/test-electron';

type NetRole = 'server' | 'client';
type NetworkOptions = { host?: string; port: number; role: NetRole };

// ---- tiny helpers ----
const TIMEOUT = Number(process.env.MTE_IPC_TIMEOUT ?? 60000);
const toV4 = (h?: string) => (h === 'localhost' || h === '::1') ? '127.0.0.1' : h;
const log = (s: string) => process.stderr.write(`[launcher] ${s}\n`);

async function handshake(net: NetworkOptions): Promise<{ socket: Socket; workerArgs: any; hostForClient: string; }> {
  const hostForClient = toV4(net.host) ?? '127.0.0.1';

  // IMPORTANT: mapping below matches what works in practice:
  //   role === "server" -> extension is listening -> we CONNECT (client)
  //   role === "client" -> extension will connect -> we LISTEN (server)
  log(`argv role=${net.role} port=${net.port} host=${net.host ?? '<none>'}`);

  let socket: Socket;
  if (net.role === 'server') {
    log(`createConnection -> ${hostForClient}:${net.port} timeout=${TIMEOUT}`);
    socket = await createConnection(net.port, { host: hostForClient, timeout: TIMEOUT });
  } else {
    log(`receiveConnection <- 0.0.0.0:${net.port} timeout=${TIMEOUT}`);
    socket = await receiveConnection(net.port, { timeout: TIMEOUT }); // all interfaces
  }

  socket.once('connect', () => log('socket: connect'));
  socket.once('ready',   () => log('socket: ready'));
  socket.once('end',     () => log('socket: end'));
  socket.once('close', h => log(`socket: close hadErr=${h}`));
  socket.once('error', e => log(`socket: error ${String(e)}`));

  // First message = WorkerArgs (readMessages is callback-based)
  const workerArgs: any = await new Promise((resolve, reject) => {
    let settled = false;

    readMessages(socket, (msg: unknown) => {
      if (settled) return;
      settled = true;
      const action = (msg && typeof msg === 'object' && (msg as any).action) || '?';
      log(`WorkerArgs received (action=${action})`);
      resolve(msg);
    });

    const t = setTimeout(() => {
      if (!settled) { settled = true; reject(new Error('Timed out waiting for WorkerArgs')); }
    }, TIMEOUT);
    // @ts-ignore
    t.unref?.();
  });

  return { socket, workerArgs, hostForClient };
}

(async () => {
  try {
    // 0) Parse NetworkOptions from argv[2]
    const net: NetworkOptions = JSON.parse(process.argv[2] ?? '{}');
    if (!net || typeof net.port !== 'number' || !net.role) {
      throw new Error('Invalid NetworkOptions in argv[2]');
    }

    // 1) IPC handshake + first WorkerArgs
    const { socket, workerArgs, hostForClient } = await handshake(net);

    // 2) Optional: stop here for early debugging (attach to the launcher)
    if (process.env.MTE_STOP_AFTER_HANDSHAKE === '1') {
      const p = Number(process.env.MTE_DEBUG_LAUNCHER_PORT ?? 9231);
      log(`STOP_AFTER_HANDSHAKE on; opening inspector ${p} and waiting`);
      inspector.open(p, '127.0.0.1', /*wait*/ true);
      // keep the process alive while you inspect
      await new Promise(() => {});
    }

    // 3) Optional: run worker in plain Node (no VS Code/Electron)
    if (process.env.MTE_FAKE_EH === '1') {
      const nodePort = Number(process.env.MTE_FAKE_WORKER_PORT ?? 9232);
      const workerEntry = path.resolve(__dirname, 'runMochaWorker.js');
      log(`FAKE_EH on; spawning node --inspect-brk=${nodePort} ${workerEntry}`);

      const child = spawn(process.execPath, [`--inspect-brk=${nodePort}`, workerEntry], {
        stdio: 'inherit',
        env: {
          ...process.env,
          // pass WorkerArgs to worker
          MTE_WORKER_ARGS: JSON.stringify(workerArgs ?? {}),
          // (optional) pass IPC vars if your worker wants to reuse the same socket semantics
          MTE_IPC_HOST: hostForClient,
          MTE_IPC_PORT: String(net.port),
          MTE_IPC_ROLE: net.role,
        },
      });

      child.once('exit', (code, signal) => {
        log(`FAKE worker exited code=${code} signal=${signal ?? 'null'}`);
        try { writeMessage(socket, { type: 'finished' }); } catch {}
        socket.end();
        process.exit(code ?? 0);
      });

      return; // done
    }

    // 4) Normal path: launch VS Code Extension Host with @vscode/test-electron
    //    WorkerArgs are provided to the in-EH worker via env.
    const extensionDevelopmentPath = path.resolve(__dirname, '..');
    const extensionTestsPath      = path.resolve(__dirname, 'runMochaWorker.js');

    const version = process.env.VSCODE_VERSION || (workerArgs?.env?.VSCODE_VERSION ?? 'stable');
    const inspectExtPort = Number(process.env.INSPECT_EXTENSIONS_PORT ?? workerArgs?.env?.INSPECT_EXTENSIONS_PORT ?? 9229);

    await runTests({
      ...(version ? { version } : {}),
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [`--inspect-extensions=${inspectExtPort}`],
      extensionTestsEnv: {
        ...process.env,
        MTE_WORKER_ARGS: JSON.stringify(workerArgs ?? {}),
      },
    });

    try { writeMessage(socket, { type: 'finished' }); } catch {}
    socket.end();
    process.exit(0);
  } catch (err) {
    log(`failed: ${util.inspect(err, { depth: null })}`);
    process.exit(1);
  }
})();
