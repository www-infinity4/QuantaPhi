const assert = require('node:assert/strict');
const { set, get, del } = require('../utils/schedule-service.js');

(() => {
  const key = 'testKey';
  const value = { foo: 'bar' };

  // Ensure get returns undefined initially
  assert.equal(get(key), undefined);

  // Set value
  set(key, value);
  assert.deepEqual(get(key), value);

  // Delete value
  del(key);
  assert.equal(get(key), undefined);
})();
