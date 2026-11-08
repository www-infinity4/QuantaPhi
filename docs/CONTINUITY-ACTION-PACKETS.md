# Continuity Builder: actionable packet executor contract (#1321)

This source-only module does not itself call GitHub, Cloudflare or Bubbles and must not claim to run autonomous jobs. The authenticated runner must consume and persist the packet contract before production use.

`continuity/packet-runner-adapter.mjs` is an independently tested adapter seam. It
requires an active, fenced D1 coordinator claim and an opaque owner-scope hash,
reads candidate history only for a changed SHA-1/SHA-256 source version, and
persists packet receipts and blockers to D1. Its candidate reader and action
executor are injected capabilities; the seam itself has no GitHub credentials
and does not prove that an action ran.

## Resume without a history-reading loop
Read latest approved work/unfinished/INDEX.md once and fetch actual GitHub state for the chosen candidate; use a lastScannedVersion checkpoint to skip unchanged history, and never re-read every PR each hour.
Every packet carries repo, issue, exact 40-char headSha, one nextAction, nextSourcePath, priority, state, independently verified lease (if any), exact CI/review state and last result.
Selection considers up to 5 actionable candidates, skips duplicate issue/head, already attempted done packets, unchanged known blockers and genuinely active foreign leases. Safety holds prohibit merge.
Run at least one genuinely authorized test/write/review or merge action before stopping for source-only status if a safe candidate exists. Blocked candidate gets one reason and immediate rotation to next candidate.
Each provider-confirmed mutation needs a real URL or SHA; approved review and green exact-head CI precede merge. Deployment and live browsing remain separate confirmations.
Do not invent a lease, use another business's credentials, modify wallet/auth/Cloudflare private services without permission or fabricate a merge merely to avoid zero activity.

## Integration boundary
The current `workers/continuity-session-coordinator/worker.mjs` is an observation-only monitor. Its Cloudflare bindings do not include the authenticated Brain `CLOCK`/`/work/run-next` route or the owner-scope identity needed to load and act on private owner tickets. The existing Brain runner is authenticated separately, but no verified adapter joins it to this coordinator. Until that signed bridge and its deployed D1 authorization are available, do not call the seam from the hourly/5-minute monitor or claim production execution.

The integration acceptance remains: wire through that existing authenticated route, then verify a real eligible action/PR through exact-head CI, independent review and guarded merge; a resumed run must skip the unchanged checkpoint without rereading history or duplicating a write. Preserve owner grants, wallet and security gates. The seam's synthetic adapter tests are not that production acceptance.

## Color handoffs share the packet; they do not grant authority

When a future authenticated adapter uses color roles, each actual transition must remain attached to the same ticket/job, repository, branch, source SHA and verified lease/fence. Red collects only the bounded ticket-relevant evidence map. Yellow selects records from that map and preserves their source IDs/provenance. Orange combines the Red context and Yellow selection to record the evidence-based action and exact destination; that decision does not authorize a write. For a known scoped code repair, Red/Yellow/Orange/Blue may be marked skipped as irrelevant and Green can proceed directly.

Blue's import lifecycle must distinguish `import_planned`, `write_attempted`, `import_confirmed` and `blocked`. `import_confirmed` requires an existing authorized source/destination adapter, access and schema validation, idempotency and owner-partition checks, a provider-backed write receipt, and destination readback. A plan, model response, candidate record or mock is not an import. Only confirmed landed data may feed Green's manufacture step. Green then uses the existing authenticated repository writer; Pink independently tests/reviews, GPT Purple adjudicates against the request, and Black verifies exact-head CI, eligible merge, deployment and Android acceptance separately.

Any emitted handoff receipt must be provider-backed and scoped to the same job. Its verified fields are `jobId`, `role`, `inputRef`, `sourceSha`, applicable `selectedRecordIds`, `destination`, `decisionReason`, `toolAdapter`, `outputRef`, `operationStatus`, `timestamp` and `nextRole`. Label model output `model_reasoned`, adapter invocation `tool_executed`, and confirmed persistence `data_written`; these are distinct observations. Omit unverified fields and report unused stages as skipped, never as performed.

For this PR, the evidenced work is source editing and local Node regression testing only. No Red, Yellow, Orange, Blue, Green, Pink, Purple or Black executor transition has an independent provider receipt here; in particular, no Blue import or destination readback occurred. The adapter seam tests use synthetic injected capabilities and do not provide the authorized import adapter. That remains a separate integration dependency, not scope for this packet-selector PR.

Initial safe packets: finish #1319 source directory PR; create #1320 ad storyboard with official source link and original creative; investigate #1312 eligible TinyFish bounty; run #1316 partner opt-in build after permissions are granted.