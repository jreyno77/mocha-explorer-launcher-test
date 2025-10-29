// src/runMochaWorker.ts
import * as path from 'path';
import Mocha from 'mocha';
import glob from 'glob';

// Mocha remoting helper (install as dev dep)
const remoting = require('vscode-test-adapter-remoting-util/out/mocha');

export = async function () {
  const mocha = new Mocha({
    ui: 'bdd',
    color: true,
    timeout: process.env.INSPECT_EXTENSIONS_PORT ? 0 : 30000
  });

  const testsRoot = path.resolve(__dirname, 'test');

  await new Promise<void>((resolve, reject) => {
    glob('**/*.test.js', { cwd: testsRoot }, (err, files) => {
      if (err) return reject(err);
      files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));
      resolve();
    });
  });

  await remoting.run(mocha);
};