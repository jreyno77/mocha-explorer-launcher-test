"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const path = __importStar(require("path"));
const util = __importStar(require("util"));
const test_electron_1 = require("@vscode/test-electron");
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
        let workerArgs = {};
        try {
            workerArgs = JSON.parse(process.argv[2]);
        }
        catch (err) {
            // If parsing fails, log and continue with an empty object. This
            // makes the launcher more robust when used outside of Test Explorer.
            console.warn('Custom launcher: could not parse WorkerArgs', err);
        }
        // Expose WorkerArgs as a JSON string so tests can introspect the
        // arguments if needed. Additional environment variables can be added
        // here to make specific WorkerArgs properties easier to consume.
        process.env.MTE_WORKER_ARGS = JSON.stringify(workerArgs);
        // Pass through any IPC configuration required by Mocha Test Explorer to
        // communicate with the worker process. If the WorkerArgs include
        // network options (role, port, host) they can be placed in the
        // extensionTestsEnv so the test harness can pick them up.
        const ipcEnv = {};
        if (workerArgs && typeof workerArgs === 'object') {
            if (workerArgs.role)
                ipcEnv.MTE_IPC_ROLE = String(workerArgs.role);
            if (workerArgs.port)
                ipcEnv.MTE_IPC_PORT = String(workerArgs.port);
            if (workerArgs.host)
                ipcEnv.MTE_IPC_HOST = String(workerArgs.host);
        }
        // Run the tests using VS Code's integration test runner. This will
        // download the specified VS Code version, launch it with the workspace
        // under test and then run the test script specified via extensionTestsPath.
        const runTestsFile = process.env.RUN_TESTS_FILE
            ? path.resolve(process.env.RUN_TESTS_FILE)
            : path.resolve(__dirname, 'runTests.js');
        const vscodeExecutablePath = process.env.VSCODE_EXECUTABLE_PATH;
        const inspectExtensionsPort = process.env.INSPECT_EXTENSIONS_PORT || '9229';
        const launchArgs = [
            // pause the extension host on start so we can attach a debugger:
            `--inspect-brk-extensions=${inspectExtensionsPort}`,
        ];
        // pass through any extra args Mocha Test Explorer gives you (optional):
        if (Array.isArray(workerArgs === null || workerArgs === void 0 ? void 0 : workerArgs.args))
            launchArgs.push(...workerArgs.args);
        const options = {
            extensionDevelopmentPath: path.resolve(__dirname, '..'),
            extensionTestsPath: runTestsFile,
            vscodeExecutablePath, // if undefined, it will try to download (which is what we’re avoiding)
            launchArgs,
            extensionTestsEnv: {
                ...process.env, // bring your MTE_* env through
            },
        };
        console.log('[launcher] options:', { vscodeExecutablePath, runTestsFile, launchArgs });
        await (0, test_electron_1.runTests)(options);
    }
    catch (err) {
        console.error(`Custom launcher failed to run tests: ${util.inspect(err)}`);
        process.exit(1);
    }
})();
//# sourceMappingURL=customLauncher.js.map