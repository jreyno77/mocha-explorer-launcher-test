import * as path from 'path';
import * as util from 'util';
import { runTests } from '@vscode/test-electron';

/**
 * This launcher script is intended to be used by the Mocha Test Explorer
 * extension. When Mocha Test Explorer is configured with the
 * `mochaExplorer.launcherScript` setting, it will spawn this module in
 * a worker process. The first argument (process.argv[2]) contains a JSON
 * encoded `WorkerArgs` object with details about what the worker should do.
 *
 * This script reads that object and then launches the VS Code test runner
 * via `@vscode/test-electron.runTests()`. The test runner itself is defined
 * in a separate file (the runTests file) whose path can be passed via
 * VS Code's settings. The path to the runTests file should be provided via
 * the environment variable `RUN_TESTS_FILE`. If unset, it defaults to
 * `out/runTests.js` relative to the workspace root.
 *
 * The script also exposes the worker arguments to the test environment via
 * environment variables prefixed with `MTE_` (Mocha Test Explorer). This
 * allows test code to introspect how it was launched.
 */
(async function main() {
  try {
    // Parse the WorkerArgs passed by Mocha Test Explorer. Not all fields
    // are required for this simple implementation, but we expose the
    // entire object via a single environment variable.
    let workerArgs: any = {};
    try {
      workerArgs = JSON.parse(process.argv[2]);
    } catch (err) {
      // If parsing fails, log and continue with an empty object. This
      // makes the launcher more robust when used outside of Test Explorer.
      console.warn('Custom launcher: could not parse WorkerArgs', err);
    }

    // Expose WorkerArgs as a JSON string so tests can introspect the
    // arguments if needed. Additional environment variables can be added
    // here to make specific WorkerArgs properties easier to consume.
    process.env.MTE_WORKER_ARGS = JSON.stringify(workerArgs);

    // Determine the workspace path. VS Code will set VSCODE_WORKSPACE_PATH
    // when launching the script, but fall back to the cwd if undefined.
    const workspacePath = process.env.VSCODE_WORKSPACE_PATH || process.cwd();

    // Determine the runTests script file. This should be a compiled JS file
    // (CommonJS module) relative to the workspace. Use RUN_TESTS_FILE if
    // provided, otherwise default to the build output of src/runTests.ts.
    const runTestsFile = process.env.RUN_TESTS_FILE || 'out/runTests.js';
    const extensionTestsPath = path.resolve(workspacePath, runTestsFile);

    // Determine which version of VS Code to run the tests under. Use
    // VSCODE_VERSION if provided (e.g. "stable" or "insiders"), otherwise
    // default to "stable".
    const vscodeVersion = process.env.VSCODE_VERSION || 'stable';

    // Optional extra launch arguments to VS Code can be provided via
    // VSCODE_LAUNCH_ARGS. If the variable is defined, parse it as JSON
    // expecting an array of strings. When undefined or invalid, ignore it.
    let launchArgs: string[] | undefined = undefined;
    if (process.env.VSCODE_LAUNCH_ARGS) {
      try {
        const parsed = JSON.parse(process.env.VSCODE_LAUNCH_ARGS);
        if (Array.isArray(parsed)) {
          launchArgs = parsed;
        }
      } catch (err) {
        console.warn('Custom launcher: could not parse VSCODE_LAUNCH_ARGS', err);
      }
    }

    // Compute extensionDevelopmentPath. This is the workspace root which contains
    // the extension's package.json. When running tests outside of an
    // extension (for example, plain Mocha tests), setting this to the
    // workspace still works and VS Code will start with the workspace open.
    const extensionDevelopmentPath = workspacePath;

    // Pass through any IPC configuration required by Mocha Test Explorer to
    // communicate with the worker process. If the WorkerArgs include
    // network options (role, port, host) they can be placed in the
    // extensionTestsEnv so the test harness can pick them up.
    const ipcEnv: Record<string, string> = {};
    if (workerArgs && typeof workerArgs === 'object') {
      if (workerArgs.role) ipcEnv.MTE_IPC_ROLE = String(workerArgs.role);
      if (workerArgs.port) ipcEnv.MTE_IPC_PORT = String(workerArgs.port);
      if (workerArgs.host) ipcEnv.MTE_IPC_HOST = String(workerArgs.host);
    }

    // Run the tests using VS Code's integration test runner. This will
    // download the specified VS Code version, launch it with the workspace
    // under test and then run the test script specified via extensionTestsPath.
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      version: vscodeVersion,
      launchArgs,
      extensionTestsEnv: ipcEnv,
    });
  } catch (err) {
    console.error(`Custom launcher failed to run tests: ${util.inspect(err)}`);
    process.exit(1);
  }
})();