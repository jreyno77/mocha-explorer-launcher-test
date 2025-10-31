// out/customLauncher.ts
import * as util from 'util';
import { runTests } from '@vscode/test-electron';
import {
  createConnection,
  receiveConnection,
  readMessages,
} from 'vscode-test-adapter-remoting-util';
const basicLog: any = {
  debug: (...a: any[]) => console.debug('[ipc][debug]', ...a),
  info:  (...a: any[]) => console.info('[ipc][info ]', ...a),
  warn:  (...a: any[]) => console.warn('[ipc][warn ]', ...a),
  error: (...a: any[]) => console.error('[ipc][error]', ...a),
};

(async function() {
	try {
		const ipcOpts = JSON.parse(process.argv[2]);
		const resolvedHost = ipcOpts.host === 'localhost' ? '127.0.0.1' : ipcOpts.host;
		const timeoutMs = Number(process.env.MTE_IPC_TIMEOUT ?? 60000);

		const extensionDevelopmentPath = process.env['VSCODE_WORKSPACE_PATH']!;
		const extensionTestsPath = require.resolve('./runMochaWorker');
		const version = process.env['VSCODE_VERSION']!;

		let launchArgs: string[] | undefined;
		if (process.env['VSCODE_LAUNCH_ARGS']) {
			launchArgs = JSON.parse(process.env['VSCODE_LAUNCH_ARGS']);
		}
		
		const socket =
			ipcOpts.role === 'client'
				? await createConnection(ipcOpts.port, { host: resolvedHost, timeout: timeoutMs, log: basicLog})
				: await receiveConnection(ipcOpts.port, { timeout: timeoutMs, log: basicLog });
		const EH_DEBUG_PORT = Number(process.env.EXT_HOST_DEBUG_PORT ?? 9229);
		// Download VS Code, unzip it and run the integration test
		await runTests({
        	...process.env,
			extensionDevelopmentPath,
			extensionTestsPath,
			version,
			launchArgs: [
				`--inspect-brk-extensions=${EH_DEBUG_PORT}`,
				'--disable-workspace-trust'   // avoids “Networking not available” surprises
			],
			extensionTestsEnv: {
				NODE_ENV: "test",
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
