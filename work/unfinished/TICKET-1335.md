---
issue: 1335
project: "ShopPhi owner listing edit, unlisted publish and secure seller assistance"
source_requests:
  - https://github.com/www-infinity4/QuantaPhi/issues/1335
state: implementing
dot: "🟡"
progress_percent: unknown
progress_basis: "Authenticated edit source changes and tests staged; independent review, exact-head CI, two deployments and real owner/public readback outstanding"
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "ChatGPT direct connected GitHub repair, not an authenticated Moltnook runner"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
last_observed_at_utc: "2026-11-01T04:25:02.571Z"
repo: www-infinity4/QuantaPhi
branch: fix/shopphi-published-edit-ui-20261031
head_sha: 2ac72adb6f5f8f0c65bb5db96cb10c1d0f727be0
pr: https://github.com/www-infinity4/QuantaPhi/pull/1336
backend_repo: www-infinity4/Quant-AI
backend_pr: https://github.com/www-infinity4/Quant-AI/pull/4
tests:
  - "Quant-AI RED run 41272600522: failed missing edit endpoint"
  - "Quant-AI GREEN run 41272615971: success after implementation"
  - "QuantaPhi RED runs 41272650257 and 41272726566: failed missing edit semantics / initial fixture"
  - "QuantaPhi seller CI 41272802352: success on earlier frontend commit"
ci:
  - "Latest QuantaPhi head checks pending verification; prior success is not current-head acceptance"
  - "Latest Quant-AI docs head checks pending verification"
merged: false
deployed: false
live_verified: false
blocker: "Exact-head CI and independent source review pending; live Quant-AI Worker is still Oct 28; no real Brain claim/lease or owner-device public edit receipt"
next_action: "Verify Shop Phi seller photo flow and all required exact-head checks of QuantaPhi #1336, repair any failures, then obtain independent source review before backend-first release"
---

# ShopPhi #1335 — current owner handoff

Owner request: Fix listing editing, publishing, GPT-assisted authoring and real authorization. Never treat language-model judgment as authorization. Preserve existing wallet credentials, StarCoins, Quants, receipts, seller identity, uploaded photos and source images.

## Confirmed existing foundation

- Quant-AI seller API with verified Unified Wallet identity, private D1 draft ownership, R2 SELLER_MEDIA, and unlisted public GET was previously deployed on Oct 28. It is separate from the WidgetPhi legacy catalog whose live Worker has no bindings.
- QuantaPhi PRs #1188/#1197 had already merged, giving drafts/recovery and initial publish UI. Published listing editing was blocked in the server and invisible in the UI.
- Two distinct Workers exist: `quant-ai` handles seller APIs; `infinity-brain-clock` provides coordinator code. **This ticket has no verified Brain intake/claim/lease/runner receipt.**

## Source changes in this documented session

1. Quant-AI PR #4 implements owner-only `POST /api/shopphi/listings/:id/edit`, retaining item ID, publish state and URL, with owner-check, attestation for published edit, content validation, photo ownership, removed-listing guard; adds test-first regressions and API release documentation.
2. QuantaPhi PR #1336 exposes editing published and private listings, checks public-edit consent, keeps old photo receipts and uploads newly added photos, prevents same-item local draft duplicates, requests the wallet API, verifies updated public readback, and cache-busts seller scripts. Includes tests with demonstrated RED before initial GREEN.
3. Github issue #1335 records scope and a truthful worker status. No live Worker code, D1 rows, wallet accounts, secrets, tokens, seller records or public listing were changed during this session.

## Required remaining steps

- Reverify exact PR-head CI and inspect any failures, then independent source and security review.
- Merge and deploy **Quant-AI first**, preserving all live bindings. Only then merge/deploy **QuantaPhi**. Keep release receipts.
- Authenticated owner/device edit with actual photos and original public listing URL, anonymous public readback, cross-wallet denial, expired-session tests, no duplicate listing and no token changes.
- Audit GPT listing assistant output as untrusted suggestions, server authentication and server policy as sole authority. Public/For You carousel promotion remains separately moderated.
- Attach actual Moltnook intake/runner lease if dispatched later; a GitHub issue and this checkpoint are not a Brain worker assignment.

**Do not close or mark GREEN until all acceptance gates succeed.**
