---
issue: 1231
project: "Bubbles shared composer: 16 images, 20 videos, uncapped text entry"
source_requests: ["Owner chat request, 2026-11-21"]
state: source_tested
dot: "🟡"
progress_percent: 60
progress_basis: "Estimated scoped milestone: source and focused regressions complete; exact-head CI, release, live browser and physical Android outstanding. Parent readiness issue remains open."
sessions_spent: 1
sessions_remaining_estimate: "1–2 for this subset"
agent: "Codex GPT Brain; independent Pink source and regression review"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
last_observed_at_utc: "2026-11-21T11:36:58Z"
repo: www-infinity4/QuantaPhi
branch: fix/bubbles-media-composer-1231
head_sha: 6a4784c51fb67a4426bb27cb5acbda4dff247034
pr: 2033
tests: ["59 focused Node regressions passed", "115 related Bubbles contracts passed", "Two new tests failed against old source before repair"]
ci: []
merged: false
deployed: false
live_verified: false
blocker: "Local Chromium launch is blocked by environment socket permissions. Real decoding/browser checks run in existing Android CI."
next_action: "Push this scoped source and inspect exact-head PR CI, including the real 36-file mixed-batch browser test."
---

This checkpoint covers the November 21 composer request under existing [readiness issue #1231](https://github.com/www-infinity4/QuantaPhi/issues/1231). It does not replace the broader website/APK, identity, voice or Brain acceptance work in that issue. No authenticated coordinator lease was issued to this interactive session; none is claimed.

## Scoped behavior

- The existing composer accepts 16 JPEG/PNG/WebP images and 20 MP4/WebM/MOV videos together, including repeated selections. Overflow leaves the existing batch available.
- Images keep the existing 8 MB local bound. Videos keep a 100 MB per-file bound. Clips remain on the device; the existing vision adapter reads three sampled JPEG frames per ordinary clip. Labels explicitly exclude audio transcription and full-motion review. Unsupported codecs fail visibly and retain the batch.
- Text entry has no `maxlength`. The current service processes up to 32,000 characters in a turn; oversized text is rejected visibly with the full draft retained. Long text is sent once, not duplicated in the request envelope. Failed sends restore the cleared draft without replacing newer typing or another conversation.
- Device chat reloads preserve full text. When cloud history contains a bounded exact prefix of the same verified turn ID, reopening keeps the longer local copy. Cloud memory remains bounded; full cross-device long-text recovery is not claimed.
- Video-only drafts participate in History, new-chat and update guards. No source media bytes are persisted. Android SAF returns the selected URI array; JSON history selection stays single-file. APK source version advances to 0.59.0 (59), retaining the existing package/signing workflow.
- Four first-party chat loaders use the new shared source revision.

## Verification and remaining work

Two new source/vision regressions failed against the old four-image/2,500-character implementation before the fix. The focused suite now passes 59 tests; a separate related-contract suite passes 115. Independent Pink review identified and prompted fixes for pre-media video routing, cloud prefix replacement and duplicated long-text payloads. Added real browser tests for 16 images plus 20 clips (76 successful vision calls), overflow, failed analysis retry, uncapped 100,004-character entry, long-text failure recovery, video-only New chat cancellation and removal. Those browser tests have not yet executed successfully here: Chromium could not create its singleton socket in the local environment. CI and production acceptance must supply their own receipts.

Next: inspect exact-head PR tests and Android build/browser results; repair actual failures; merge only if GitHub permits and checks pass. Verify Pages and Bubbles tools Worker deployments separately, then inspect the live composer. A published preview APK is not evidence that a phone installed it or that physical Android video decoding passed. Keep #1231 open for remaining readiness work.

## PR CI follow-up

[PR #2033](https://github.com/www-infinity4/QuantaPhi/pull/2033) publishes the locally tested source tree `1a1add837370637b1af16e76fc40104286254089`. The first exact-head pass exposed stale asset-revision assertions, an APK version assertion, a clear-composer source assertion and a missing canonical issue hyperlink in this checkpoint. These assertions/links are updated without weakening the behaviors they check; 86 targeted correction tests passed. The semantic tools source/deployment-check workflow passed on the initial head; this PR run did not deploy production. Full mixed-batch browser execution and release are still pending.
