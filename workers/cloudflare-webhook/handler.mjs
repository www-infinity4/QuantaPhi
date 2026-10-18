import { createHmac, timingSafeEqual } from 'node:crypto';

// In‑memory deduplication set. In a real deployment this would be a KV namespace.
const seenIds = new Set();

export default {
  async fetch(request) {
    const secret = process.env.CF_WEBHOOK_SECRET;
    if (!secret) {
      return new Response('Missing webhook secret', { status: 500 });
    }

    const signature = request.headers.get('CF-Webhook-Signature');
    if (!signature) {
      return new Response('Missing signature', { status: 401 });
    }

    // Read raw request body
    const rawBody = await request.arrayBuffer();
    const bodyBuffer = Buffer.from(rawBody);

    // Compute HMAC‑SHA256 digest
    const hmac = createHmac('sha256', secret);
    hmac.update(bodyBuffer);
    const digestHex = hmac.digest('hex');

    // Compare signatures using a timing‑safe compare
    const provided = Buffer.from(signature, 'hex');
    const expected = Buffer.from(digestHex, 'hex');
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      return new Response('Invalid signature', { status: 401 });
    }

    // Parse JSON payload
    let payload;
    try {
      payload = JSON.parse(bodyBuffer.toString());
    } catch (e) {
      return new Response('Invalid JSON payload', { status: 400 });
    }

    // Extract a unique identifier – prefer event.id, fall back to top‑level id
    const eventId = payload?.event?.id ?? payload?.id;
    if (!eventId) {
      return new Response('Missing event identifier', { status: 400 });
    }

    // Deduplication logic (in‑memory for demo purposes)
    if (seenIds.has(eventId)) {
      return new Response(JSON.stringify({ duplicate: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // First‑time processing – placeholder
    seenIds.add(eventId);
    return new Response(JSON.stringify({ processed: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
