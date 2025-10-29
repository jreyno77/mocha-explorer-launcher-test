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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const path = __importStar(require("path"));
const mocha_1 = __importDefault(require("mocha"));
const glob = __importStar(require("glob"));
/**
 * This function is the entry point for the VS Code integration test runner.
 * It will be executed inside the Extension Host after VS Code has started.
 *
 * The default implementation looks for test files under `out/test` and
 * executes them using Mocha. If you wish to customize the test location or
 * behaviour, update the `testsRoot` or Mocha options accordingly.
 */
function run() {
    // Create the Mocha test instance with BDD interface.
    const mocha = new mocha_1.default({
        ui: 'bdd',
        color: true,
        timeout: 30000,
    });
    // Determine the location of compiled tests. By default we assume that
    // tests live under `out/test` (compiled from `src/test`). If you relocate
    // your tests, adjust this path accordingly. The path is resolved relative
    // to this file's directory.
    const testsRoot = path.resolve(__dirname, 'test');
    return new Promise((resolve, reject) => {
        glob('**/*.test.js', { cwd: testsRoot }, (err, files) => {
            if (err) {
                return reject(err);
            }
            // Load each discovered test file into Mocha
            files.forEach((file) => mocha.addFile(path.resolve(testsRoot, file)));
            try {
                // Run the tests. resolve or reject the promise based on failures
                mocha.run((failures) => {
                    if (failures > 0) {
                        reject(new Error(`${failures} tests failed.`));
                    }
                    else {
                        resolve();
                    }
                });
            }
            catch (err) {
                reject(err);
            }
        });
    });
}
//# sourceMappingURL=runTests.js.map