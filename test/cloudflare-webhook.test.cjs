const assert = require('node:assert');
const { createHmac } = require('node:crypto');

// Dynamically import the ES‑module handler
async function loadHandler() {
  const mod = await import('../workers/cloudflare-webhook/handler.mjs');
  return mod.default;
}

function makeRequest(payload, secret) {
  const body = JSON.stringify(payload);
  const signature = createHmac('sha256', secret).update(body).digest('hex');
  const headers = new Headers();
  headers.set('CF-Webhook-Signature', signature);
  return new Request('https://example.com/webhook', {
    method: 'POST',
    headers,
    body,
  });
}

(async () => {
  const secret = 'test-secret';
  process.env.CF_WEBHOOK_SECRET = secret;

  const handler = await loadHandler();

  const payload = { event: { id: 'evt-123' }, data: 'sample' };

  // First request – should be processed
  const req1 = makeRequest(payload, secret);
  const res1 = await handler.fetch(req1);
  const json1 = await res1.json();
  assert.deepStrictEqual(json1, { processed: true }, 'first request should be processed');

  // Duplicate request – should be flagged as duplicate
  const req2 = makeRequest(payload, secret);
  const res2 = await handler.fetch(req2);
  const json2 = await res2.json();
  assert.deepStrictEqual(json2, { duplicate: true }, 'duplicate request should be detected');

  console.log('All Cloudflare webhook tests passed');
})();
