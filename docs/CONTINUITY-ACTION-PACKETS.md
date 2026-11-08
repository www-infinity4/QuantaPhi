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

Initial safe packets: finish #1319 source directory PR; create #1320 ad storyboard with official source link and original creative; investigate #1312 eligible TinyFish bounty; run #1316 partner opt-in build after permissions are granted.