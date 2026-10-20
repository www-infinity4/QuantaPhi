// runner-auth.test.cjs
// Focused tests for the runner authentication fallback logic.

const assert = require('assert');

(async () => {
  // Dynamically import the ES module implementation.
  const { authenticate, verifyToken } = await import('../workers/infinity-brain-clock/runner-auth.mjs');

  // Helper to create a minimal Request‑like object.
  const makeRequest = authHeader => ({
    headers: {
      get: name => (name.toLowerCase() === 'authorization' ? authHeader : undefined)
    }
  });

  // 1. Invalid token should trigger fallback claim.
  const badReq = makeRequest('Bearer invalid.token.parts');
  const fallback = await authenticate(badReq);
  assert.strictEqual(fallback.sub, 'unknown', 'Fallback claim should have sub "unknown"');
  assert.ok(fallback.aud, 'Fallback claim should contain an audience');

  // 2. verifyToken should reject malformed tokens.
  let threw = false;
  try {
    await verifyToken('bad.token');
  } catch (e) {
    threw = true;
    assert.strictEqual(e.message, 'runner_identity_required');
  }
  assert.ok(threw, 'verifyToken must throw on malformed token');

  console.log('runner-auth tests passed');
})();
