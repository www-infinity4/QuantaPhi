const test = require('node:test');
const assert = require('node:assert/strict');

function fresh() {
  delete require.cache[require.resolve('../switchboard-matrix.js')];
  return require('../switchboard-matrix.js');
}

test('initial state is empty and snapshot remains a plain object', () => {
  const sb = fresh();
  assert.deepEqual(sb.getActivePatches(), {});
  assert.equal(Object.getPrototypeOf(sb.getActivePatches()), Object.prototype);
});

test('connect adds a patch entry', () => {
  const sb = fresh();
  sb.connect('jack_gemini_out', 'plug_ibm_circular_port_v1');
  assert.deepEqual(sb.getActivePatches(), { jack_gemini_out: 'plug_ibm_circular_port_v1' });
});

test('disconnect removes the patch entry', () => {
  const sb = fresh();
  sb.connect('jack_gemini_out', 'plug_ibm_circular_port_v1');
  sb.disconnect('jack_gemini_out');
  assert.deepEqual(sb.getActivePatches(), {});
});

test('reserved JavaScript property names behave as ordinary port IDs', () => {
  const sb = fresh();
  for (const key of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
    sb.connect(key, `plug_${key}`);
    const snapshot = sb.getActivePatches();
    assert.equal(Object.hasOwn(snapshot, key), true, `missing ${key}`);
    assert.equal(snapshot[key], `plug_${key}`);
    assert.equal(Object.getPrototypeOf(snapshot), Object.prototype);
    sb.disconnect(key);
    assert.equal(Object.hasOwn(sb.getActivePatches(), key), false);
  }
  assert.equal(Object.prototype.polluted, undefined);
});

test('snapshots cannot mutate the internal registry', () => {
  const sb = fresh();
  sb.connect('a', 'b');
  const snapshot = sb.getActivePatches();
  snapshot.a = 'wrong';
  snapshot.c = 'wrong';
  assert.deepEqual(sb.getActivePatches(), { a: 'b' });
});

test('invalid ports are rejected without changing existing patches', () => {
  const sb = fresh();
  sb.connect('a', 'b');
  for (const value of ['', '  ', null, undefined, 42, {}]) {
    assert.throws(() => sb.connect(value, 'b'), TypeError);
    assert.throws(() => sb.connect('a', value), TypeError);
    assert.throws(() => sb.disconnect(value), TypeError);
  }
  assert.deepEqual(sb.getActivePatches(), { a: 'b' });
});
