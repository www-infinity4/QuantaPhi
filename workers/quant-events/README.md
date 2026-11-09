# QuantaPhi · Cloudflare D1 event ingestion, 100k+ DAU profile

**Status:** security-reviewed source proposal staged on QuantaPhi draft PR #1884; **not merged, migrated or deployed**. Read [`SCALING-100K-DAU.md`](./SCALING-100K-DAU.md) for scaling decisions, read-only Cloudflare schema observations, budget/privacy gates, and BI options.

## Package contents

| File | Purpose |
|---|---|
| `migrations/0001_quant_events.sql` | New `users`/`events` tables, compound user/type/time index, time retention index |
| `src/ingest.ts` | Strictly validated trusted POST ingestion; D1 multi-row prepared statements and optional Cloudflare Queue consumer |
| `wrangler.queue.example.jsonc` | **Example only** of a Queues-backed Worker profile, not a live configuration |
| `tests/ingest.test.mjs` | Existing endpoint regression/security tests |
| `tests/scaling.test.mjs` | Multi-row, Queue acceptance, retry, timestamp, fail-closed tests |
| `tests/sqlite-worker.test.mjs` | Real in-memory SQLite HTTP replay and Queue consumer integration tests |
| `tests/test_schema.py` | SQLite schema, index query plan, FK, timestamp and deletion tests |
| `tests/identity-security.test.mjs` | Signed user identity, consent gating, and fail-closed ingestion tests |

## Event request contract

The authenticated **server-to-server** caller POSTs JSON with a **nonempty `queries` array** of at most 100 structured event objects and at most 64 KiB body size. Generate an immutable event ID when the event occurs, and reuse it across retries. The user ID must come from a verified upstream account/session; **never** expose `INGEST_TOKEN` or a client-chosen `user.id` authority in browser/PWA code.

```json
{
  "user": { "id": "user-12345678", "device_type": "mobile" },
  "queries": [
    { "id": "event-11111111", "event_type": " Watches Football ", "target_entity": "NFL:Sports", "numerical_value": 1 },
    { "id": "event-22222222", "event_type": " BUYS Coins ", "target_entity": "store:coins", "numerical_value": 2 }
  ]
}
```

Behavioral tags become trimmed, whitespace-collapsed lower-case strings. Numbers must be finite JSON numeric values; timestamp `accepted_at_ms` is assigned by the Worker using `Date.now()` as an integer Unix epoch **milliseconds** value and carried unchanged to D1. `users.created_at` is also epoch milliseconds. `request.cf.region`, `regionCode`, and `postalCode` are the only source for geographic metadata, optionally null. **Default is no location collection.** Location enters Queue/D1 only when both a current server-signed geo consent claim and explicit `GEO_STORAGE_ENABLED=true` configuration exist. Edge location is approximate and not proof of residency; consent, retention, export, and erasure policies need an approved live integration.

## Required server-signed user identity

The service Bearer `INGEST_TOKEN` authenticates the sending service; it does **not** authorize trusting arbitrary `user.id` values. The existing signed-in QuantaPhi identity adapter must generate a **separate** short-lived HMAC proof from the verified authenticated subject, not the request JSON or any browser header. This is a **proposed integration contract**; no live identity adapter has been connected.

- Secret `USER_IDENTITY_HMAC_SECRET` must be provisioned only in the trusted source Worker and ingestion Worker, separate from `INGEST_TOKEN`. Do not expose either secret to browsers, logs, or GitHub.
- Source Worker sends headers `x-quant-identity-time: <epoch_ms>`, `x-quant-identity-geo: 0|1` (1 only if consent verified), and `x-quant-identity-signature: <lowercase SHA-256 hex HMAC>`.
- HMAC message is UTF-8 `v1\n<verified-user-id>\n<epoch_ms>\n<geo-flag>` with **literal newline separators**, SHA-256 keyed by `USER_IDENTITY_HMAC_SECRET`. The trusted source Worker must check that the JSON `user.id` matches the verified subject. Ingress independently verifies that match via the signed proof, and rejects missing, mismatched, tampered, or >5-minute-old claims (401).
- A missing identity secret returns 503; an absent, expired or forged proof returns 401. This is **not** an OAuth/JWT replacement or an extension of any user session; the proof comes from the existing authenticated gateway only.
- `GEO_STORAGE_ENABLED` defaults OFF. Even with the server flag enabled, only a proof with signed `geo=1` permits `request.cf.region`, `regionCode`, or `postalCode` to be enqueued or stored. The raw client cannot grant consent by setting a JSON field.

## Two explicit ingestion modes

**Recommended for 100k+ DAU: `INGEST_MODE=queue`**

- The fetch Worker validates, sanitizes, and submits one message into `EVENT_QUEUE`.
- Success responds HTTP 202 with `{"received":2,"accepted":2,"persisted":false}`. This is an enqueue receipt, **not** database persistence.
- If Queue is down/unbound, HTTP 503; no silent direct-write fallback.
- The Queue consumer assembles a single atomic `env.DB.batch([...])` from up to five messages (configuration example), with user first-seen inserts and up to 16 event rows per SQL INSERT. A D1 failure causes Queue retries; the `events.id` primary key prevents duplicate insertion.
- At most **96 bound parameters per INSERT** (16 rows * 6 parameters) and max **100 events per HTTP POST**. One full 100-event HTTP POST becomes 1 user insert + 7 event inserts; up to five Queue messages become no more than 40 prepared statements in the consumer D1 batch.

**`INGEST_MODE=direct` (explicitly selected staging/test only):** POST immediately writes one atomic `DB.batch` and returns `{received,inserted,duplicates}` with HTTP 201 for newly inserted rows or HTTP 200 for all duplicate IDs. Not the preferred default for unknown high peaks; missing/unknown `INGEST_MODE` fails closed (503) without reading or writing D1.

`users` metadata is **first-seen only** (the insert has `ON CONFLICT DO NOTHING`) to avoid an unnecessary profile UPDATE for each telemetry request. Do not treat this as up-to-date location or device inventory. A separate verified profile update API would be required if those properties must change.

## Integrate safely with existing QuantaPhi

1. Existing Cloudflare `quant-ai` already contains a different `quant_events` table (using TEXT `occurred_at`). **Do not rename, drop, migrate, or overwrite existing tables and do not route raw telemetry into wallet databases.** Choose an isolated telemetry D1, and verify the target Worker and correct binding first.
2. Review and copy only appropriate fields from `wrangler.queue.example.jsonc` into the **existing** project configuration. The example contains placeholder Worker/D1 IDs. Do not deploy it as-is. For an isolated test/staging database, run `wrangler d1 migrations apply YOUR_DATABASE_NAME --local` and a reviewed `--remote` staging migration. Apply a production migration only after backup, source approval, and compatibility review.
3. Configure both `INGEST_TOKEN` and `USER_IDENTITY_HMAC_SECRET` as Worker secrets, only in the trusted service-to-service path. Wire the existing signed-in account identity adapter to sign proof claims. Missing integration **must block activation**; do not fabricate a signed-in subject or permit browser-generated proof.
4. Provision the queue, dead-letter queue, and D1 **only after budget/authorization review**. Merge/CI/deploy through the authorized QuantaPhi pipeline, not from this standalone package. Verify Queue receipt and actual D1 readback separately; tests here do not establish production access or capacity.
5. Validate consent, privacy/retention/deletion, queue DLQ failure handling, and cost with realistic sample data before expanding traffic.

## Local tests

No npm install or backend required for these basic checks (Node 22+ TypeScript stripping, Python 3, `tsc`):

```bash
node --experimental-strip-types --test tests/*.test.mjs
python3 -m unittest discover -s tests -p 'test_*.py' -v
tsc -p tsconfig.json
```

These checks include real in-memory SQLite Worker integration, mock Queue/D1 bindings and Python SQLite schema tests. **Real Worker+D1 staging, load tests, retention jobs, and browser acceptance remain pending.**

## Signed Wallet bridge · staging source wired, collection OFF

The site Worker source accepts exactly `/api/quant-events` via a private
`EVENTS_BRIDGE` service binding to the isolated
`workers/quant-events/src/wallet-bridge.mjs` Worker (which itself permits
only POST). It is **fail-closed** by default:
the route returns HTTP 503 `event_collection_disabled` unless an approved
host-only `EVENTS_BRIDGE_ENABLED=true` configuration is set. No production
bindings, customer consent UI, or live data writes have been installed.

The bridge **reuses the existing** `walletIdentity(request,env)` in
`workers/bubbles-connections/router.mjs`, which calls the already available
Wallet verification service; raw browser `user` or `userId` fields are
rejected, and paired `bc_` browser identities cannot start telemetry. The
trusted account subject is mapped to a stable, *pseudonymous* event ID using
HMAC-SHA256 with `USER_IDENTITY_HMAC_SECRET`, rather than storing raw Wallet
account identifiers.

**Accepted event purpose and categories:** opt-in first-party analytics only.
Supported event types are `card_click`, `card_view`, `card_follow`,
`card_unfollow`, `card_hide`, `card_share`, `card_collect`, and
`card_like` with targets beginning `card:`, `media:` or `carousel:`.
Client event claims are NOT verified sales, payments, purchases or coin awards.
The bridge never transfers any Wallet/Quant/GIT/StarCoin balances.

**Consent backend (not yet activated):** a separate, *unapplied* D1 migration
`migrations/0002_quant_event_consents.sql` defines
`quant_event_consents(user_id,purpose,policy_version,consented_at_ms,revoked_at_ms)`.
Each request must find an active, nonrevoked, matching `v1` analytics consent
record for the authenticated pseudonymous account in `EVENT_CONSENT_DB`.
There is **no HTTP grant/write shortcut**, no default opt-in, no auto-populated
rows and no production consent-collection UI. Explicit user consent must be
reviewed before implementation. Revocations must prevent further collection;
legacy raw events require a separately approved retention/erasure procedure.

Required private **bridge Worker** future bindings/settings after review:
- Existing `BOT_WALLET` service binding for verified `/v1/wallet/state`.
- `EVENT_CONSENT_DB` D1 binding to the *isolated* event database containing
  the separately approved consent migration.
- `EVENTS_SERVICE` service binding to the separately deployed event ingress
  Worker; **never** use public URL fetch or browser secrets.
- Matching Worker-only `USER_IDENTITY_HMAC_SECRET` and `INGEST_TOKEN`,
  issued through Cloudflare secure secrets, NEVER committed to GitHub.
- `EVENTS_BRIDGE_ENABLED=true` in both bridge and site Workers only after independent privacy/security review,
  legal notice, opt-in UI, signed identity tests, configured Queue/DLQ,
  resource budget and approved staging acceptance.

**Site Worker** requires only an `EVENTS_BRIDGE` service binding to this
separately deployed bridge, plus a separately controlled
`EVENTS_BRIDGE_ENABLED` flag (default OFF). See
`wrangler.bridge.example.jsonc` for binding placeholders, not a deployment.

The bridge signs `geo=0` unconditionally; it does not import a browser
`request.cf` geography claim, preserving the privacy OFF default even if the
ingestion backend has a `GEO_STORAGE_ENABLED` toggle. Client Origin must be
`https://quantaphi.org` or `https://www.quantaphi.org`. Its service bearer
and HMAC identity signature never enter a browser response.

**Synthetic end-to-end test:** the CI suite verifies the central site route
fails closed, verifies the real Wallet verifier with a fake signed-in session,
checks consent grant/revocation, exercises a fully signed subrequest against the
actual ingest Worker in Queue mode, and checks receipt `persisted:false`.
These tests are not live Cloudflare authenticated-account acceptance.

**Operational release gate:** verify token scope, review data
retention/export/deletion, stage migration to an isolated D1, verify queue
→ database with test-user consent and no money, measure write pressure, and
explicitly enable telemetry only after a reviewed opt-in experience.
