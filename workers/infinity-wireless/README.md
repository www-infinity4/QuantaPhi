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

## Verified infrastructure and remaining production gates

### Verified on 2026-11-02 (Central Time)

- Cloudflare account: dedicated U.S.-jurisdiction D1 database
  `quantaphi-infinity-wireless-orders` (ID `230c8dde-fc97-485b-94ad-4b092684bf76`),
  read replication disabled.
- All three SQL tables created and verified through the Cloudflare D1 API.
- Worker `quantaphi-infinity-wireless-orders` uploaded, bound to this D1,
  with securely generated private `RATE_SALT` Worker secret.
- Separate staging address enabled:
  `https://quantaphi-infinity-wireless-orders.marvaseater.workers.dev`.
- GitHub Actions contract run:
  https://github.com/www-infinity4/QuantaPhi/actions/runs/41556019029
  (Node syntax/contract tests and live D1 Worker health readback passed).
- GitHub Actions end-to-end staging smoke:
  https://github.com/www-infinity4/QuantaPhi/actions/runs/41556165978
  (actual write, private token readback, denied cross-origin request,
  unauthorized status lookup, idempotent retry, conflicting retry rejection passed).
- Synthetic test order and test rate-limit hash deleted. Cloudflare D1 readback:
  zero orders, zero events, zero daily-limit rows after cleanup.

### Still required before public activation

1. Review card accessibility, responsive layout and copy in a real browser
   using the exact merged site assets. CI alone is not browser verification.
2. Publish privacy and retention policy; configure sustained abuse protection,
   rate-limit cleanup and operational review for planning requests.
3. Merge the PR only after review and checks. The Worker staging endpoint and
   D1 are real, but the production `quantaphi.org/api/wireless/*` route has
   **not** been added. Confirm route priority against the existing site Worker.
4. Deploy site assets and production route separately; submit a non-customer
   planning test through the live site, verify same-origin write and token
   readback, and delete the synthetic test data.
5. A ticket only requests network development. Actual cellular service would
   additionally require lawful radio authorization, backhaul, certified
   equipment, operator agreements, appropriate emergency-service plans
   and physical device testing.

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
