// out/runMochaWorker.ts
import inspector from 'node:inspector';
import * as path from 'path';
import glob from 'glob';
import Mocha from 'mocha';
import { createConnection, receiveConnection, readMessages } from 'vscode-test-adapter-remoting-util';

// ---- Pause here until a debugger attaches (only when enabled) ----
if (process.env.MTE_DEBUG_WORKER === '1') {
  const port = Number(process.env.MTE_DEBUG_WORKER_PORT ?? 9240);
  inspector.open(port, '127.0.0.1', true); // wait=true => blocks until attach
}
// ------------------------------------------------------------------

type WorkerArgs = {
  action: 'load' | 'run' | 'loadTests' | 'runTests';
  files?: string | string[];
  mochaOptions?: Mocha.MochaOptions;
  runIds?: string[];
  env?: Record<string, string | null | undefined>;
};

function expand(globs: string | string[]) {
  const list = Array.isArray(globs) ? globs : [globs];
  const files = new Set<string>();
  for (const g of list) glob.sync(g, { nodir: true }).forEach(f => files.add(path.resolve(f)));
  return [...files];
}

(async () => {
  // Connect to the adapter (extension) and read the first message = WorkerArgs
  const role = (process.env.MOCHA_WORKER_IPC_ROLE ?? 'client') as 'client' | 'server';
  const port = Number(process.env.MOCHA_WORKER_IPC_PORT ?? 9449);
  const hostRaw = process.env.MOCHA_WORKER_IPC_HOST ?? 'localhost';
  const host = hostRaw === 'localhost' ? '127.0.0.1' : hostRaw;
  const timeoutMs = Number(process.env.MTE_IPC_TIMEOUT ?? 60000);
  const retryInterval = Number(process.env.MTE_RETRY_INTERVAL ?? 200);

  const socket = role === 'client'
    ? await createConnection(port, { host, timeout: timeoutMs, retryInterval })
    : await receiveConnection(port, { timeout: timeoutMs });

  const workerArgs = await new Promise<WorkerArgs>((resolve, reject) => {
    const onErr = (e: Error) => reject(e);
    socket.on('error', onErr);
    readMessages(socket, (msg: unknown) => {
      socket.off('error', onErr);
      resolve(msg as WorkerArgs); // first message from adapter
    });
  });

  // Apply any env the adapter sends
  if (workerArgs.env) {
    for (const [k, v] of Object.entries(workerArgs.env)) {
      if (v == null) delete (process.env as any)[k];
      else process.env[k] = v;
    }
  }

  const mocha = new Mocha(workerArgs.mochaOptions ?? {});
  const files = expand(workerArgs.files ?? 'out/test/**/*.js');
  files.forEach(f => mocha.addFile(f));

  if (workerArgs.action === 'load' || workerArgs.action === 'loadTests') {
    files.forEach(require); // let adapter discover
    return;
  }

  await new Promise<void>((resolve, reject) => {
    try { mocha.run(() => resolve()); } catch (e) { reject(e); }
  });
})();
