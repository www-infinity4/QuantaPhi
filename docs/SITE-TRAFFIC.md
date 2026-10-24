# QuantaPhi: cumulative traffic, never a rolling-only headline

The public homepage's leading totals are **cumulative counts of verified Cloudflare HTTP
requests and page views since the earliest available source record**, not sums of rolling
seven-day queries. A clearly labeled **Last 7 days (UTC)** breakdown is secondary.

The earliest verified Cloudflare daily record found in the October 24, 2026 backfill was
**October 4, 2026**. The backfill returned 21 consecutive days ending October 24
(partial UTC day), so there is **no evidence to call this the complete website lifetime
or to manufacture earlier traffic**. The counts include bots, are *not* unique visitors,
and are *not* literal link clicks.

## Persistence and proof

- Cloudflare D1 database: `quantaphi-site-traffic-ledger`
  (`d2ff1e67-be90-467b-b478-3c52d6739b89`), binding `TRAFFIC_LEDGER`.
- `traffic_daily` is keyed by **UTC date**; each verified analytics date is inserted
  or updated by the **greater** of the existing and refreshed count. Replaying an
  overlapping query never adds that day twice or decreases displayed counters.
  (This preserves the highest verified value even if Cloudflare later revises a day
  downward; source corrections require an audited reconciliation.)
- Actual backfill was seeded in D1 from the authenticated Cloudflare GraphQL
  `httpRequests1dGroups` result on October 24, 2026, with 21 distinct days.
- An isolated Worker at `GET /api/site-traffic` reads this durable ledger.
  It may attempt an asynchronous refresh of stale data, but it always returns
  persisted counts if analytics authorization is temporarily unavailable.
- The Worker schedules a 15-minute refresh, re-reading the last 30 UTC dates
  and upserting each. Every refresh validates dates and safe integer counts.
  No website visitor can write the ledger.
- The backend returns `scope=recorded_since`, `since`, `through`,
  `recordedDays`, `coverageContinuous`, `historicComplete=false`, the
  cumulative totals, and a separate `last7Days` subobject. If a gap develops
  (e.g. after an outage longer than provider retention), it flags incompleteness.
- Static fallback: `data/site-traffic-lifetime.json`, frozen at its explicitly
  dated last verification. It is **not** described as live and is never
  zeroed simply because it is older than six hours.
- Previous rolling-only `data/site-traffic.json` is retained for legacy
  consumers, but no longer drives the leading homepage counter.

## Deployment and refresh authorization

The account read connection used to backfill the D1 ledger can query Cloudflare
GraphQL but cannot create a restricted API token. Do not place the connected
account's authorization in browser JavaScript, GitHub source, or logs.

To activate unattended ingestion:

1. Provision a **zone-scoped Analytics Read** Cloudflare API token authorized
   solely for `quantaphi.org`, using Cloudflare's secure token form.
2. Set `SITE_TRAFFIC_CLOUDFLARE_TOKEN` as a **Worker secret**, using
   `npx wrangler secret put SITE_TRAFFIC_CLOUDFLARE_TOKEN --config workers/site-traffic/wrangler.toml`.
   Never paste or commit the token into the repo or chat.
3. Deploy the isolated Worker:
   `npx wrangler deploy --config workers/site-traffic/wrangler.toml`.
   Route is scoped only to `quantaphi.org/api/site-traffic*`.
4. Verify the public endpoint and site card both return cumulative numbers;
   verify a second refresh does **not** double count any day, and the
   fifteen-minute schedule increases counts as new Cloudflare data arrives.
   Verify that with the secret absent, historical data remains visible with
   its last-verified timestamp instead of disappearing.

**Source commits are not proof of public deployment.** D1 backfill success
does not by itself mean the Worker is scheduled and serving live queries.
