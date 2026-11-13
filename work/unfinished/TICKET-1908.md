---
issue: 1908
project: "Continuity Builder complete-ticket runner; original eight acceptance tracks"
source_requests:
  - https://github.com/www-infinity4/QuantaPhi/issues/1908
  - https://github.com/www-infinity4/QuantaPhi/issues/1321
  - https://github.com/www-infinity4/QuantaPhi/issues/1192
state: source_tested
dot: "🟡"
progress_percent: 0
progress_basis: "0/8 original full-ticket tracks have complete production acceptance. Signed Brain claim, heartbeat, dependency, recovery, and owner progress changes are source-tested."
sessions_spent: 3
sessions_remaining_estimate: "unknown; exact-head CI, independent review, approved release, and live signed-runner and Android acceptance needed"
agent: "GPT GitHub-connected source repair; no signed Brain coordinator lease claimed"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: fix/continuity-1908-dependencies-disjoint-20261111
head_sha_at_checkpoint: 1e9185d5a8c2c1743fd1aae1f887d56749a757f3
pr: https://github.com/www-infinity4/QuantaPhi/pull/1911
tests:
  - "RED regression at 4ff551542e1113b43fc0ff742e5e97bd849f7423: Continuity checkpoint and packet contracts workflows failed."
  - "GREEN 5b5f25868ff3c6278fd5b8a883bca2f42ac95c46: 6/6 GitHub workflows succeeded, including both Continuity suites."
  - "SESSION 05 RED b37100d6d36c922487cd0bb32accfbbc6bfb2aeb: actionable packet contract test run 42987116092 had 7 passing/2 failing tests reproducing hidden edit target and unsafe source path."
  - "SESSION 05 GREEN 062940e69f83d0301595dc308c5f6343f834e3ec: seven exact-head GitHub Actions workflows passed, including actionable packet contracts 42987188663 and checkpoint engine 42987188709; production acceptance not demonstrated."
  - "MERGE SESSION 04 RED 1e9185d5a8c2c1743fd1aae1f887d56749a757f3: Continuity checkpoint engine 43137713998 reproduced signed runner and owner progress defects."
  - "MERGE SESSION 04 GREEN: 283 focused Node tests passed locally, including SQLite-backed job and restart fixtures."
independent_review: "pending on PR #1911"
merged: false
deployed: false
live_verified: false
blocker: "Independent approval and production evidence are pending. The signed Moltnook workflow on main still has a single concurrency group and a 25-minute timeout. PR #1144 has 11 merge conflicts."
next_action: "Inspect exact-head CI and obtain independent approval of #1911. Release through the existing Brain staging and owner-release workflow when eligible, then observe actual resumed jobs."
---

# Canonical work order retained — no reduced ticket

Owner #1908 remains the complete Continuity Builder request. A test-backed packet-selection repair does not finish the runner, a job, a deployed service, or acceptance.

## Source-backed backlog intake (2026-11-11 UTC)

GitHub search returned 615 open QuantaPhi issues and 162 open QuantaPhi PRs, plus 4 open Moltnook PRs and no open Moltnook issues. The QuantaPhi unfinished directory held 41 numbered checkpoints. These counts are **not** deduplicated jobs and cannot be summed as a 1,000-job execution claim: historical issues, linked PRs and checkpoints may refer to the same work. Private owner-partitioned Brain job count was not readable from the public connector. Create child jobs only after checking source identity, owner scope, live leases and dependency graph.

# Original eight-track dependency graph

| Track | Estimated owner-ticket effort | Depends on | Verified evidence and remaining requirements |
| --- | --- | --- | --- |
| T01 Inventory/dedupe | 20m | Owner #1908, existing #1321/#1192 | Partial GitHub inventory obtained; exact duplicate and dependency graph, signed queue and scope recovery pending |
| T02 Full-ticket acceptance graph | 30m | T01 | Packet selector now stores finite dependency edges, estimated minutes and file scopes; full source-derived graph still pending |
| T03 Durable fenced checkpoints | 30m | T02 | Signed Brain claim and renewal persist the run attempt, lease deadline, source SHA and progress in the existing owner store. The separate packet adapter retains its scoped selection tests. Production readback pending |
| T04 30m+ sessions, lease renewal | 30m | T03 | Signed Brain source renews and enforces the 40-minute repository-engine lease. The Moltnook workflow still has a 25-minute timeout. Long-running job acceptance pending |
| T05 Recover failed/blocked jobs | 30m | T03, T04 | Expired pre-publication claims can resume under a new lease. Interrupted publication resumes only after GitHub confirms the original attempt finished and its PR matches the reviewed source. Production proof pending |
| T06 Auto-next eligible/nonconflicting | 20m | T02, T03, T05 | Source fixtures prove dependency gating, distinct-repository leases and two consecutive jobs. The Moltnook workflow still serializes its own runs |
| T07 Oracle Android status UI | 20m | T03 | Existing owner viewer displays recorded runner progress and respects the saved deadline. #1144 remains a draft with separate Settings/PWA conflicts and device acceptance |
| T08 Test, independent review, merge, deploy, browser | 30m | T01–T07 | GitHub recorded the failing regression head. Focused local tests pass. Exact-head review, merge, Cloudflare and live verification remain pending |

Do not shorten, overwrite, or close the original source tickets. A future claim must carry an actual coordinator-issued lease ID, expiration, fence, source SHA and owner authorization. A separate D1 checkpoint does not constitute a claim. Do not replay uncertain provider writes, override security holds, mint wallet tokens, or call a GitHub Actions green result a successful job.

## Engineering session 05 — reproducible file-conflict regression

At PR #1911 test-only head `b37100d6d36c922487cd0bb32accfbbc6bfb2aeb`, [actionable packet run 42987116092](https://github.com/www-infinity4/QuantaPhi/actions/runs/42987116092) failed **two newly introduced tests** (7 passed, 2 failed): a packet could omit its `nextSourcePath` from `scopePaths`, selecting another packet writing the same target; malformed absolute/traversal/escaped targets also passed packet validation. The source fix `062940e69f83d0301595dc308c5f6343f834e3ec` now always includes the actual edit target in scope collision tests and validates its repository-relative path. All seven [exact-head GitHub workflow runs](https://github.com/www-infinity4/QuantaPhi/commit/062940e69f83d0301595dc308c5f6343f834e3ec/checks) succeeded, including Continuity contracts run 42987188663 and checkpoint engine run 42987188709. This is tested source-only work, **not** a second signed production job or a deployed runner.

Independent PR approval is still missing: GitHub review query returned zero reviews, and requesting `copilot-pull-request-reviewer` through the GitHub collaborator endpoint returned HTTP 422 (not a collaborator). Do not mistake that rejected request for an approval or merge. PR #1144 remains an unmergeable draft, distinct from the queue backend. Moltnook's recorded signed run 42974142666 failed closed at source-review provenance (`source_review_pinned_merge_not_current_or_unrelated_tests`); no new authenticated lease or production rescue has been proven in this session. Preserve original T01–T08 acceptance and staged work without premature closure.

## Merge Session 04

[Session 02's handoff](https://github.com/www-infinity4/QuantaPhi/issues/1908#issuecomment-6811146692) and [Session 01's signed runner checkpoint](https://github.com/www-infinity4/QuantaPhi/issues/1907#issuecomment-6811307579) define the shared scope. [This session's coordination note](https://github.com/www-infinity4/QuantaPhi/issues/1908#issuecomment-6812054984) covers QuantaPhi's Brain claim, retry and progress files. The signed Moltnook workflow remains with Session 01.

The signed claim path uses the existing Durable Object and owner-scoped `work_tickets`. A workflow attempt can claim once. Leases exclude concurrent edits to the same GitHub repository regardless of casing. The runner can reclaim expired pre-publication work. If an interruption happened during publication, the existing alarm reads back the finished GitHub workflow attempt, its job branch's PR and the reviewed file hashes before restoring source evidence. Uncertain publication stays blocked for reconciliation. The recovered receipt leaves merge, deployment and wallet settlement pending.

[Regression CI](https://github.com/www-infinity4/QuantaPhi/actions/runs/43137713998) failed at the test-only commit. The corrected source passed 283 focused tests locally, using SQLite and simulated provider responses. The branch's exact-head checks and review remain attached to [PR #1911](https://github.com/www-infinity4/QuantaPhi/pull/1911). No production lease or deployment was issued in this session.
