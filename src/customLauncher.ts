// out/customLauncher.ts
import * as util from 'util';
import { runTests } from '@vscode/test-electron';

(async function () {
  try {
    const ipcOpts = JSON.parse(process.argv[2]); // { role, port, host }
    const extensionDevelopmentPath = process.env['VSCODE_WORKSPACE_PATH']!;
    const extensionTestsPath = require.resolve('./runMochaWorker');
    const version = process.env['VSCODE_VERSION']!;

    let launchArgs: string[] | undefined;
    if (process.env['VSCODE_LAUNCH_ARGS']) {
      launchArgs = JSON.parse(process.env['VSCODE_LAUNCH_ARGS']);
    }

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      version,
      launchArgs,
      extensionTestsEnv: {
        // CRITICAL: forward settings env so the worker sees MTE_DEBUG_WORKER, etc.
        ...process.env,
        MOCHA_WORKER_IPC_ROLE: ipcOpts.role,
        MOCHA_WORKER_IPC_PORT: String(ipcOpts.port),
        MOCHA_WORKER_IPC_HOST: ipcOpts.host ?? '127.0.0.1',
      },
    });
  } catch (err) {
    console.error(`Failed to run tests: ${util.inspect(err)}`);
    process.exit(1);
  }
})();
