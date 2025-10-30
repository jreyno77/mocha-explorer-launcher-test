import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import { runTests } from '@vscode/test-electron';
(async () => {
  try {
    // Parse WorkerArgs (present when MTE launches you)
    let workerArgs: any = undefined;
    try { workerArgs = JSON.parse(process.argv[2]); } catch {}

    const isMochaExplorerRun =
      !!workerArgs && typeof workerArgs === 'object' &&
      ('role' in workerArgs || 'port' in workerArgs || 'host' in workerArgs);

    // Expose WorkerArgs AFTER detection
    process.env.MTE_WORKER_ARGS = JSON.stringify(workerArgs ?? {});

    // Gather IPC env for remoting util
    const ipcEnv: Record<string,string> = {};
    if (workerArgs?.role) ipcEnv.MTE_IPC_ROLE = String(workerArgs.role);
    if (workerArgs?.port) ipcEnv.MTE_IPC_PORT = String(workerArgs.port);
    if (workerArgs?.host) ipcEnv.MTE_IPC_HOST = String(workerArgs.host);

    // Choose test entry
    const runTestsFile = process.env.RUN_TESTS_FILE
      ? path.resolve(process.env.RUN_TESTS_FILE)
      : path.resolve(__dirname, 'runTests.js');

    const extensionTestsPath = isMochaExplorerRun
      ? path.resolve(__dirname, 'runMochaWorker.js') // <-- required for MTE IPC
      : runTestsFile;

    // Require a local VS Code binary (we set it via mochaExplorer.env)
    // const vscodeExecutablePath = process.env.VSCODE_EXECUTABLE_PATH;
    // if (!vscodeExecutablePath || !fs.existsSync(vscodeExecutablePath)) {
    //   console.error('[launcher] VSCODE_EXECUTABLE_PATH is not set or invalid.');
    //   process.exit(2);
    // }

    const launchArgs = []
    if (Array.isArray(workerArgs?.args)) launchArgs.push(...workerArgs.args);

    await runTests({
      extensionDevelopmentPath: path.resolve(__dirname, '..'),
      extensionTestsPath,
      launchArgs,
      extensionTestsEnv: { ...process.env, ...ipcEnv }
    });
  } catch (err) {
    console.error(`Custom launcher failed to run tests: ${util.inspect(err)}`);
    process.exit(1);
  }
})();