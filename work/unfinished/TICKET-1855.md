---
issue: 1855
project: "Bubbles Claude Steward — signed conversation and proposed repairs"
source_requests:
  - "Owner request 2026-11-08: claude-steward branch, Cloudflare gate, verified draft path"
  - "Owner clarification 2026-11-08: select Claude beside Bubbles in the same chat and type Fix Bubbles"
state: review_pending
dot: "🟡"
progress_percent: 63
progress_basis: "5 of 8 milestone groups source-verified: signed route, Bubbles/Claude model choice across 4 entrypoints, preserved Brain/Cloudflare bindings, regression coverage, exact-head CI and dry-run. Remaining: independent security approval, guarded release, authenticated production+Android acceptance."
sessions_spent: 3
sessions_remaining_estimate: "unknown (review/release approval and live acceptance not scheduled)"
agent: "GPT coordinator; no runner lease claimed; no autonomous merge/deploy permission"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
last_observed_at_utc: "2026-11-08T18:55:01Z"
repo: www-infinity4/QuantaPhi
branch: claude-steward
head_sha: fe6dbdd06cbe2b05b1def31963447ba5f88ee6f6
pr: 1856
tests:
  - "Exact-head guarded test-and-deploy: 88 Node tests passed, 0 failed; Cloudflare Wrangler dry-run succeeded; https://github.com/www-infinity4/QuantaPhi/actions/runs/42476910876"
ci:
  - "Exact-head 89 checks: 85 passed, 4 skipped, 0 failed/pending (2026-11-08)"
review:
  - "Copilot COMMENTED only; all 13 inline threads resolved, no independent APPROVED review"
merged: false
deployed: false
live_verified: false
blocker: "Independent security approval and permitted merge missing; Cloudflare infinity-rogers last production deploy 2026-11-06; new Claude code and live Android conversation not verified."
next_action: "Obtain independent security approval on exact PR head #1856; only then authorized guarded merge and deployment with Cloudflare/Android signed live proof."
---

# TICKET-1855: Claude Steward

Canonical GitHub issue: https://github.com/www-infinity4/QuantaPhi/issues/1855
Draft PR: https://github.com/www-infinity4/QuantaPhi/pull/1856

## Scoped acceptance
- [x] Existing pushed branch and owner instructions reviewed; no new token created.
- [x] Cloudflare production Worker bindings independently listed: `ANTHROPIC_API_KEY` encrypted `secret_text`, `BRAIN` production service `infinity-brain-clock`, `GEMINI_API_KEY`, `CONNECTIONS_SERVICE`, `AI`, `METER_DB`. Secret **value not readable / not requested**.
- [x] Branch code accepts `https://quantaphi.org` via originAllowed for POST `/v1/claude/steward`.
- [x] Exact-head focused test and guarded Wrangler dry-run: 88 Node tests passed, zero failed, workflow https://github.com/www-infinity4/QuantaPhi/actions/runs/42476910876. All 89 GitHub checks complete, 85 succeeded and 4 skipped.
- [ ] Independently APPROVE auth, origin, model, verified source patches, Termux safety, and Bubbles frontend at the exact PR head. Copilot COMMENTED and 13 threads were fixed/resolved; no independent APPROVED review.
- [ ] Build owner-reviewed draft-to-ready job plan UI or accurately label manual owner action. Brain `/work/tickets/approve` supports only blocked UI decisions, **not** draft tickets. Verified backend path: `POST /work/tickets/update` with `id,status:'ready',context.kind:'robot-directions',context.color_jobs` and a storyboard. Follow-up dispatch/runner receipts must be checked.
- [ ] Separate merge, guarded production deployment, production version/readback, non-sensitive authorized synthetic chat and Android acceptance.

## 2026-11-08 continuation — confirmed status

- Source: the single existing Claude Steward PR #1856 includes a Bubbles/Claude selector in the same composer on all four Bubbles entry pages, with `Fix Bubbles` entering proposal-only Claude repair mode; the floating Claude card is optional.
- Safe handoff: Claude can inspect authorized source and propose verified patches or a Brain ticket. An independently reviewed `color_jobs` draft-to-ready action remains mandatory before an authorized runner may act. No patch is automatically applied.
- Exact-head CI on `fe6dbdd06cbe2b05b1def31963447ba5f88ee6f6`: 88/88 guarded Node tests pass; Wrangler dry-run passes; 89 GitHub checks complete with 85 successes, 4 skips, no failures.
- Copilot review: all 13 inline issues resolved, but resolution is NOT independent security approval. The PR remains open and unmerged.
- Production readback: Cloudflare `infinity-rogers` most recent deployment is `5258cc19-2689-4eb3-a7aa-61c7b4dd8c86`, created 2026-11-06T16:55:06Z; `ANTHROPIC_API_KEY` and `BRAIN` bindings exist. This proves the new Claude Worker is NOT deployed yet.
- Final acceptance still requires independent security approval, authorized guarded merge, production version/readback, owner-signed non-sensitive synthetic Claude conversation and Android acceptance. No token, wallet or production data was mutated in this session.

## Known blockers
1. Existing guarded workflow does not explicitly test `test/claude-steward.test.mjs` (first read).
2. Draft approval phrase on card/doc is inaccurate until it names owner-reviewed `/work/tickets/update` plan submission.
3. GitHub PR was opened draft because exact-head CI and independent release review were missing.
4. No signed production route receipt, end-to-end ticket advancement or Android proof yet.

No patch proposal is an applied file. No DRAFT Brain ticket is automatically queued to the writer. Work remains open.