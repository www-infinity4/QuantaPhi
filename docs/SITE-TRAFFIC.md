# QuantaPhi authenticated traffic feed

The homepage attempts `GET /api/site-traffic`, then falls back to `/data/site-traffic.json`.
The fallback is explicitly marked as historical if it is older than six hours and
**never** presented as live data. Both report rolling seven UTC *calendar dates*
(today partial), HTTP requests and page views, including bots (not unique people).

Source: Cloudflare zone analytics GraphQL `httpRequests1dGroups`.
The Worker caches successful analytics responses for at most five minutes per edge location.
Invalid/incomplete responses are never converted to zeros. Failed refreshes return 503.
No analytics credential is embedded in the browser or committed to GitHub.

## One-time activation, owner-scoped

1. Create a **zone-scoped Analytics Read** API token for `quantaphi.org` using
   Cloudflare's native token flow. Do not reuse owner/admin tokens.
2. In the Worker directory run `npx wrangler secret put SITE_TRAFFIC_CLOUDFLARE_TOKEN --config workers/site-traffic/wrangler.toml`.
   Paste the token only into the secure Wrangler prompt, never in chat, source, logs, or URLs.
3. Run `npx wrangler deploy --config workers/site-traffic/wrangler.toml`.
   This creates a route only for `quantaphi.org/api/site-traffic*`; it does not change other Workers.
4. Confirm the deployed `https://quantaphi.org/api/site-traffic` returns HTTP 200,
   the schema and `fetchedAt` are current, and a fresh browser session shows the
   verified numbers. Also test a missing/invalid secret returns 503 and the UI
   falls back to clearly labeled historical data.

Until both the token and deployed route are verified, **the live feed is not active**.
This source change alone does not provision Cloudflare credentials or routes.

The site's original static file `data/site-traffic.json` is kept as a labeled
fallback. It must never be described as real time or manually falsified.
