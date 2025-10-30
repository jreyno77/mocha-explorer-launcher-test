import * as util from 'util';
import { runTests } from '@vscode/test-electron';
import inspector from 'node:inspector';
import {
  createConnection,
  receiveConnection,
  readMessages,
  // writeMessage // if/when you relay results back
} from 'vscode-test-adapter-remoting-util';

type IpcRole = 'server' | 'client';
type NetworkOptions = { host?: string; port: number; role: IpcRole };
const basicLog: any = {
  debug: (...a: any[]) => console.debug('[ipc][debug]', ...a),
  info:  (...a: any[]) => console.info('[ipc][info ]', ...a),
  warn:  (...a: any[]) => console.warn('[ipc][warn ]', ...a),
  error: (...a: any[]) => console.error('[ipc][error]', ...a),
};

// enable debugging of the launcher itself (so you can see argv[2] in locals)
if (process.env.MTE_DEBUG_LAUNCHER === '1') {
  const port = Number(process.env.MTE_DEBUG_LAUNCHER_PORT ?? 9231);
  inspector.open(port, '127.0.0.1', true); // wait=true breaks on first line
}

(async function() {
	try {

		// The IPC options specify how the worker should connect to Mocha Explorer
		const ipcOpts = JSON.parse(process.argv[2]);
		const resolvedHost = ipcOpts.host === 'localhost' ? '127.0.0.1' : ipcOpts.host;
		const timeoutMs = Number(process.env.MTE_IPC_TIMEOUT ?? 60000);

		// The folder containing the Extension Manifest package.json
		// Passed to `--extensionDevelopmentPath`
		const extensionDevelopmentPath = process.env['VSCODE_WORKSPACE_PATH']!;

		// The path to the extension test script
		// Passed to --extensionTestsPath
		const extensionTestsPath = require.resolve('./runMochaWorker');

		// The VS Code version to download
		const version = process.env['VSCODE_VERSION']!;

		// Optional launch arguments to VS Code
		let launchArgs: string[] | undefined;
		if (process.env['VSCODE_LAUNCH_ARGS']) {
			launchArgs = JSON.parse(process.env['VSCODE_LAUNCH_ARGS']);
		}
		
const socket =
  ipcOpts.role === 'client'
    ? await createConnection(ipcOpts.port, { host: resolvedHost, timeout: timeoutMs, log: basicLog})
    : await receiveConnection(ipcOpts.port, { timeout: timeoutMs, log: basicLog });

		// Download VS Code, unzip it and run the integration test
		await runTests({
			extensionDevelopmentPath,
			extensionTestsPath,
			version,
			launchArgs,
			extensionTestsEnv: {
				MOCHA_WORKER_IPC_ROLE: ipcOpts.role,
				MOCHA_WORKER_IPC_PORT: String(ipcOpts.port),
				MOCHA_WORKER_IPC_HOST: ipcOpts.host
			}
		});

	} catch (err) {
		console.error(`Failed to run tests: ${util.inspect(err)}`);
		process.exit(1);
	}
})();