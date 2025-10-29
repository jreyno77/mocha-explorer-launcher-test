"use strict";
const path = require("path");
const util = require("util");
const { runTests } = require("@vscode/test-electron");

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
    let workerArgs = {};
    try {
      workerArgs = JSON.parse(process.argv[2]);
    } catch (err) {
      console.warn('Custom launcher: could not parse WorkerArgs', err);
    }
    process.env.MTE_WORKER_ARGS = JSON.stringify(workerArgs);
    const workspacePath = process.env.VSCODE_WORKSPACE_PATH || process.cwd();
    const runTestsFile = process.env.RUN_TESTS_FILE || 'out/runTests.js';
    const extensionTestsPath = path.resolve(workspacePath, runTestsFile);
    const vscodeVersion = process.env.VSCODE_VERSION || 'stable';
    let launchArgs = undefined;
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
    const extensionDevelopmentPath = workspacePath;
    const ipcEnv = {};
    if (workerArgs && typeof workerArgs === 'object') {
      if (workerArgs.role) ipcEnv.MTE_IPC_ROLE = String(workerArgs.role);
      if (workerArgs.port) ipcEnv.MTE_IPC_PORT = String(workerArgs.port);
      if (workerArgs.host) ipcEnv.MTE_IPC_HOST = String(workerArgs.host);
    }
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