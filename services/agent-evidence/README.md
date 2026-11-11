# QuantaPhi Agent Evidence Catalog

Owner ticket: [#1489](https://github.com/www-infinity4/QuantaPhi/issues/1489). Isolated Cloudflare D1 + Worker, separate from identity, wallet, Bubbles chat, and agent-execution permissions.

## Public read-only API

Base: https://quantaphi-agent-evidence.marvaseater.workers.dev

- `GET /health` — current database row count, not a test-run receipt.
- `GET /v1/categories` — nested category tree via `slug` / `parent_slug`.
- `GET /v1/evidence?category=agents/context&q=memory&limit=10&offset=0` — bounded, parameterized search; prefix category matching.
- `GET /v1/evidence?review=unreviewed` — newly ingested upstream release records that require inspection.
- `GET /v1/evidence/<id>` — one record.
- `GET /v1/agent-context?category=agents/recovery&limit=8` — only curated source entries, formatted for Bubbles and Robot Brain.

Every entry has URL, published date, source kind, evidence level, review status, demonstrated or author-reported result, limitations, and proposed engineering action. `curated` means editorially classified, **not** independently reproduced. `verified_execution` must be reserved for actual test/deployment receipts, none of the initial eight entries have that status.

## Collection and operational status

Cloudflare cron `0 */6 * * *` (UTC) requests only public GitHub releases for OpenHands, LangGraph and SWE-agent. New entries are always `review_status=unreviewed`, `evidence_level=author_reported`; failures are saved in `ingest_runs`. This schedule is **configured**; a successful live scheduled fetch is not claimed until a real `ingest_runs` receipt is read back.

Initial verified HTTP readbacks on 2026-11-02: `/health` returned `status:ok` and eight entries; `/v1/categories` returned eleven hierarchical entries; `/v1/agent-context?limit=2` returned source- and limitation-backed records. These are API readback receipts, not agent repair/deployment receipts.

## Reproduce and review

Run `node --test test/worker.test.mjs` from this directory (no npm or paid API). Apply `sql/schema.sql` then `sql/seed.sql` to a *new isolated D1*; both are idempotent. `wrangler.jsonc` shows the Worker binding and schedule. Never connect these public endpoints to execution keys, private personal context, or wallet tokens.

Before Bubbles or Moltnook integration, test schema filters against real D1, protect against prompt injection from release notes, verify scheduled fetch receipts, do security/code review at the exact PR head, and test an authenticated Bubbles query/answer containing the correct evidence URL and caveats in the same conversation. Independent CI and browser verification precede production app integration; do not infer integration from this service's HTTP 200.
