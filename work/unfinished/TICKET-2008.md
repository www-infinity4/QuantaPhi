---
issue: 2008
state: source_tested
dot: "🟡"
progress_percent: 30
progress_basis: "Local source implementation and 5 focused prototype tests passed; exact-head CI, true egress audit, release, browser and Android acceptance not yet verified."
sessions_spent: 1
sessions_remaining_estimate: "unknown"
agent: "GPT Brain via authenticated GitHub connector; no signed runner lease claimed"
lease_id: null
fence: null
lease_expires_at: null
task_session_id: null
next_action: "Run exact-head CI on PR 2009, review worker response CSP and verify local storage and egress with actual browser evidence."
merged: false
deployed: false
live_verified: false
---

# TICKET-2008 — Gap 2 Privacy & Agency: Local Mirror + Shadow Web Radar
canonical_issue: https://github.com/www-infinity4/QuantaPhi/issues/2008
status: source_tested
dot: 🟡
progress_percent_estimate: 30
progress_basis: "Standalone opt-in worker, local IndexedDB, lexical profile, limited resource radar, HTTP CSP header guard, 3 new regression test files and Bubbles card catalog entry staged; exact-head GitHub CI, actual server header readback, browser/Android acceptance, privileged radar extension, true embedding model, network packet attestation and all downstream gap implementations unverified."
sessions_spent: 1
sessions_remaining_estimate: unknown
repo: www-infinity4/QuantaPhi
branch: feat/local-mirror-gap2-privacy-2008
owner_scope: "User prioritizes Gap 2 and requests a local privacy sandbox plus Shadow Web Radar. No account exfiltration, remote sniffing, spoofing, or dark-web intrusion."
source_files:
- local-mirror.html
- local-mirror-core.mjs
- local-mirror-worker.mjs
- local-mirror-app.mjs
- workers/quantaphi-site/worker.js
- bubbles-card-catalog.mjs
- test/local-mirror.test.mjs
- test/local-mirror-edge.test.mjs
- test/local-mirror-catalog.test.mjs

## Privacy contract
- Local-only processing is opt-in for this page. The worker writes selected text to IndexedDB; records can be deleted. It produces an explainable word-count profile, not AI embeddings.
- A SHA-256 digest is an integrity fingerprint, NOT a signed zero-egress or zero-knowledge proof. The page explicitly displays network evidence as unknown until an independently trusted monitor verifies it.
- Both document and worker asset responses require edge Content-Security-Policy with connect-src 'none'. A CSP meta tag in a page alone is NOT sufficient to govern independent worker script responses.
- Shadow Web Radar displays only the page's observable resource entries/CSP violations. It cannot intercept other tabs, arbitrary network requests or fingerprinting calls. Blocking/spoofing capability is NOT built; no claims of actual intervention.
- Main page currently runs independent analytics/ads. Nothing in this ticket proves main-site zero egress, nor should global services be disabled to force a false result.
- Preserve wallet and user-account isolation, no background audio, no covert telemetry or private user text in GitHub.

## Evidence
- Development-local TDD: first run failed with missing implementation (ERR_MODULE_NOT_FOUND); after implementation, 5 focused Node tests passed on local prototype (not a GitHub exact-head CI result).
- GitHub branch writes include worker, UI, tests, gate and catalog. Check exact PR head and CI when PR exists.
- No browser, physical Android, deployment, or independent network capture result claimed.

## Next action
Run exact-head PR CI, repair any failing tests, verify edge CSP responses for the document and worker script and confirm a private Android browser can save/list/clear locally without outbound connection attempts after load. Then source review and guarded merge/deploy; privileged extension/proxy isolation is separate and not approved.
