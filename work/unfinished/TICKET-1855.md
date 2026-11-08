---
issue: 1855
project: "Bubbles Claude Steward — signed conversation and proposed repairs"
source_requests:
  - "Owner request 2026-11-08: claude-steward branch, Cloudflare gate, verified draft path"
state: source_staged
dot: "🟡"
progress_percent: 40
progress_basis: "Seven source files staged and Cloudflare secret/bindings verified; CI, review, release, live and Android acceptance not yet proven"
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "GPT coordinator, Green/Pink/Black roles; no runner lease claimed"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
last_observed_at_utc: "2026-11-08T09:03:14Z"
repo: www-infinity4/QuantaPhi
branch: claude-steward
head_sha: a1b79d4c5177d5d4a9ebe2f192ada0604e0a9dad
pr: 1856
tests:
  - "User-reported six focused Node tests on initial push; not independently rerun yet"
ci: []
merged: false
deployed: false
live_verified: false
blocker: "PR exact-head CI not yet verified; draft-to-ready plan not implemented as a generic approve button"
next_action: "Include Claude-focused tests in guarded PR workflow and inspect exact-head dry-run result"
---

# TICKET-1855: Claude Steward

Canonical GitHub issue: https://github.com/www-infinity4/QuantaPhi/issues/1855
Draft PR: https://github.com/www-infinity4/QuantaPhi/pull/1856

## Scoped acceptance
- [x] Existing pushed branch and owner instructions reviewed; no new token created.
- [x] Cloudflare production Worker bindings independently listed: `ANTHROPIC_API_KEY` encrypted `secret_text`, `BRAIN` production service `infinity-brain-clock`, `GEMINI_API_KEY`, `CONNECTIONS_SERVICE`, `AI`, `METER_DB`. Secret **value not readable / not requested**.
- [x] Branch code accepts `https://quantaphi.org` via originAllowed for POST `/v1/claude/steward`.
- [ ] Focused test and guarded Wrangler dry-run on **current** PR head, with complete job receipts.
- [ ] Independently review auth, origin, Anthropic API model, source-patch verification, Termux script safety and frontend behavior.
- [ ] Build owner-reviewed draft-to-ready job plan UI or accurately label manual owner action. Brain `/work/tickets/approve` supports only blocked UI decisions, **not** draft tickets. Verified backend path: `POST /work/tickets/update` with `id,status:'ready',context.kind:'robot-directions',context.color_jobs` and a storyboard. Follow-up dispatch/runner receipts must be checked.
- [ ] Separate merge, guarded production deployment, production version/readback, non-sensitive authorized synthetic chat and Android acceptance.

## Known blockers
1. Existing guarded workflow does not explicitly test `test/claude-steward.test.mjs` (first read).
2. Draft approval phrase on card/doc is inaccurate until it names owner-reviewed `/work/tickets/update` plan submission.
3. GitHub PR was opened draft because exact-head CI and independent release review were missing.
4. No signed production route receipt, end-to-end ticket advancement or Android proof yet.

No patch proposal is an applied file. No DRAFT Brain ticket is automatically queued to the writer. Work remains open.