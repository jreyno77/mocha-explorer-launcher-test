// src/runMochaWorker.ts
import * as path from 'path';
import Mocha from 'mocha';
import glob from 'glob';

const remoting = require('vscode-test-adapter-remoting-util/out/mocha');

export = async function () {
  console.log('[worker] MTE_IPC_ROLE=%s host=%s port=%s',
    process.env.MTE_IPC_ROLE, process.env.MTE_IPC_HOST, process.env.MTE_IPC_PORT);

  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: process.env.INSPECT_EXTENSIONS_PORT ? 0 : 30000
  });

  const testsRoot = path.resolve(__dirname, 'test');

  const files = await new Promise<string[]>((resolve, reject) => {
    glob('**/*.test.js', { cwd: testsRoot }, (err, f) => err ? reject(err) : resolve(f));
  });
  console.log('[worker] discovered test files:', files);

  files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

  // Let the adapter drive the run via IPC; remoting.run(mocha) will run mocha
  // and report to the adapter over the configured IPC channel.
  await remoting.run(mocha);
  console.log('[worker] remoting.run(mocha) completed');
};