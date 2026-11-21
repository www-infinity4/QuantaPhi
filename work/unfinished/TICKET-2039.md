---
issue: 2039
state: scoped
dot: "🔴"
progress_percent: 0
progress_basis: "0 of new implementation acceptance checks verified; documentation only"
sessions_spent: 0
sessions_remaining_estimate: unknown
agent: null
lease_id: null
fence: null
lease_expires_at: null
task_session_id: null
next_action: "Inspect token ledgers and implement simulation-only single-use redemption tests."
merged: false
deployed: false
live_verified: false
---

# TICKET-2039: Infinity travel entitlement simulation

- **GitHub issue:** https://github.com/www-infinity4/QuantaPhi/issues/2039
- **Parent:** #1908 · **Related:** #1914, #1481, #1908
- **Owner request source:** recent owner Bubbles project sessions, recovered in [SESSION-RECOVERY-2026-11-21.md](SESSION-RECOVERY-2026-11-21.md); full original transcript not embedded
- **Priority:** P2
- **Status:** scoped / unclaimed; RED means unfinished, not running
- **Progress:** 0% of listed engineering acceptance verified (estimated); issue/doc creation is not implementation
- **Sessions spent on build:** 0 documented
- **Sessions remaining:** unknown (bounded slices to be estimated after code inspection)
- **source_repo:** www-infinity4/QuantaPhi (cross-repo parts subject to actual source inspection)
- **source_commit_sha:** not yet pinned by executing Bubbles agent
- **Agent/lease identity:** none claimed here; no job lease granted by this file
- **last_observed_utc:** none for build stage (documentation created 2026-11-21)
- **Test/CI/PR/merge/deploy/Android receipts:** none asserted for this new scope

## Acceptance criteria
Simulation-only issue/redeem/revoke tests and 5-segment count; distinct cash/wallet ledger; no physical transit, store, NFC or merchant deployment claims.

## Next single executable action
Inventory existing digital token/coin ledger and coin housing source; create sandbox-only schema for issuer/5-segment balance and replay guards.

## Guardrails and handoff
Read `AGENTS.md`, `docs/BUBBLES-GPT-BUILDER-ROUTING.md`, `work/unfinished/README.md`, `work/unfinished/INDEX.md` and issue #2039. Search matching PRs, current source/head and runner leases before doing anything else. Only authorized adapter may claim and edit actual code. Use failing regression first, exact-head CI, independent verification appropriate to risk and separate signed merge/deploy/browser/physical Android receipts. Add dated issue comments after every actual session. Preserve active tasks and avoid duplicate PRs. This ticket does not claim that the feature is built or running.
