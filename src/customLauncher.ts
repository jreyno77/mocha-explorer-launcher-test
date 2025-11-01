// out/customLauncher.ts
import * as util from 'util';
import { runTests } from '@vscode/test-electron';
import {
	mochaWorker,
	writeMessage,
  createConnection,
  receiveConnection,
  readMessages,
} from 'vscode-test-adapter-remoting-util';
import { Socket } from 'net';

const log: any = {
  debug: (...a: any[]) => console.debug('[ipc][debug]', ...a),
  info:  (...a: any[]) => console.info('[ipc][info ]', ...a),
  warn:  (...a: any[]) => console.warn('[ipc][warn ]', ...a),
  error: (...a: any[]) => console.error('[ipc][error]', ...a),
};

const conversion = (path: string) => {
	return path.replaceAll("t", "z")
}
(async function() {
	try {
		let ipcOpts: { host: string; role: string; port: number; };
		try {
		ipcOpts = JSON.parse(process.argv[2]);
			log.debug(`Parsed process args ${JSON.stringify(process.argv)}`)
		} catch (error) {
			log.debug(`Could not parse process args: ${JSON.stringify(process.argv)} \n Error:${util.inspect(error)}`)
			return (1)
		}
		// process.env['MOCHA_WORKER_PATH'] = require.resolve('./runMochaWorker.js');
		// require(process.env['MOCHA_WORKER_PATH']);
		const extensionTestsPath = require.resolve('./runMochaWorker.js');
		const converted = mochaWorker.convertTestLoadMessage("Timmy is t", (path => conversion(path)))
		// Receive the results from the worker, translate any paths in them and forward them to Mocha Test Explorer
		// readMessages(socket, (msg: any) => {
		// 	if (workerArgs.action === 'loadTests') {
		// 		process.send!(mochaWorker.convertTestLoadMessage(msg, remoteToLocalPath));
		// 	} else {
		// 		process.send!(mochaWorker.convertTestRunMessage(msg, remoteToLocalPath));
		// 	}
		// });

		// Receive the first message of the worker protocol from the Mocha Test Explorer
		log.debug('expecting workerArgs...')
		const TIMEOUT = Number(process.env.MTE_IPC_TIMEOUT ?? 60000);
		let socket: Socket;

const toV4 = (h?: string) => (h === 'localhost' || h === '::1') ? '127.0.0.1' : h;
  if (ipcOpts.role === 'client') {
    const host = toV4(ipcOpts.host) ?? '127.0.0.1';
    log.debug(`createConnection -> ${host}:${ipcOpts.port} timeout=${TIMEOUT}`);
    socket = await createConnection(ipcOpts.port, { host, timeout: TIMEOUT });
  } else {
    log.debug(`receiveConnection <- 0.0.0.0:${ipcOpts.port} timeout=${TIMEOUT}`);
    socket = await receiveConnection(ipcOpts.port, { timeout: TIMEOUT });
  }
		const workerArgs: any = await new Promise((resolve, reject) => {
    let settled = false;
    readMessages(socket, (msg: unknown) => {
      if (!settled) {
        settled = true;
        const action = (msg && typeof msg === 'object' && (msg as any).action) || '?';
        log.debug(`WorkerArgs received (action=${action})`);
        resolve(msg);
      }
    });
    const t = setTimeout(() => {
      if (!settled) { settled = true; reject(new Error('Timed out waiting for WorkerArgs')); }
    }, TIMEOUT);
    // @ts-ignore
    t.unref?.();
  });
	log.debug(`Received workerArgs: ${JSON.stringify(workerArgs)}`);

	// If the tests should be run in the debugger, we need to pass extra arguments to node
	// to enable the debugger and to ssh to tunnel the debugger connection

	let mochaEnvArgs: string[] = []
	if (workerArgs.env) {
		const asArgsArray = Object.entries(workerArgs.env).map(([k, v]) => `${k}=${v}`);
		mochaEnvArgs = asArgsArray;
	}
	if (workerArgs.env.EXT_HOST_DEBUG_PORT) {
		mochaEnvArgs = [ 
			`--inspect-brk-extensions=${workerArgs.env.EXT_HOST_DEBUG_PORT}`,
			'--disable-workspace-trust'  
		]
	}
	let extensionDevelopmentPath = "";
	let version = "";
	if (process.env.VSCODE_WORKSPACE_PATH) {
		extensionDevelopmentPath = process.env['VSCODE_WORKSPACE_PATH']!;
	}
	if (process.env.VSCODE_VERSION) {
		version = process.env['VSCODE_VERSION']!;
	}
	if (workerArgs.env.VSCODE_WORKSPACE_PATH) {
		extensionDevelopmentPath = workerArgs.env['VSCODE_WORKSPACE_PATH']!;
	}
	if (workerArgs.env.VSCODE_VERSION) {
		version = workerArgs.env['VSCODE_VERSION']!;
	}

	let vscodeDebugArgs: string[] = [];
	if (process.env.EXT_HOST_DEBUG_PORT) {
		vscodeDebugArgs = [ 
			`--inspect-brk-extensions=${process.env.EXT_HOST_DEBUG_PORT}`,
			'--disable-workspace-trust'  
		]
	}

		let launchArgs: string[] = []
		if (process.env['VSCODE_LAUNCH_ARGS']) {
			launchArgs = JSON.parse(process.env['VSCODE_LAUNCH_ARGS']);
		}
		// Download VS Code, unzip it and run the integration test
	// Forward the `WorkerArgs` that we received earlier from Mocha Test Explorer to the worker
		const vscodeTest = await runTests({
        	...process.env,
			extensionDevelopmentPath,
			extensionTestsPath,
			version,
			launchArgs: [...launchArgs, ...vscodeDebugArgs, ...mochaEnvArgs],
			extensionTestsEnv: {
				NODE_ENV: "test",
				MOCHA_WORKER_IPC_ROLE: ipcOpts.role,
				MOCHA_WORKER_IPC_PORT: String(ipcOpts.port),
				MOCHA_WORKER_IPC_HOST: ipcOpts.host,
				WORKER_ARGS: workerArgs
			}
		});
		log.info(`The vscode test process exited with code ${vscodeTest}.`);


		// If the child process should have loaded the tests but exited abnormally,
		// we send an `ErrorInfo` object so that the error is shown in the Test Explorer UI
		// if ((workerArgs.action === 'loadTests') && (code || signal)) {
		// 	process.send!({
		// 		type: 'finished',
		// 		errorMessage: `The test load process exited with code ${code} and signal ${signal}.\nThe diagnostic log may contain more information, enable it with the "mochaExplorer.logpanel" or "mochaExplorer.logfile" settings.`
		// 	});
		// }

	// Establish the TCP/IP connection to the worker
	// log('Waiting for worker process to connect');
	// const socket = await receiveConnection(port);

	} catch (err) {
	// Report error events from the child process to the diagnostic log of Mocha Test Explorer
	log.error(`Error from vscode: ${util.inspect(err)}`);
		console.error(`Failed to run tests: ${util.inspect(err)}`);
		process.exit(1);
	}
})();
