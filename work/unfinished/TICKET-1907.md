---
issue: 1907
subtask: ISHA living rulebook and Bubbles Quick Card
state: ci_passed
dot: "🟡"
progress_percent: 50
progress_basis: "ISHA subtask only: source and CI 50%; independent review, protected merge, canonical deployment and Android/voice acceptance remain."
sessions_spent: 1
sessions_remaining_estimate: "unknown; depends on independent review and physical Android acceptance"
agent: "Bubbles GPT coordinator / Green source author; separate review pending"
lease_id: null
fence: null
lease_expires_at: null
task_session_id: null
merged: false
deployed: false
live_verified: false
next_action: "Obtain independent PR #1990 review at exact head before protected merge."
---

# ISHA Rulebook — issue #1907 subtask

**Request:** Continue the owner's request for an editable ISHA safety/standards guide that Bubbles can recognize in the app. Investigate and integrate only verified existing Tor Browser source; do not treat onion gateway or public browser broker as Tor transport. Avoid downloading, indexing or distributing sexual material involving minors. Support only authorized provider media under separate #1603 review.

**Repo:** `www-infinity4/QuantaPhi` / branch `feat/isha-rulebook-bubbles-1907` / PR https://github.com/www-infinity4/QuantaPhi/pull/1990 .

## Source and acceptance

- `test/isha-rulebook.test.mjs` test-first commit `07fb309ecad31a4049c6c2282750919c8088dff2`. No standalone failing test receipt was obtained, so do not claim a verified red execution.
- Core `isha-rulebook-core.mjs`: strict read-only public-domain/onion/gateway classifier with **no network connections**; rejects untrusted media and private hosts as evidence URLs; draft-only editable rule records; versioned JSON validation and safe CSV export.
- UI `isha-rulebook.html` and CSP-compliant external module `isha-rulebook-ui.mjs`: local draft editor, localStorage with no silent overwrite of unreadable records, local CSV/JSON export and strict import, address classification, 44+ pixel controls.
- Existing `bubbles-card-catalog.mjs` app card `isha-rulebook` and aliases `isha book`, `isha rulebook`, `infinity standards`. Not a claim that a live Bubbles model has executed this route.
- `docs/ISHA-RULEBOOK.md` distinguishes proposals from law, safety/rights guards, source provenance and correction path; notes `.ky` already exists and `.kris` requires formal delegation.
- CI `https://github.com/www-infinity4/QuantaPhi/actions/runs/44652467851`: **passed** with Node syntax check and 6/6 source tests at code head `89fcabd2502e814a64d879e58a52d8872b3d8a74`.
- No actual merged Tor Browser or Tor transport repository source was found. Existing HTTPS browser broker PRs #1171/#1286 remain separate and unmerged. No source/rights proof for any new third-party video feed.
- External user worksheet is independently generated for review (`ISHA_Infinity_Rulebook_2026-11-19.xlsx`); not automatically synced with this static editor or uploaded into QuantaPhi.

## Gates and blockers

- Independent Pink code review and current exact-head CI must be obtained before a permitted merge. PR #1990 is reviewable, not merged or live.
- Current code has no approved login, remote synchronization, server enforcement, payment, video scraping, child sexual media, or Tor-origin browsing.
- Black requires separate merge SHA, Pages/deployment run and public/browser/Android readbacks. The existing site must not be claimed as newly deployed without these.
- Signed Robot Brain runner lease/fence is **none observed**. GitHub connector commits are not signed Bubbles runner receipts.

Next action: obtain independent review of PR #1990 at latest head, then recheck exact-head CI and guard the merge. Keep issue #1907 open for broader Brain work and physical Android voice-route acceptance.
