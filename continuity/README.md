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