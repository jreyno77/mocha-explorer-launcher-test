"use strict";
const path = require("path");
const Mocha = require("mocha");
const glob = require("glob");
function run() {
  const mocha = new Mocha({ ui: 'bdd', color: true, timeout: 30000 });
  const testsRoot = path.resolve(__dirname, 'test');
  return new Promise((resolve, reject) => {
    glob('**/*.test.js', { cwd: testsRoot }, (err, files) => {
      if (err) {
        return reject(err);
      }
      files.forEach((file) => mocha.addFile(path.resolve(testsRoot, file)));
      try {
        mocha.run((failures) => {
          if (failures > 0) {
            reject(new Error(`${failures} tests failed.`));
          } else {
            resolve();
          }
        });
      } catch (err2) {
        reject(err2);
      }
    });
  });
}
exports.run = run;