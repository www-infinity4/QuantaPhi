# TICKET-2036: Bubbles offline Android voice

- **GitHub issue:** https://github.com/www-infinity4/QuantaPhi/issues/2036
- **Parent:** #1908 · **Related:** #1231, #1907
- **Owner request source:** recent owner Bubbles project sessions, recovered in [SESSION-RECOVERY-2026-11-21.md](SESSION-RECOVERY-2026-11-21.md); full original transcript not embedded
- **Priority:** P1
- **Status:** scoped / unclaimed; RED means unfinished, not running
- **Progress:** 0% of listed engineering acceptance verified (estimated); issue/doc creation is not implementation
- **Sessions spent on build:** 0 documented
- **Sessions remaining:** unknown (bounded slices to be estimated after code inspection)
- **source_repo:** www-infinity4/QuantaPhi (cross-repo parts subject to actual source inspection)
- **source_commit_sha:** not yet pinned by executing Bubbles agent
- **Agent/lease identity:** none claimed here; no job lease granted by this file
- **last_observed_utc:** none for build stage (documentation created 2026-11-21)
- **Test/CI/PR/merge/deploy/Android receipts:** none asserted for this new scope

## Acceptance criteria
Offline mobile STT/TTS evidence, reproducible CPU/RAM/size/latency comparison, secure mic controls, Android acceptance; no false claim of fully local LLM or completed signed APK.

## Next single executable action
Identify actual Android source/build chain and current STT/TTS code; pin candidate release licenses and benchmark metrics.

## Guardrails and handoff
Read `AGENTS.md`, `docs/BUBBLES-GPT-BUILDER-ROUTING.md`, `work/unfinished/README.md`, `work/unfinished/INDEX.md` and issue #2036. Search matching PRs, current source/head and runner leases before doing anything else. Only authorized adapter may claim and edit actual code. Use failing regression first, exact-head CI, independent verification appropriate to risk and separate signed merge/deploy/browser/physical Android receipts. Add dated issue comments after every actual session. Preserve active tasks and avoid duplicate PRs. This ticket does not claim that the feature is built or running.
