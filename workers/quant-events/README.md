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