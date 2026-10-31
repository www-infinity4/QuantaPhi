# QuantaPhi unfinished work ledger — mandatory agent entry point

Before any agent edits QuantaPhi or related Infinity code, **read this file, `AGENTS.md`, `work/unfinished/INDEX.md`, and the relevant ticket**. Search open GitHub issues and PRs before creating a new ticket. GitHub Issues are numbered canonical work records; `work/unfinished/` is a searchable, versioned index/checkpoint directory, not a substitute for issues. Never store private chats, credentials, user wallet details or private X data here.

## Required agent protocol
1. Find a matching open issue/ticket by project and requirement; reuse it. If absent, create a numbered GitHub issue and add a `work/unfinished/TICKET-<issue-number>.md` checkpoint in a reviewed branch/PR. No duplicate issues for each session.
2. Record source request/URL and scope; exact repo/branch/head; owner/agent and last observed UTC; progress state, evidence-backed percentage, session count, remaining steps and estimated effort/range; test/CI/PR/deployment receipts; next *single executable action*; blockers and independent review gates.
3. Before modifying files, check current branch/PR, CI and any active agent lease. Claim only one bounded unit with a canonical issue, named agent, task/session identity, UTC expiry, and matching lease ID + fence from the actual coordinator where available. An unclaimed lease must have null expiry and task/session identity. Expired leases require a new verified claim, never an automatic extension. Do not overwrite another active agent's work. GitHub issue comments are durable append-only session handoffs; do not claim a lease solely by writing a Markdown file.
4. After **every session**, update the issue with what actually changed, exact commit/test receipts, what failed, percentage estimate and next action; synchronize its checkpoint file via PR when source-backed. If the session made no code changes, record `observed` or `blocked`, not `implemented`.
5. Do not delete tickets on completion. Mark **100% only after agreed acceptance criteria and actual release/verification**; close the issue and move its index entry to completed/archive, preserving history. Merge and deployment are distinct.
6. Never infer a build from a scheduled task, a colored dot, a PR, a successful test, or a chatbot response. Preserve wallet isolation, secrets, signed-in consent, security holds and independent release approvals.

## Dot colors
- 🔴 RED — unfinished, next engineering action ready or work stopped
- 🟡 YELLOW — active implementation/testing with an observed owner/agent and lease, or waiting on review
- 🔵 BLUE — missing input, evidence, integration or external permission; specify exact dependency
- 🟠 ORANGE — significant blocker/at-risk or repeated failed attempts; include diagnosis and escalation
- 🟢 GREEN — accepted, merged/deployed/verified as applicable; ticket may be closed

Colors are **not** a substitute for separate machine-readable states: `observed | scoped | implementing | source_tested | ci_passed | review_pending | merged | deployed | live_verified | blocked | complete`.

## Percent and ETA
Use `progress_percent` 0–100 as a **reasoned estimate** of completed acceptance criteria, not percentage of generated text. Label it estimated and include the numerator/denominator or weighted milestones. `sessions_spent` is the count of documented agent work sessions, not eight logical tracks. `sessions_remaining_estimate` is a range, not a guarantee. Unknown => `unknown`. Update after each session. Never call 70% complete without enumerating completed and remaining criteria.

## Current starting points
- X intake and per-post engineering: https://github.com/www-infinity4/QuantaPhi/issues/1210
- Cross-project coordinator/owner-first leases: https://github.com/www-infinity4/QuantaPhi/issues/1145
- Brain execution receipts: https://github.com/www-infinity4/QuantaPhi/issues/1192
- Bubbles/Android readiness: https://github.com/www-infinity4/QuantaPhi/issues/1231
- Power Chain bulk-buy draft: https://github.com/www-infinity4/QuantaPhi/pull/1260

See `work/unfinished/INDEX.md` for live project routing. This folder is an agent-readable durable handoff, **not** a claim that autonomous cross-chat session execution is live.
