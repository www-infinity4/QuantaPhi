---
issue: 1296
project: "Bubbles context-first iterations and Bits"
state: implementing
dot: "🟡"
progress_percent: unknown
progress_basis: "Phases 1 and 2 merged; real spendable Bits ledger and live production acceptance remain incomplete"
sessions_spent: 3
sessions_remaining_estimate: unknown
agent: ChatGPT
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: main
head_sha: 447a34be60229766a60f999e66bafbeda5916d59
tests:
  - "Phase 1 receipt projection merged in PR #1297"
  - "Phase 2 PR #1338 merged after seven required CI groups passed"
merged: true # source Phases 1 and 2 only; spendable ledger is still incomplete
deployed: false
live_verified: false
blocker: "Authentic wallet credit/debit settlement and server-minted proof still need an idempotent authenticated ledger"
next_action: "Implement owner-authenticated, server-verified D1 Bits settlement and spend ledger, and independently verify Cloudflare release without changing existing wallet balances"

# Acceptance
- Personal Context is first step for every authenticated iteration
- Every displayed action comes from an actual verified tool receipt
- Bits mint only through an authenticated transactional idempotent wallet ledger
- User isolation and duplicate/replay protections
- Chat counter and wallet earned/spent/available, with Quant/Git references
- CI and real deployment verification before claiming completion

# Session 1
Added test-first receipt projection and focused tests. Provisional Bits are explicitly NOT spendable, walletWrites always zero. No live integration or deployment.

---

Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1296

# Session 3 · 2026-11-01
- Strengthened the source-only projection: one tool receipt can count at most once, even if replayed under another event ID; reject cross-tool evidence and oversized batches.
- Added in-chat Bubbles Bits observation counter: actual tool receipt IDs, owner-memory-first gating, no private transcript persistence, and reset on chat change. All tallies remain non-spendable until a server ledger settles them.
- Bubbles owner archive retrieval moved before current-turn tool routing. This does not access ChatGPT Personal Context.
- The new activity view performs zero wallet writes and cannot claim an asset payout. Deployment and live wallet acceptance remain unverified.

# Merge receipt · 2026-11-01
- PR: https://github.com/www-infinity4/QuantaPhi/pull/1338
- Exact merged source: `447a34be60229766a60f999e66bafbeda5916d59`
- Required CI green: Bubbles Bits, unified interface, shared-memory, Android draft-safety, picture/story, Quanta wallet regressions and Brain full diagnostic.
- Source merge verified. Cloudflare deployment, spendable Bits settlement and live phone acceptance are not verified.
