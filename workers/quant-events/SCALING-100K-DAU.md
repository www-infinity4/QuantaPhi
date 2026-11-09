# QuantaPhi first-party telemetry: >100,000 DAU capacity profile

**Decision 2026-11-08:** Recommend a Queues-backed ingestion tier with an isolated D1 operational store; defer BI product selection. This is source-ready configuration and test coverage, **not** a deployed system, a measured capacity guarantee, or approval to create billable resources.

## Cloudflare resource findings (read-only, 2026-11-08)

- The connected account has an existing `quant-ai` D1 database with a `quant_events` table, whose `occurred_at` field is TEXT and whose columns are not the requested `users`/`events` schema. There is also a separate `quantaphi-quick-cards` D1 database. Do not modify or reinterpret `quant_events` as the new millisecond telemetry store.
- Prefer a dedicated, non-wallet event D1 binding `DB` for this deployment **after** choosing whether its costs and privacy controls are acceptable. Do not repurpose `infinity-ledger`, `quantaphi-gitcoin-ledger`, or any existing money/coin store.
- Relevant QuantaPhi continuity issues: #1315 (first-party ranked feed and privacy-aware events), #1674 (genuine Media Star click receipts). These are not payment authorization. Follow the existing QuantaPhi ticket/review process before any source integration or deployment.

## Capacity math: DAU is not events/sec

| Scenario | Events per active user/day | Events/day at 100,000 DAU | **Average events/sec** | Illustrative 20x burst events/sec (NOT measured) |
|---|---:|---:|---:|---:|
| Sparse | 5 | 500,000 | 5.8 | 116 |
| Ordinary | 20 | 2,000,000 | 23.1 | 463 |
| Heavy | 100 | 10,000,000 | 115.7 | 2,315 |

Actual request RPS depends on the number of events per POST, client batching, retry behavior, geography and time-of-day. These illustrative figures are not capacity reservations or proven peak rates. Event payloads are capped at 100 events per trusted request (64 KiB max).

**Database sizing warning:** At a *hypothetical* 250–500 stored bytes per event including some index/storage overhead (must be measured), 2 million events/day occupy roughly 0.5–1.0 GB/day. A paid D1 database is capped at 10 GB, so indiscriminate long-term raw-event retention in one D1 would not be viable. Measure actual D1 file-size growth; keep operational data short-lived and aggregate/archive older records subject to a documented consent and retention policy.

## Ingestion and batching decisions

1. **Ingress:** validate authenticated service principal; obtain user ID from the verified upstream identity, not arbitrary browser JSON. Enforce `queries` as a structured nonempty array, bounded body/event counts, normalized tags, and finite numbers. Assign `accepted_at_ms = Date.now()` once at ingress and preserve it on all retries.
2. **Queued path (`INGEST_MODE=queue`):** after successful `EVENT_QUEUE.send(...)`, respond HTTP 202 with `accepted` and `persisted:false`. If enqueue fails or binding is absent, return 503 (do not silently switch to direct). No client receives a fictitious D1 inserted receipt.
3. **Consumer:** starting configuration: `max_batch_size=5` Queue messages, timeout 3 seconds, 8 retry attempts, a dead-letter queue, and max 2 consumers to start. The consumer can process up to 5 * 100 = 500 events via one atomic `DB.batch` of at most 40 prepared statements (5 user inserts + 5 * 7 multi-row event inserts). Actual D1 write serialization can still create a queue backlog; **benchmark before increasing concurrency**. A D1 failure throws so Queue retries; event primary keys make retry idempotent.
4. **SQL statement:** group 16 events per `INSERT INTO events ... VALUES... ON CONFLICT(id) DO NOTHING`, 6 bound parameters per row = 96 values, under D1's current 100-bound-parameter limit. `users` uses `ON CONFLICT DO NOTHING` to avoid rewriting profile fields for every event request; first-seen geography is not ongoing geolocation. D1 `batch()` remains atomic at the consumer-invocation level.
5. **Direct fallback:** retain `INGEST_MODE=direct` for staging/trusted internal callers only. It is an explicitly configured mode, not a fallback after a queue outage.

### Cloudflare platform ceilings to verify before purchase/deploy

- D1 paid max database size: 10 GB; one D1 database executes queries serially; paid D1 max bound parameters per statement: 100. D1 throughput depends on measured SQL duration, not DAU count.
- Queues maximum consumer batch: 100 messages; one queue producer supports up to 5,000 messages/sec under current limits; this is *not* the sustainable write capacity of a single D1 consumer database.
- D1 and Queues have plan- and usage-dependent charges. Never infer free operation at 100,000+ DAU; check current pricing and owner budget before creating resources.

Sources:
- https://developers.cloudflare.com/d1/platform/limits/
- https://developers.cloudflare.com/d1/reference/faq/
- https://developers.cloudflare.com/queues/platform/limits/
- https://developers.cloudflare.com/queues/configuration/batching-retries/
- https://developers.cloudflare.com/d1/platform/pricing/

## Index choices and query contracts

**Keep now:**

- `users(id PRIMARY KEY)` for trusted identity lookup and first-seen user insertion.
- `events(id PRIMARY KEY)` for idempotency across retries and consumer replays.
- `idx_events_user_type_created (user_id, event_type, created_at_ms DESC)` for `WHERE user_id=? AND event_type=? ORDER BY created_at_ms DESC LIMIT ?`.
- `idx_events_created_at_ms (created_at_ms)` only to support future time-window pruning and operational retention. This index has measurable write/storage overhead; remove in a reviewed migration if retention uses time-partitioned databases instead.

**Do not add yet:** global `event_type`/`target_entity`, geography, unbounded search, or BI indexes until production `EXPLAIN QUERY PLAN` and actual rows-read metrics justify them. In particular, the compound index does **not** optimize all `WHERE created_at_ms < ?` retention queries, hence the second index. No conventional clustered index exists in D1.

Representative read query:

```sql
SELECT id, target_entity, numerical_value, created_at_ms
FROM events
WHERE user_id = ? AND event_type = ?
ORDER BY created_at_ms DESC
LIMIT 50;
```

Representative **proposal only**, run in scheduled bounded jobs after retention authorization:

```sql
DELETE FROM events
WHERE id IN (
  SELECT id FROM events
  WHERE created_at_ms < ?
  ORDER BY created_at_ms ASC
  LIMIT 500
);
```

Never execute mass deletion without documented data-retention policy, export/delete rights, backups, performance tests, and owner approval. Do not infer monetary or ledger impacts from telemetry events.

## Unresolved scaling thresholds

- Measure queue accept-to-D1-commit P50/P95 and oldest-message age; retries, dead-letter volume, D1 `rows_read`, `rows_written`, SQL duration, DB file growth, CPU utilization and duplicate-event rate. Set alert and automatic load-shed thresholds only after a staging test.
- Load-test a controlled pilot at 10, 50, 100, 250 and 500 **events/sec**, varying events per POST, Queue message batch size and 1–2 consumers. The numbers are test targets, not demonstrated capacity.
- If sustained backlog forms, do not blindly increase concurrency on one D1. Reduce hot-path queries, adjust batching, archive/aggregate non-operational events, then consider multiple isolated D1 databases sharded by a stable user partition key (with a routing version). D1 does not provide transparent cross-shard joins.
- Keep cardinality/retention and operational dashboards separate from user wallet/cash data. Consent, disclosure and per-user erasure need real downstream verification, including Queues and any BI archive, before production launch.

## BI decision: stay reversible

BI tool is **undecided**; provision none now. Publish a stable event schema (v1, `id`, verified user scope, event tag, target, numeric value, epoch ms, opt-in geographic fields). Use a restricted ETL/export interface for later R2 Parquet/CSV files or an authorized analytics pipeline. Python, Tableau and ClickHouse should consume governed exports or read-only derived aggregates, not get write or unrestricted access to operational D1 and wallets. If analytics volume becomes large, archive raw approved events outside D1 and store only the recent window and per-user aggregates in D1.

## Deployment gates

1. Confirm approved target Worker, isolated D1 database and OAuth/session verifier; review integration with existing QuantaPhi `quant_events` adapters.
2. Review privacy notice, consent, geographic precision (postal codes), retention and deletion. Use a nonidentifying user key where possible; never use raw PII as a client-stable ID.
3. Approve Cloudflare resource creation/billing. Create Queue, DLQ, and isolated D1 separately; bind to existing Worker, store `INGEST_TOKEN` via secrets, never browser code.
4. Apply migrations in **local/staging D1 first**, exercise direct path and queue path with real Workers runtime + D1 (these tests currently use fakes for the D1/Queue APIs). Test duplicate IDs and retry behavior. Check query plans and measured rows written.
5. Obtain exact-head repo CI and independent security review. Release through the existing protected QuantaPhi pipeline, monitor a gradual traffic ramp, and verify live D1 records separately from HTTP queue acceptance.

Nothing in this package creates a Cloudflare resource, updates GitHub, merges a PR or deploys a Worker.