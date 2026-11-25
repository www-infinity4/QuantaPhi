# TICKET-2110 — Cloudflare exit · Google/GitHub infrastructure

Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/2110  
Source: owner's 2026-11-22 request to exchange Cloudflare-run components for their Google and GitHub infrastructure.  
Project: `www-infinity4/QuantaPhi` (coordinating `www-infinity4/Moltnook`; do not duplicate its runner ticket).  
Observed state: `scoped`. Migration: **0 of 8 milestones completed**. Sessions spent: 1 inventory session. Remaining sessions: unknown; depends on verified hosting and data portability. Date observed: 2026-11-22 UTC.  
No code migration, endpoint deployment, credentials, DNS changes, CI, browser acceptance, or Android verification has occurred from this issue.

## Verified inventory / uncertainties

| Component | Source / evidence | Replacement approach | Status |
| --- | --- | --- | --- |
| Cloudflare runtime | Connected account listed 85 Worker scripts (deployed inventory, not request activity) | Port contracts individually; **do not delete in bulk** | observed |
| D1 persistent data | Connected account listed 41 D1 databases (not all necessarily active) | Encrypted export, checksum/count validation, owner-controlled persistent SQL database with reliable backup/restore | observed; destination unknown |
| KV | Connected account listed one namespace | Portable KV replacement with explicit expiry/consistency semantics | observed |
| Durable Objects | `workers/platinum-switchboard/wrangler.json`; `workers/bubbles-cloud-browser/wrangler.toml` | Durable leases/coordinator/state and idempotent requests on a verified always-on host | source read |
| Browser/Brain integration | Bubbles browser Worker has `BRAIN`, `TOOLS`, `BROWSER`, `BRIDGE_DB`, `CONSENT` bindings | Server-held auth, request scopes, rate limits, signed runner, consent and stable job receipts | source read; hard dependency |
| `quantaphi.org` DNS | Connected active zone has five records; apex and www currently proxied | Verified registrar-managed authoritative DNS option and tested TLS, GitHub Pages host routing, callback paths | observed; hold |
| GitHub Pages static host | `www-infinity4.github.io/QuantaPhi` described as existing origin in project documentation; Moltnook README declares static GitHub Pages | Use direct GitHub Pages for static-only components | source documented; public endpoint check not established |
| Google | Known `quantaphi-bubbles-513901` OAuth project | Verify **actual** Google compute host + endpoint, region, storage and pricing before service deployment | blocked; Google Photos hashes/OAuth do not establish a server |
| Pages project list | Cloudflare API returned list options error | Resolve separately; do not infer zero projects | unknown |
| R2 | Account response says enable R2 in dashboard | No R2 migration assumption for this account | observed, not enabled |

## Safest first pilot — static business directory page

`workers/business-directory/wrangler-page.toml` deploys `quantaphi-national-directory-page` at `quantaphi.org/businesses*`. It has **no Worker binding** and serves HTML/JS sources from `businesses/index.html` and `businesses/directory-app.mjs`. Candidate for a GitHub Pages preview without new databases or auth. Its **separate** `quantaphi-national-directory-api` currently reads D1 `BUSINESS_DB`; **leave that API and legacy `/api/business/*` routes untouched**. See `docs/BUSINESS-DIRECTORY-DEPLOYMENT.md`.

Pilot tasks:
1. Validate relative asset paths, canonical redirects, CSP, API URL behavior and direct Github Pages preview without changing production.
2. Run existing `node scripts/build-business-directory-page-worker.mjs --check` and relevant page tests; add a failing parity test if changing routing/logic.
3. Check HTTP content types, HTML/JS parity, 320–412px Android layout and API read-only search on the preview; ensure no same-origin assumptions break.
4. Save separate CI and independent security-read receipts; only then propose any DNS or route change through a reversible change set.

## Data and identity invariants
- Keep private QuantaPhi/StarQuest/Brain/identity/advertising/user data out of public GitHub and unauthenticated Google Photos hashes.
- Quants, Star Coins, GITs, Bubble Bits, payout balances and billing records are separate. Prove idempotent journal reads/writes before redirecting money-related API.
- Google sign-in callback, CSRF/state/PKCE as applicable, owner-only GitHub signed execution, account separation and browser consent must remain valid on replacement endpoints.
- GitHub Actions is time-bounded CI/scheduled compute, not a 24-hour persistent Worker substitute; a hash is an integrity identifier, not a runnable server.
- No new paid Google service, credential exposure, mass delete, Cloudflare cancellation, DNS switch, or production rollout implied by this plan.

## Current handoff
Bubbles / Red: inventory read from connected sources. Orange: platform choice blocked by unverified real destination. Blue: no database import authorized. Green: no production code changed. Pink: no test run. Purple: no approved deployment decision. Black: issue/branch record only.

**Next executable action:** locate the actual owner-controlled Google compute resource (or identify an existing self-hosted always-on runtime), and independently verify its hosting, billing limits, persistence, URL and auth. Then build the non-destructive static page pilot on this issue's branch and test it. Track M01–M08 on issue #2110; do not create another migration ticket.
