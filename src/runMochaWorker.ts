// out/runMochaWorker.ts
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

  // Apply any env overrides the adapter wanted
  if (args.env) {
    for (const [k, v] of Object.entries(args.env)) {
      if (v == null) delete (process.env as any)[k]; else process.env[k] = v;
    }
  }

  // Your discovery/runner implementation:
  const mocha = new Mocha(args.mochaOptions ?? {});
  const files = expand(args.files ?? 'out/test/**/*.js');
  files.forEach(f => mocha.addFile(f));

  if (args.action === 'load') {
    // If you have a custom discovery protocol, send a tree here.
    // For now, just require files to let the adapter build titles/locations.
    files.forEach(require);
    return; // exit, the launcher will close the EH
  }

  // Run
  await new Promise<void>((resolve, reject) => {
    try { mocha.run(() => resolve()); } catch (e) { reject(e); }
  });
})();
