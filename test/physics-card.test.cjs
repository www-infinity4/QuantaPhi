const assert = require('assert');
const { test } = require('node:test');
const {
  submitPhysicsCardDesign,
  getPhysicsCardBuyerCount,
  _mockStorage
} = require('../physics-card.js');

test('physics card design submission increments buyer count', (t) => {
  // Reset mock storage
  _mockStorage.clear();

  // Ensure initial count is 0
  assert.strictEqual(getPhysicsCardBuyerCount(), 0);

  // Submit a design
  submitPhysicsCardDesign({
    title: 'Quantum Entanglement',
    description: 'A card about entangled particles.',
    imageUrl: 'https://example.com/entangle.png'
  });

  // Verify count incremented
  assert.strictEqual(getPhysicsCardBuyerCount(), 1);
});