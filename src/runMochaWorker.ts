// --- pause worker on first line when enabled ---
import inspector from 'node:inspector';
if (process.env.MTE_DEBUG_WORKER === '1') {
  const port = Number(process.env.MTE_DEBUG_WORKER_PORT ?? 9240);
  inspector.open(port, '127.0.0.1', true); // wait=true => blocks until debugger attaches
}
// ----------------------------------------------
// (rest of your file)
import * as path from 'path';
import glob from 'glob';
import Mocha from 'mocha';

type WorkerArgs = {
  action: 'load' | 'run';
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
  const raw = process.env.MTE_WORKER_ARGS;
  if (!raw) throw new Error('MTE_WORKER_ARGS missing');
  const args = JSON.parse(raw) as WorkerArgs;

  if (args.env) {
    for (const [k, v] of Object.entries(args.env)) {
      if (v == null) delete (process.env as any)[k]; else process.env[k] = v;
    }
  }

  const mocha = new Mocha(args.mochaOptions ?? {});
  const files = expand(args.files ?? 'out/test/**/*.js');
  files.forEach(f => mocha.addFile(f));

  if (args.action === 'load') {
    files.forEach(require);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    try { mocha.run(() => resolve()); } catch (e) { reject(e); }
  });
})();
