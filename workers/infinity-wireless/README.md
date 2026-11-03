# Infinity Wireless order intake — deployment gate

This is a **planning intake**, not an ISP, radio activation, provisioning system or
live automated switchboard. It must **not** say that carrier infrastructure is under
Infinity control. No customer's emergency calling or existing mobile service is changed.

## Source of truth

- Customer-facing card: `/wireless/`; request client `wireless/order.mjs`.
- Cloudflare Worker: `workers/infinity-wireless/worker.mjs`.
- Storage: separate Cloudflare D1 database binding `WIRELESS_DB`.
- Schema: `workers/infinity-wireless/schema.sql`.
- `POST /api/wireless/orders` accepts coarse city/state, goal, possible backhaul,
  explicit planning-only acknowledgement, and random 256-bit idempotency key.
- Server returns a verified D1 receipt (`IW-...`) **only after readback**.
  Browser stores the random secret locally for status lookups.
- `GET /api/wireless/orders/:id` requires the original secret in an Authorization
  header; database stores its SHA-256 digest, never the plaintext secret.
- GET `/api/wireless/health` checks D1 schema availability.
- The event ledger records request receipt and **screening pending** only.
  An AI plan, carrier partnership, SIM activation or radio signal is NOT implied.

## Required pre-deploy steps (not automatically completed by this PR)

1. Create a new D1 database named `quantaphi-infinity-wireless-orders`.
2. Apply `schema.sql` to that database (migration, not just a local test).
3. Prepare a Wrangler config with worker name `quantaphi-infinity-wireless-orders`,
   entry `worker.mjs`, D1 binding `WIRELESS_DB` and the *actual* D1 database ID.
   Reserve the route `quantaphi.org/api/wireless/*` and confirm route priority.
   Do **not** guess IDs or overwrite the QuantaPhi site worker.
4. Set worker secret `RATE_SALT` to independently generated 32+ random bytes.
   Do not commit it. Verify Cloudflare bot/WAF/rate rules for public order intake.
5. Test post + authenticated readback, invalid/no token, wrong-origin rejection,
   duplicate idempotency, over-limit and D1-down results against a staging route.
6. Browser-verify mobile widths, keyboard navigation, and failure behavior. Then
   review/merge and deploy the distinct Worker and site assets separately.

## Operational policy

Only city and state are collected; no exact GPS, address, phone, email, SIM,
IMSI, ICCID, payment details, or network credentials. Minimize retention of
rate-limit hashes (periodic purge) and order records under a published policy
before public launch. Restrict D1 query, export and administrative access.
No customer-submitted values authorize transmitting RF or using someone else's
towers. Escalate actual RF, site, carrier, spectrum and emergency service
readiness to qualified engineering and regulatory review.

**Safety acceptance:** verified order receipt != active service; checked boxes
!= physical coverage. On backend failure show unavailable, never synthetic success.
