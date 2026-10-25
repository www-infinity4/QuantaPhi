# Continuity — resilient execution notebook

A functional, offline-capable **Continuity** workspace at \`/continuity/\` in QuantaPhi. This is a new isolated app, not a QuantaPhi homepage replacement and not a claim that continuity.org DNS is connected.

## What works now
- Mobile-first Oracle Octaves visual system with real editable project folders, tasks, checkpoint history, blocker tracking, next-step suggestions, search and filters.
- Local persistence, export to a portable versioned JSON snapshot, import/merge with duplicate-safe IDs. Snapshots enable recovery on another device **when intentionally imported**, not automatic cross-device sync.
- Direct read-only import of live public QuantaPhi GitHub issues/PRs and owner X candidate inbox (when same-origin/CORS allows). A merged PR stays in review; it is not a deployment receipt.
- GitHub Actions receipt checks against GitHub's public API, with failed/unavailable checks clearly indicated.
- Copyable structured Brain handoffs; no unauthorized job submission, credential handling, background executor or silent approval.

## Run
Serve the repository over HTTP and open \`/continuity/\`. No build step, no tracking scripts. The app's storage is browser-local; export JSON to create a second copy. For portable work across accounts/users, add an authenticated server store and audited adapter bindings.

## Acceptance gates
\`node --test test/continuity.test.mjs\`
Browser: create task, change state, save blocker, export, clear local data only via browser tools, import snapshot, verify project and evidence; test narrow Android viewport.
GitHub sync checks actual public API; if blocked by rate limit/offline, it must report failure without changing task status.
X read requires same-origin \`https://quantaphi.org/api/bubbles/public-x/\` or a supported CORS configuration; blocked scans must remain blocked. Social posts are candidate records, never authorization to execute.
Never claim a task is live without an actual deployment and a live behavioral receipt.

## Next authenticated integration
Wire an owner-scoped Continuity API to Cloudflare D1 with event/revision locking, per-user access controls, resumable outbox tickets and verified runner receipts. Do not expose owner mutation endpoints publicly or route public X text straight into runner commands.

## Authenticated owner work view

`/continuity/owner/` is a separate page for saved Robot Brain work. The existing notebook, storage keys, export/import and public source tools remain at `/continuity/`. The owner page reuses `robot-brain-owner.js`; it neither creates a replacement identity nor stores private snapshots or bearer tokens. It requests the read-only `POST /work/continuity` snapshot from the existing Brain owner partition, using `(updated_at,id)` pagination for more than 100 tickets. Requests are reauthorized on the server. Missing or revoked authorization clears displayed records. A missing old endpoint can use the bounded legacy list with an explicit 100-ticket coverage warning; store errors and authorization failures never silently fall back.

The snapshot preserves original request, per-job instructions and acceptance as text. Stored tests/deployment flags are **recorded evidence**, not independent proof obtained by this page. Resume is an explicit per-job control using the existing authenticated `/work/run-next`; loading or refreshing never dispatches. Accepted runner requests remain unverified until execution receipts arrive.

This integration reads existing D1 work; it adds no queue, schema, secret, binding or wallet. The pure `router.mjs` validator is still a separate library and does not control existing Brain state transitions. Atomic state/event persistence and independently rechecked receipt ingestion are follow-on server work.

Validation: `node --test test/continuity*.test.mjs test/brain-clock.test.mjs`; mounted synthetic browser tests: `npx playwright test --config=playwright.continuity.config.mjs`. Local fixtures are not live owner/physical-device acceptance. Worker staging, authorized readback and production promotion remain separate from source CI and Pages publication.
