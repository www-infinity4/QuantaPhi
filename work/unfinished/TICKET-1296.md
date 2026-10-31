---
issue: 1296
project: "Bubbles context-first iterations and Bits"
state: implementing
dot: "🟡"
progress_percent: unknown
progress_basis: "Phase 1 source written; live acceptance incomplete"
sessions_spent: 2
sessions_remaining_estimate: unknown
agent: ChatGPT
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: feature/1296-bubbles-bit-receipts
head_sha: null
tests:
  - "Initial CI failed: context-first test fixtures; corrected in follow-up"
merged: false
deployed: false
live_verified: false
blocker: "No authenticated transactional wallet ledger or chat event stream integration yet"
next_action: "Verify exact-head CI and review source-only projection; then integrate authenticated D1 ledger and live Bubbles pipeline"

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
