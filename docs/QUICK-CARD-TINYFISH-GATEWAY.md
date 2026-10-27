# TinyFish website Quick Cards — source-stage integration

**Status:** source branch / draft PR, **not deployed**. The live carousel does not yet have a TinyFish handler until this branch is tested, reviewed and deployed. Do not claim an active ChatGPT website session or provider endorsement.

## Existing verified binding
- Cloudflare `continuity-session-coordinator` has secret bindings named `TINYFISH_API_KEY` and `TINYFISH_BRIDGE_TOKEN`; values are not in Git.
- `bubbles-tools` has service binding `TINYFISH_BROKER` pointing to that coordinator and its own `TINYFISH_BRIDGE_TOKEN` secret.
- Secret existence and bindings do not establish a functioning upstream result.

## Proposed source changes
- Homepage source cards retain their original DOM node, curated media, Follow/Star/Collect/Share/+1 Build and navigation.
- A separate read-only TinyFish question panel is mounted through the **shared card toolbar** on 65 fixed, catalogued public-website cards: 13 original source cards (including StarMaker), 17 premium sources, 6 product cards and 29 verified brand/sports cards. Uncatalogued URLs and generic internal tools remain unsupported. No account cookies, logins or recordings are forwarded.
- The first-party website makes a CORS POST to `https://continuity-session-coordinator.marvaseater.workers.dev/v1/quick-cards/tinyfish`. Only fixed known card IDs are accepted. Arbitrary URLs are rejected.
- The Cloudflare coordinator (tracked snapshot in `workers/continuity-session-coordinator/`) imports `workers/quick-card-tinyfish/gateway.mjs` and mounts the route. It uses the existing secret, a hashed-IP quota and a hard daily global budget, fixed read-only goal, and checks the final TinyFish SSE COMPLETED event.
- Gateway timeout, cost/rate limits and source failures return explicit errors; no fabricated provider answer.
- ChatGPT/Gemini/Claude/Copilot website sessions are **not** proxied. ChatGPT card continues to link to the real ChatGPT app until a properly authorized OpenAI integration is available. Sign in is not interchangeable with API authority.

## Release acceptance
1. `node --test test/quick-card-tinyfish.test.mjs` and existing source/deck/browser tests pass on branch.
2. Validate that original cards and StarMaker song picker/local recording still work at Android widths.
3. Deploy the coordinator modules using the existing compatible module worker/bindings; ensure secret bindings are preserved, schedule and D1 are unchanged, then verify POST returns a genuine sourced result. Avoid a blind overwrite of a live Worker.
4. Publish QuantaPhi frontend via normal reviewed deploy, and verify one StarMaker website request end-to-end, with an observed URL and time.
5. Monitor TinyFish paid consumption/quotas and all errors before enabling additional public card IDs and brands.
6. Do not treat Cloudflare secret presence, a CI pass, or a source PR as a completed live website release.

The source snapshot was retrieved from the deployed coordinator before changing it. No live scripts, API keys, wallet records or provider sessions were changed by this branch.
