---
issue: 1906
project: "Bubbles Identity & Verification Center"
state: review_pending
dot: "🟡"
progress_percent: 38
progress_basis: "Cloudflare stale gate fix and browser Verification Center source staged and tested; broader OAuth, real provider behavior, independent review, merge, release and two-account acceptance remain"
sessions_spent: 3
sessions_remaining_estimate: unknown
agent: "ChatGPT via authenticated GitHub connector"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
last_observed_at_utc: "2026-11-11T08:30:26.255Z"
repo: www-infinity4/QuantaPhi
branch: feat/unified-wallet-numeric-device-bindings-1906-20261122
head_sha: "fa57c52051e57da232cbc752f9888f9aadaf2425" # device-number core source head, prior to documentation checkpoint
pr: "https://github.com/www-infinity4/QuantaPhi/pull/2119"
tests: "RED 44/45 at d22e0e01, provider-verification run 42987050045; GREEN 45/45 at 73b824a4, run 42987180622; account-connection checks green; real provider and physical Android acceptance pending"
ci: "https://github.com/www-infinity4/QuantaPhi/actions/runs/42987180622"
merged: false
deployed: false
live_verified: false
blocker: "Independent security review not submitted; real Google/GitHub/Cloudflare user OAuth, signed owner execution, Cloudflare deployment and two-account Android acceptance unverified"
next_action: "Verify exact-head PR #2119 CI and source/security review; merge inactive code if policy permits; preserve production StarQuest auth until passkey enrollment proof"
---
# TICKET-1906 — Bubbles Identity & Verification Center

- Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1906
- Repository: `www-infinity4/QuantaPhi`
- Source main at intake: `76d0a40203f88199cd7edb6fc74251ff70a562a5`
- Work branch: `fix/identity-verification-1906-20261111`
- PR: https://github.com/www-infinity4/QuantaPhi/pull/1910
- Related conflicting older PR: https://github.com/www-infinity4/QuantaPhi/pull/1751 (functional correction integrated independently on current main)
- Observed at: 2026-11-11T08:30:26.255Z
- Work state: `review_pending` (not merged, deployed, or live-verified)
- Dot: 🟡 provider-verification 45/45 source tests green at 73b824a4; independent review pending; overall CI may remain queued
- Progress: 35% **estimate** across the seven issue milestones; I02 and source portion of I05 addressed, I01 inventory partially complete; real provider, security, merge, deployment and two-account acceptance outstanding
- Sessions spent: 2 recorded interactive engineering sessions; remaining sessions: unknown
- Agent: ChatGPT via connected GitHub; runner lease: **not claimed**, job ID: **not observed** (no claim receipt)
- Previous CI: commit `0a1db915ffbd63839d922e981667fad4d2bdf191` failed two legacy gate assertions; updated fixtures at `a91fb5e287f8af19ba9e8da6963c71df889ad1f3` and reran through PR push
- Focused CI: https://github.com/www-infinity4/QuantaPhi/actions/runs/42973263803
- Connection regression CI: https://github.com/www-infinity4/QuantaPhi/actions/runs/42973263702
- Independent review: Copilot review attempted through authenticated GitHub tool; no matching request event, assignment, or submitted review observed. Not independently approved.
- Cloudflare deployment: none performed
- Live Android/browser verification: not performed
- Security boundary: no OAuth scopes, provider secrets, durable account storage, wallet ledger, GitHub owner execution rules, or permission grants changed

## Current source changes
1. Browser verification center normalizes Google/GitHub/Cloudflare statuses only from wallet-authenticated account records.
2. Separate actual recorded grants, unapproved capabilities, record-update time and real verification timestamps when supplied.
3. Fix stale Cloudflare gate configuration and avoid a green check with no verified wallet session.
4. Remove stale verification presentation when a refresh fails; preserve Oracle styling and 44px mobile controls.
5. New targeted regression tests and CI job.

## Blockers and next executable action
1. **Verified:** focused exact-head RED failure 44/45 at d22e0e01 and GREEN pass 45/45 at 73b824a4; worker/account-connection regression CI also passed. This checkpoint edit needs fresh exact-head recheck.
2. **Blocking:** no independent security review submitted. GitHub reviewer request for `copilot-pull-request-reviewer` was rejected (HTTP 422, not an eligible collaborator); do not represent it as approval. Obtain an eligible independent reviewer and resolve findings before merge.
3. Audit live Google/Cloudflare OAuth configuration and signed GitHub executor with authorized test sessions; `connection_complete_exchange_type_redirect` still requires actual provider/server traces.
4. Merge only eligible independently reviewed changes, then verify Cloudflare deployment and two isolated Android sessions.

No credentials or private user identifiers in this checkpoint. Never convert this source milestone into a release receipt.

## Engineering session 04 — 2026-11-11T08:30:26.255Z

- Existing issue #1906 and PR #1910 reused; PR #1751 remains unmergeable and its safe stale-Cloudflare correction is already in #1910. No duplicate ticket created.
- RED regression commit `d22e0e01f42e12bc87fc6271718b6d9892ea145a`: `test/bubbles-provider-verification.test.mjs`. [CI 42987050045](https://github.com/www-infinity4/QuantaPhi/actions/runs/42987050045) failed the new server-update timestamp test (44 passed, 1 failed).
- GREEN source commit `73b824a4fe08823410e58cff3f2eba4b959e8ce6`: `workers/bubbles-connections/consent.mjs` now exposes only the actual server `updatedAt` record timestamp, never fabricated `verifiedAt` or private credential refs. [CI 42987180622](https://github.com/www-infinity4/QuantaPhi/actions/runs/42987180622) passed 45/45 focused tests. Other targeted account and wallet checks green at source head.
- Cloudflare read-only inventory: the existing `bubbles-connections` Worker has Google/GitHub/Cloudflare client secret-name bindings and its encryption-key bindings; **names do not prove valid values or OAuth success**. Latest observed Worker deployment was 2026-11-06T09:36:28Z, pre-dating this branch. No release triggered.
- Security review: no submitted independent approval. Automated review request returned GitHub 422 (reviewer not eligible collaborator). This cannot be counted as a review.
- Provider acceptance: live callback trace for `connection_complete_exchange_type_redirect`, two real isolated accounts, session expiry and Android navigation still need authenticated end-to-end verification; existing synthetic tests are not that proof.
- Owner wallets, provider secrets, token storage, OAuth scopes, existing accounts and balance ledgers were not modified. No merge, production deployment, Android test, or connection success claimed.
- Next single action: secure a real independent security review of the exact PR head before any guarded merge or deploy; fix any findings on this branch and rerun exact-head checks.

---

## Numeric wallet device aliases · owner idea November 22, 2026

The owner proposes that each phone retain an individually generated numeric string and that Unified Wallet recognize the phone/account relationship without repeated StarQuest sign-in. Example numeric strings supplied in conversation are **not actual credentials**, are not reproduced in source or documentation, and do not establish ownership.

**Staged [PR #2119](https://github.com/www-infinity4/QuantaPhi/pull/2119):** new `workers/unified-wallet/device-number-core.mjs`, isolated Node tests, and `workers/unified-wallet/migrations/0001_numeric_alias_pilot.sql` (NOT applied). Generates 39-character decimal identifiers from 128-bit CSPRNG as strings; they are a public index, not password, phone number or balance access. A server mapping can link each account only to devices the owner explicitly enrolled. The account-scoped SHA-256 device-list fingerprint is not authorization. Cryptographic proof requires verified wallet account, signed P-256 challenge binding account+number, expiration and single-use enforcement. Source helper rejects copied numbers, wrong accounts, expired/replayed/tampered signatures. A production server must validate WebAuthn/passkeys and atomically consume challenges; no login route is enabled in this PR.

**Existing identity and financial safety:** original StarQuest device token lookup and Unified Wallet balance/ledger tables completely unchanged. No private user phones were scanned or remotely registered, no actual numeric user examples stored, no D1 migration, no new authentication grant, no billing or Cloudflare changes. Existing passkey work [Quant Mail PR #1240](https://github.com/www-infinity4/QuantaPhi/pull/1240) is relevant but not merged/production verified; reuse a supported WebAuthn ceremony rather than custom authentication. Real Android passkey, account recovery, credential revocation, two accounts per device, cross-account isolation and staged migration still unverified.

**Acceptance:** exact-head 6 focused Node tests and existing wallet account isolation CI, source review, then source-only merge if permitted. Next production action requires authenticated first-device enrollment (using existing sign-in/recovery), real WebAuthn proof and fail-closed staging before any StarQuest dependency removal. No robot Brain sign-in or device restoration success claimed.
