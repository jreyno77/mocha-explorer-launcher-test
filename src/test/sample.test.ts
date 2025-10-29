import * as assert from 'assert';

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
      JSON.parse(env!);
    } catch (err) {
      assert.fail('MTE_WORKER_ARGS is not valid JSON');
    }
  });
});