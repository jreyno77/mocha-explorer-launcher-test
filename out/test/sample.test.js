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
const assert = __importStar(require("assert"));
suite('Sample Test Suite', () => {
    test('basic arithmetic', () => {
        assert.strictEqual(1 + 1, 2, '1 + 1 should equal 2');
    });
    test('custom launcher exposes worker args', () => {
        // The custom launcher writes the worker args into the MTE_WORKER_ARGS
        // environment variable. It should always be defined (as an empty
        // object if parsing fails).
        const env = process.env.MTE_WORKER_ARGS;
        assert.ok(env !== undefined, 'MTE_WORKER_ARGS should be defined');
        // Attempt to parse JSON if present; this test just ensures no throw.
        try {
            JSON.parse(env);
        }
        catch (err) {
            assert.fail('MTE_WORKER_ARGS is not valid JSON');
        }
    });
});
//# sourceMappingURL=sample.test.js.map