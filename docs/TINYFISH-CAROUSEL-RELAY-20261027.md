# TinyFish carousel website relay — October 27, 2026

## Verified environment and deployment status
The production coordinator has secret bindings TINYFISH_API_KEY and TINYFISH_BRIDGE_TOKEN plus WORK_DB (D1). The Brain Worker has service binding TINYFISH_BROKER pointing to coordinator. This feature branch does NOT deploy the relay, and the current coordinator has no POST handler for /v1/cards/discover.

## Integration required before production
1. Recover the full existing coordinator Worker source bundle and its active binding metadata. Preserve the monitoring cycles, D1, routes, all services, scheduled handler and secrets.
2. Import handleTinyFishCardRequest from workers/continuity-session-coordinator/tinyfish-card-route.mjs into its worker.mjs. In the fetch(request,env) handler, call it before the coordinator's current GET-only guard. Return its response when not null.
3. Run test/tinyfish-card-reader.test.mjs and all existing coordinator test suites. Verify OPTIONS preflight, live TinyFish search, CORS origin denial, D1 quota, secret isolation, and unchanged monitoring receipts.
4. Stage an isolated or zero-traffic Cloudflare version, compare binding identities with production, review diffs, then deploy the coordinator before deploying the frontend to quantaphi.org. Do not claim either deployment occurred based on a GitHub commit.
5. Browser-verify live results inside StarMaker, ChatGPT public lookup, retailer and brand quick cards in the homepage Oracle carousel.

## Scope of the first adapter
All quick cards using the shared mountCardActions toolbar and an HTTPS official site receive the same TinyFish Search public-site panel. Google/Bing retain native search. The reader posts hostname and explicit query to coordinator; it accepts only actual matching HTTPS source URLs, renders bounded results inside the card and offers the original provider website as fallback. Ordinary card interactions no longer silently open Google site-colon searches.

The server adapter validates hostname and origin, limits response size, filters results by hostname, limits 15 requests per day per salted-hash caller using D1, and only calls TinyFish public Search (not metered Web Agent). It never exports secrets, browser cookies or user logins.

## Signed-in ChatGPT and StarMaker remain a separate capability
A public TinyFish search does not send prompts into chatgpt.com or StarMaker private sessions. Such interaction requires an individual visitor's explicit sign-in to the real provider, isolated authenticated browser profile, permission to automate, per-action consent and a response receipt. Never send visitors' conversations through the owner account. OpenAI API/ChatKit is the supported native-chat integration option. Provider karaoke/recording rights remain with StarMaker.

## Acceptance checklist
- [ ] Coordinator code changes integrated without replacing production coordinator
- [ ] Existing Worker secrets, services and D1 retained
- [ ] Real end-to-end TinyFish search confirmed in carousel on Android
- [ ] Public search results tied to official site, no invented results
- [ ] No plain Google fallback on ordinary cards
- [ ] Signed-in ChatGPT and StarMaker per-user session support separately authorized, implemented and tested
- [ ] Reviewed production deploy has independent timestamp/commit and user-visible test
