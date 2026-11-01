# Continuity Builder: actionable packet executor contract (#1321)

This source-only module does not itself call GitHub, Cloudflare or Bubbles and must not claim to run autonomous jobs. The authenticated runner must consume and persist the packet contract before production use.

## Resume without a history-reading loop
Read latest approved work/unfinished/INDEX.md once and fetch actual GitHub state for the chosen candidate; use a lastScannedVersion checkpoint to skip unchanged history, and never re-read every PR each hour.
Every packet carries repo, issue, exact 40-char headSha, one nextAction, nextSourcePath, priority, state, independently verified lease (if any), exact CI/review state and last result.
Selection considers up to 5 actionable candidates, skips duplicate issue/head, already attempted done packets, unchanged known blockers and genuinely active foreign leases. Safety holds prohibit merge.
Run at least one genuinely authorized test/write/review or merge action before stopping for source-only status if a safe candidate exists. Blocked candidate gets one reason and immediate rotation to next candidate.
Each provider-confirmed mutation needs a real URL or SHA; approved review and green exact-head CI precede merge. Deployment and live browsing remain separate confirmations.
Do not invent a lease, use another business's credentials, modify wallet/auth/Cloudflare private services without permission or fabricate a merge merely to avoid zero activity.

## Next engineering milestone
Wire continuity/work-packets.mjs into authenticated continuity-session-coordinator / Moltnook runner with persisted D1 checkpoint and genuine lease/fence. Test two successive runs: first makes one allowed source edit/merge, second does not reread an unchanged blocked head and selects another ticket. Confirm wallet safety. Do not claim this current pure planner has completed that integration.

Initial safe packets: finish #1319 source directory PR; create #1320 ad storyboard with official source link and original creative; investigate #1312 eligible TinyFish bounty; run #1316 partner opt-in build after permissions are granted.