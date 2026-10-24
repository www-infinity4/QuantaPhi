import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Cloudflare Workers webhook handler.
 *
 * Expects the following request headers:
 *   - X-Event-ID: a unique identifier for the webhook event
 *   - X-Signature: HMAC‑SHA256 signature of the raw request body, hex‑encoded
 *
 * Environment bindings (provided by Wrangler):
 *   - WEBHOOK_SECRET: secret used to compute the HMAC signature (a secret binding)
 *   - WEBHOOK_DEDUP_KV: KV namespace for deduplication of events
 */
export async function handleRequest(request, env) {
  // 1. Extract required headers
  const eventId = request.headers.get('X-Event-ID');
  const signature = request.headers.get('X-Signature');
  if (!eventId || !signature) {
    return new Response('Missing required headers', { status: 400 });
  }

  // 2. Retrieve the secret at runtime
  const secret = env.WEBHOOK_SECRET;
  if (!secret) {
    // This indicates a deployment‑time mis‑configuration
    return new Response('Server configuration error', { status: 500 });
  }

  // 3. Compute HMAC‑SHA256 of the raw request body
  const rawBody = await request.clone().arrayBuffer();
  const hmac = createHmac('sha256', secret);
  hmac.update(Buffer.from(rawBody));
  const expectedHex = hmac.digest('hex');

  // 4. Verify the signature using a timing‑safe comparison
  try {
    const providedBuf = Buffer.from(signature, 'hex');
    const expectedBuf = Buffer.from(expectedHex, 'hex');
    if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
      return new Response('Invalid signature', { status: 401 });
    }
  } catch (e) {
    // If the signature is not valid hex, treat it as a failure
    return new Response('Invalid signature format', { status: 401 });
  }

  // 5. Deduplication – check KV for the event ID
  const alreadySeen = await env.WEBHOOK_DEDUP_KV.get(eventId);
  if (alreadySeen) {
    return new Response(JSON.stringify({ status: 'duplicate' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 6. Store the event ID with a TTL of 24 hours (86400 seconds)
  await env.WEBHOOK_DEDUP_KV.put(eventId, '1', { expirationTtl: 86400 });

  // 7. Return success response
  return new Response(JSON.stringify({ status: 'processed' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
