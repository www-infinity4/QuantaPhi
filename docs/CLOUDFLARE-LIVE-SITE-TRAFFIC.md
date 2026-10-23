# QuantaPhi public Cloudflare traffic counter

## What it displays

The homepage requests \`/api/site-traffic\` from the existing \`quantaphi-site\` Worker. The Worker calls Cloudflare GraphQL \`httpRequests1dGroups\` for the \`quantaphi.org\` zone. It returns **HTTP requests and page views** for the most recent seven UTC dates, with the current date partial. The client rechecks every five minutes, and the Worker caches successful aggregate results for ten minutes. These are rolling seven-day statistics, **not lifetime views or unique people**. Cloudflare includes requests from automated clients/bots in these rollups.

If the GraphQL API cannot be used, the client reads the existing verified \`data/site-traffic.json\` as a separately labeled snapshot, with a six-hour maximum display age. It never substitutes the old hard-coded 273,731/87,324 totals and never invents traffic.

## Activation (requires Cloudflare access)

1. In Cloudflare, create a **zone-scoped read-only token** with **Zone > Analytics > Read** restricted to **quantaphi.org**. Treat this bearer token as a secret.
2. Add it to the **existing** \`quantaphi-site\` Worker as a secret binding named \`CLOUDFLARE_ANALYTICS_TOKEN\`. Do not add it to repository files, frontend JavaScript, a Bubbles prompt, or a public endpoint. The zone ID is already fixed in the Worker; no second secret is needed.
3. Deploy the reviewed \`workers/quantaphi-site/worker.js\` **together with** \`workers/quantaphi-site/traffic-api.mjs\`, \`video-api.mjs\`, and the other existing script modules. Preserve the production service bindings (\`BUBBLES_CONNECTIONS\`, \`CODEPHI\`, \`QUANT_AI\`, \`QUANTAI\`) and all other Worker settings. Do not replace the live Worker with a one-file upload or change production bindings to blank values.
4. Verify \`GET https://quantaphi.org/api/site-traffic\` returns \`ok\` implied by the schema plus \`source="Cloudflare GraphQL httpRequests1dGroups"\`, seven \`days\`, \`requests\`, \`pageViews\`, and a recent \`fetchedAt\`. Check \`https://quantaphi.org/\` on desktop and Android, then confirm the timestamp moves on its next cache refresh. Verify \`/health\`, Bubbles, wallet, \`/api/video/config\` and suite navigation are unchanged.
5. If the token or API is unavailable, the backend returns HTTP 503 with no credentials or provider error text, and the frontend displays only a recent, timestamped verified fallback snapshot (or an unavailable state if that too is stale). Restore a last-known-good Worker version if other routes regress.

Source commit and tests do **not** establish that the production Worker has been deployed. A production traffic value is only live after a successful Worker release and a real HTTP response from the endpoint.
