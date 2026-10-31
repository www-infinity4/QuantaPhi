issue: 1296
project: "Bubbles context-first iterations and Bits"
state: implementing
dot: "🟡"
progress_percent: unknown
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: ChatGPT
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: feature/1296-bubbles-bit-receipts
head_sha: 710572f7b4ca3146da5d4dfd7ffcea6d0f8b963a
tests:
  - "test/bubbles-bits.test.mjs added; CI not yet verified"
merged: false
deployed: false
live_verified: false
blocker: "No authenticated transactional wallet ledger or chat event stream integration yet"
next_action: "Run focused node --test test/bubbles-bits.test.mjs and review receipt trust boundary; then integrate D1 ledger and live Bubbles pipeline"

# Acceptance
- Personal Context is first step for every authenticated iteration
- Every displayed action comes from an actual verified tool receipt
- Bits mint only through an authenticated transactional idempotent wallet ledger
- User isolation and duplicate/replay protections
- Chat counter and wallet earned/spent/available, with Quant/Git references
- CI and real deployment verification before claiming completion

# Session 1
Added test-first receipt projection and focused tests. Provisional Bits are explicitly NOT spendable, walletWrites always zero. No live integration or deployment.
