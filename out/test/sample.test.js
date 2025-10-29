"use strict";
const assert = require("assert");

suite('Sample Test Suite', () => {
  test('basic arithmetic', () => {
    assert.strictEqual(1 + 1, 2, '1 + 1 should equal 2');
  });
  test('custom launcher exposes worker args', () => {
    const env = process.env.MTE_WORKER_ARGS;
    assert.ok(env !== undefined, 'MTE_WORKER_ARGS should be defined');
    try {
      JSON.parse(env);
    } catch (err) {
      assert.fail('MTE_WORKER_ARGS is not valid JSON');
    }
  });
});