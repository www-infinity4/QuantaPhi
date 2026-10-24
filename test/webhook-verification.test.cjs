const assert = require('assert');
const { createHmac } = require('crypto');
const { handleRequest } = require('../workers/infinity-brain-clock/webhook-handler.mjs');

// Simple in‑memory mock that mimics the KV API used by the handler
class MockKV {
  constructor() {
    this.map = new Map();
  }
  async get(key) {
    return this.map.get(key);
  }
  async put(key, value, options) {
    // TTL handling is unnecessary for the unit test – we just store the value
    this.map.set(key, value);
  }
}

// Helper to generate a valid HMAC‑SHA256 signature (hex encoded)
function sign(body, secret) {
  const h = createHmac('sha256', secret);
  h.update(body);
  return h.digest('hex');
}

(async () => {
  const secret = 'test-secret';
  const eventId = 'event-12345';
  const payload = JSON.stringify({ foo: 'bar' });
  const validSignature = sign(payload, secret);

  const env = {
    WEBHOOK_SECRET: secret,
    WEBHOOK_DEDUP_KV: new MockKV(),
  };

  // First request – should be processed
  const req1 = new Request('https://example.com/webhook', {
    method: 'POST',
    headers: {
      'X-Event-ID': eventId,
      'X-Signature': validSignature,
    },
    body: payload,
  });

  const resp1 = await handleRequest(req1, env);
  assert.strictEqual(resp1.status, 200, 'First request should succeed');
  const json1 = await resp1.json();
  assert.deepStrictEqual(json1, { status: 'processed' }, 'First response payload');

  // Duplicate request – should be flagged as duplicate
  const reqDup = new Request('https://example.com/webhook', {
    method: 'POST',
    headers: {
      'X-Event-ID': eventId,
      'X-Signature': validSignature,
    },
    body: payload,
  });

  const respDup = await handleRequest(reqDup, env);
  assert.strictEqual(respDup.status, 200, 'Duplicate request should succeed');
  const jsonDup = await respDup.json();
  assert.deepStrictEqual(jsonDup, { status: 'duplicate' }, 'Duplicate response payload');

  // Invalid signature – should be rejected with 401
  const badSignature = 'deadbeef' + validSignature.slice(8);
  const reqBad = new Request('https://example.com/webhook', {
    method: 'POST',
    headers: {
      'X-Event-ID': 'event-bad',
      'X-Signature': badSignature,
    },
    body: payload,
  });

  const respBad = await handleRequest(reqBad, env);
  assert.strictEqual(respBad.status, 401, 'Invalid signature should be unauthorized');

  console.log('All webhook verification tests passed');
})();
