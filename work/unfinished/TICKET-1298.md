---
issue: 1298
project: "Bubbles Door Knocker"
state: implementing
dot: "🟡"
progress_percent: unknown
progress_basis: "Pure state machine and tests only; no live queue"
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: ChatGPT
lease_id: null
fence: null
lease_expires_at: null
task_session_id: null
repo: www-infinity4/QuantaPhi
branch: feature/1298-door-knocker
head_sha: null
pr: null
merged: false
deployed: false
live_verified: false
blocker: "Authenticated durable queue and live runner safe checkpoint adapter not implemented"
next_action: "Verify focused Door Knocker CI, then integrate authenticated durable queue and real runner checkpoints"
---

Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1298

Acceptance: durable owner-scoped messages, idempotent enqueue, safe checkpoint delivery, no interruption, agent acknowledgment receipts, fallback tickets, live chat UI, integration tests, independent review and deployed verification.

Session 1: pure noninterrupting queue state machine and test-first cases; no live runtime integration.
