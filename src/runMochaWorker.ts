debugger
import * as path from 'path';
import glob from 'glob';
import Mocha from 'mocha';

type WorkerArgs = {
  action: 'load' | 'run' | 'loadTests' | 'runTests';
  files?: string | string[];
  mochaOptions?: Mocha.MochaOptions;
  runIds?: string[];
  env?: Record<string, string | null | undefined>;
};

/*

process.on('message', async (args) => {
  if (args.action === 'load') {
    send({ type: 'started' });                                  // TestLoadStartedEvent
    const suiteTree = await buildSuiteTreeWithMocha(args.opts); // -> TestSuiteInfo
    send({ type: 'finished', suite: suiteTree });               // TestLoadFinishedEvent
  } else if (args.action === 'run') {
    send({ type: 'started', tests: args.tests });               // TestRunStartedEvent
    await runWithMocha(args.tests, (evt) => send(evt));         // TestSuiteEvent/TestEvent
    send({ type: 'finished' });                                  // TestRunFinishedEvent
  }
});
*/

/**
 * This function is the entry point for the VS Code integration test runner.
 * It will be executed inside the Extension Host after VS Code has started.
 *
 * The default implementation looks for test files under `out/test` and
 * executes them using Mocha. If you wish to customize the test location or
 * behaviour, update the `testsRoot` or Mocha options accordingly.
 */
export function run(): Promise<void> {
  // Create the Mocha test instance with BDD interface.
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: process.env.INSPECT_EXTENSIONS_PORT ? 0 : 30000, // no timeouts while debugging
  });

  // Determine the location of compiled tests. By default we assume that
  // tests live under `out/test` (compiled from `src/test`). If you relocate
  // your tests, adjust this path accordingly. The path is resolved relative
  // to this file's directory.
  const testsRoot = path.resolve(__dirname, 'test');

  return new Promise((resolve, reject) => {
    glob('**/*.test.js', { cwd: testsRoot }, (err, files) => {
      if (err) return reject(err);
      // Load each discovered test file into Mocha
      console.log('[runTests] loading test files:', files);
      files.forEach((file) => mocha.addFile(path.resolve(testsRoot, file)));
      try {
        // Run the tests. resolve or reject the promise based on failures
        const runner = mocha.run(failures => {
          if (failures > 0) {
            reject(new Error(`${failures} test(s) failed.`));
          } else {
            resolve();
          }
        });
        runner.on('fail', (test, error) => {
          console.error('[runTests] FAIL:', test.fullTitle(), error);
        });
      } catch (err) {
        reject(err);
      }
    });
  });
}
