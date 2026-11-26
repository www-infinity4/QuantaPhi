---
issue: 1906
project: "Bubbles Identity & Verification Center"
state: review_pending
dot: "🟡"
progress_percent: unknown
progress_basis: "New World ID subtask source and 206 focused tests complete; full identity program and production/phone acceptance remain unverified"
sessions_spent: 4
sessions_remaining_estimate: unknown
agent: "ChatGPT coordinator with Brain engineer and independent security reviewer"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
last_observed_at_utc: "2026-11-23T01:22:56Z"
repo: www-infinity4/QuantaPhi
branch: feat/new-world-user-identity-1906-20261122
head_sha: "6df99fec8f3047e61f5e2b9d7d30b420f13de6e7" # validated code head before this receipt-only checkpoint
pr: "https://github.com/www-infinity4/QuantaPhi/pull/2122"
tests: "Identity109/109; Brain97/97; ledger5/5; additional connector compatibility76/76. Real CI browser360/393/1280 passed at b2a7388; final-head repeat pending"
ci: "https://github.com/www-infinity4/QuantaPhi/actions/runs/45094469562" # actual first-head browser pass; newer-head CI must be rechecked
merged: false
deployed: false
live_verified: false
blocker: "Independent source/security review passed; exact-head CI/browser and release pending; actual free AI quota recovery and owner Android acceptance unverified"
next_action: "Verify exact-head CI and browser fixture for the New World ID and quota classification PR"
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

### Owner's RGB bulb / account-window extension · November 22, 2026

The owner likens an account's enrolled phone identifiers to Christmas-tree bulbs whose hexadecimal colors align into a see-through window, and wants his phone/GitHub app to preserve records so the wallet association isn't lost. Built in PR #2119:
- `workers/unified-wallet/device-color-graph.mjs` maps one **generated** 39-digit alias to 6 reversible `#RRGGBB` tiles plus 16-bit accidental-corruption checksum. Values are strings; precise 128-bit leading-zero roundtrip. Colors are a visualization, **not hidden credentials** or encryption.
- `buildWalletColorWindow` displays an 11-color fingerprint only of the currently verified wallet's previously enrolled device numbers. Order-independent list; different account has distinct hash; `colorWindowsAlign` is never an authentication grant. Signatures and verified owner/server proof remain mandatory.
- [Bubbles unified CI 45073665224](https://github.com/www-infinity4/QuantaPhi/actions/runs/45073665224) at `e03db1966bc60629094915580baeeff71faf24cb`: color graph tests 5/5 and numeric-key/isolated-wallet tests 6/6 passed; all 11 exact-head workflows passed. 
- User's example numbers were intentionally not copied to GitHub. Each user phone contributes **only its own authorized ID**. No cross-user phone scanning, global super-number, public GitHub data storage, or live StarQuest replacement.
- Existing [private GitHub StarCoin backup pilot](https://github.com/www-infinity4/QuantaPhi/blob/main/docs/STARCOIN-GITHUB-BACKUP-PILOT.md) already uses an owner-authorized GitHub App and per-account repository access, but it does **not automatically back up this new numeric device map**. A later encrypted device-map backup must explicitly require account consent, a private repository, independent restore keys and actual success receipts. GitHub Actions/source itself is not phone storage or wallet credentials.

**Deployment hold:** no live number enrollment, no Android passkey ceremony, no server-issued/atomically consumed challenge, no D1 migration or new production wallet session; keep StarQuest and wallet recovery untouched until independent review and two-account physical-device testing.


## New World Identity Generator and Brain quota repair · November 22 CT

Owner-authorized request continues #1906 and #1907; no duplicate issue or owner-signed runner claim is invented. Isolated source branch starts at `2c1e90a6015ee697114a77e322ae15013c1ddf55`.

- A user's **New World ID** is a stable 78-digit decimal **string** derived from the full SHA-256 of a fixed QuantaPhi namespace and the already verified immutable account key. It is separate from each phone's existing 39-digit alias and from the changeable enrolled-device fingerprint. The descriptor is `nwi-v1`, scope `quantaphi`, `isAuthentication:false`. Username, email, telephone number, SSN, hardware ID, tokens and balances are not inputs.
- Authenticated Unified Wallet identity/state responses attach `user.globalIdentity`; the existing connector `/session` returns the same descriptor after verification, including short-lived authorized connector pairing. Caller account IDs or numeric labels cannot select an account. No new D1 table/write or numeric-ID login route exists.
- The existing Verification Center shows/copies the complete number, wrapping at Android widths. Its separate identity check survives an optional provider-account read failure. Refresh/logout clear the prior number; an older asynchronous response cannot repaint another user's number. No identity number is stored in browser persistence.
- **TDD:** eight failing identity regressions were observed before implementation (`/tmp/nwi-red-tests.log`:44/52 passed). Focused final identity suite109/109 passed. Brain engineer observed3 RED regressions and final97/97 Brain/alarm checks passed. Unfinished-ledger5/5 passed before this checkpoint update; rerun on final head.
- **Actual failure:** Moltnook run https://github.com/www-infinity4/Moltnook/actions/runs/45091582238 job137422113098 reached data/adapter reads then failed model inference at2026-11-23T00:56:49.967Z with Workers AI4006: daily10,000-neuron free allocation exhausted. Existing task `IW-20261122-F0E68B20/TASK-1` was preserved. The wallet adapter's separate `credential_missing` is not evidence of rejection of the owner's session.
- Brain change: real provider exhaustion becomes sanitized429 `provider_quota_exhausted`, real credential failure remains401, and unavailable infrastructure becomes503. A quota marker is written only after actual inference under the existing fenced lease. The same job keeps its source/draft/progress and receives a next-UTC-day00:01 retry schedule, **not a promise of provider recovery**. Ordinary blocked-job backoff is unchanged and caller-supplied quota wording cannot change it. No paid fallback or new grant.
- Deployment preparation compared live source to the base without reading account rows:57 Brain modules,3 wallet modules, and13 connector source-map sources all matched exactly. Existing production bindings and secrets must be preserved on content-only release.
- Browser test at360/393/1280px is registered in the existing read-only wallet-browser workflow. Local Chromium cannot create its OS socket (`Operation not permitted`), so no local browser/physical Android pass is claimed. Exact-head CI must run the actual fixture.

Current subtask: source implemented/tested; independent review/CI/release pending. Overall parent progress is unknown; source/tests are2 of4 scoped delivery milestones, with release and actual user acceptance outstanding. No production change, account recovery, billing, financial action or physical phone acceptance is claimed by this checkpoint.

Independent Pink/Purple source review on the current patch found no blocking issues. It independently reran identity109/109 and Brain/retry97/97, checked1000 synthetic account IDs, confirmed account-key compatibility and fail-closed authentication/fenced quota markers. Browser CI and production/owner acceptance remain unverified.


### PR and browser receipt · same session

- [PR2122](https://github.com/www-infinity4/QuantaPhi/pull/2122) contains the same reviewed local Git tree. Latest code head before this receipt-only edit: `6df99fec8f3047e61f5e2b9d7d30b420f13de6e7`.
- [Chromium run45094469562](https://github.com/www-infinity4/QuantaPhi/actions/runs/45094469562), job137431088386, genuinely passed the new identity card at360,393,1280px: exact clipboard copy, no horizontal overflow,44px minimum control, optional provider outage, stale A/B response rejection and logout clearing. These are synthetic accounts, not actual owner-phone verification.
- Two initial source guards caught an unnecessarily changed shared asset pin. The account page now retains the existing common connector revision; additional sign-in/provider/UI suite76/76 passes. The primary site serves textual assets no-cache/must-revalidate and Bubbles SW excludes these modules. Final-head CI repeats all checks.
- Git transport lacked an authenticated username. The existing authenticated GitHub connector uploaded exactly the reviewed public source tree, without tokens/private keys/device credentials. It did not issue a Brain runner claim. Production updates remain gated on final-head CI/merge.
- Next: verify final-head checks, merge with expected head when permitted, preserve production binding identities on content-only promotion, then read back production and record user acceptance separately in #1906/#1907.


---

### Color passages + word-byte training wheels · November 22, 2026

Continued the owner's hex-coded "passageways" visual window from merged [#2119](https://github.com/www-infinity4/QuantaPhi/pull/2119) and the first-word Bubbles handwriting/typing orb idea on [PR #2120](https://github.com/www-infinity4/QuantaPhi/pull/2120), cross-linked to [Complete Me AI #1927](https://github.com/www-infinity4/QuantaPhi/issues/1927). 
New `bubbles-byte-assist.mjs` reports only the first word's UTF-8 byte count, first grapheme and size-clamped orb; optional deterministic local phrase suggestions are tap-to-apply, initially off, can fade or be disabled. Existing Bubbles composer integrates readable Android controls but **does not send any chat, change saved drafts, read wallet contents, call a model or claim work** when letters are typed.
`colorPassageStatus` produces a per-tile 11-bulb match mask of the already verified color window. `wallet-color-passage-lab.html` and module show alignment/misalignment using **synthetic numbers only**. No real wallet keys, balances, signed grants, phone data, or other-user IDs are read. Visual equality never means account authentication or permission to transfer bytes.

Security/release blockers: signed account session proof remains external to this helper; real two-phone wallet enrollment, encrypted owner GitHub backup, HTTPS data flow, Android WebView acceptance, and live Bubbles source release are not verified. This staged branch is not a deployed identity repair. Node tests are wired into the Bubbles unified CI; do not claim a merge/deployment until exact-head checks and readback confirm.

### Black/white/yellow cavity signal model · 2026-11-22 evening

Owner extended the color-window metaphor to a black standby buffer, white signal inside yellow incoming guide, red inspection, orange selection and blue/green/purple output routes, with a Boolean cavity whose control color need not be rendered as a physical pixel. This is now **synthetic-only** `bubbles-color-cavity.mjs` attached to the existing source-stage PR [#2120](https://github.com/www-infinity4/QuantaPhi/pull/2120), and a new opted-in receiver section on `wallet-color-passage-lab.html`. It accepts bounded metadata-only frames (max 128 items, max 32 aperture Booleans), rejects payloads/unauthorized channel names, emits counts and routing labels only, supports manual frame stepping and accessible paused-on-hide slow playback. Nothing reads actual TV broadcasts, encrypted phone fragments, other user records, or identity credentials; color route matches do not authorize financial data reads. Tests `test/bubbles-color-cavity.test.mjs` and updated `test/wallet-color-passage-lab.test.mjs` are wired into existing Bubbles unified workflow. See `docs/BUBBLES-BYTE-ORB-PASSAGEWAYS.md` for the difference between this control-plane analogy and actual LCD/OLED RGB physics.

**Prior exact-head receipt**: earlier #2120 source head `77741533f4a2114bc064b76ecfa41f06981ecb45` had 27/29 workflows passing, with two real endpoint smoke workflows failing `Bubbles health: missing JSON response` ([45085720440](https://github.com/www-infinity4/QuantaPhi/actions/runs/45085720440) and [45085720431](https://github.com/www-infinity4/QuantaPhi/actions/runs/45085720431)). That is still a hard hold for source promotion. No new HEAD CI/production/device claim until a separate receipt exists; PR remains **draft and unmerged**.

### C13B0 Fix 013 — owner-requested chat repair

Base: ad2526af305d505de02a4bc002ba1b7c4e04b06e

Removed composer training-wheel controls and listeners.
Resume existing pending provider handoffs automatically.
Added connector retry control without expanding OAuth grants.
Focused source tests passed locally.
CI, merge, deployment and Android acceptance remain pending.
Related ticket: #1927.

### C13B0 Fix 015 — chat continuity

Base: 893027ac232e158cb2ba139f32099ef48ea0f46c

Preserve the original saved conversation on a matching
same-window OAuth return. Reuse the existing one-time
conversation resume mechanism.

Local focused tests passed.
No credentials, permissions or wallet records modified.
CI and live Android acceptance remain pending.

### C13B0 Fix 016 — OAuth request coordination

Base: 3aecf9105ee8c22d6d94a39221b9065c1359d6a6
Prevent competing connector instances from initiating
or cancelling the same browser-window authorization.
Prevent delayed requests after wallet lookup timeout.
Focused local tests passed.
CI, security review and live acceptance pending.


## November 26 CT · deliver native Bubbles without typing training wheels

- Owner requests ordinary conversation in the existing Bubbles chat, keeping its configured GPT-OSS inference and real tool receipts. Continue #1906/#1907/#1927; no replacement chat, provider switch, new credentials or signed lease is claimed.
- Confirmed merged #2144 (`e585323eb565106d49fd56874343ced52934e020`) removes the typing-helper controls. All four first-party pages still requested the old `20261108-native-bubbles3` script revision; the actual safe auto-updater compares that revision and cannot detect a source-only script change under the same value. Advance the four pages and their existing test contracts to `20261126-native-bubbles4`. Draft/history/recording reload protections remain intact.
- The existing three-second idle loop read both shared memory and website microphone status continuously. Keep the three-second active microphone lease renewal, but refresh quiet visible memory once a minute and website voice status every thirty seconds. Hidden pages suppress idle reads. New messages, current-query memory and owner reconnect still sync immediately through their existing paths. This reduces observed timer demand; it does not prove the source of account-wide quota exhaustion or restore exhausted quota.
- Actual local RED: four of eight update/scheduler tests failed before implementation. GREEN: 37 focused update, training-wheel, chat-turn, voice and memory checks; 104 related account/chat/source checks; and the existing 85-test unified group all pass on Node 24.22.3. Independent Pink review reran 26 voice, native-session, current-memory and scheduler checks with no introduced blocker. Syntax and whitespace checks pass. These counts overlap; do not add them as distinct tests. Browser/physical Android and final exact-head CI remain separate.
- Original overlay Termux integration remains its trusted-origin fixed Python probe and callback. Bubbles One is a different package, and the local Ollama browser pilot is not the original chat or a replacement signed Brain. Current Termux automation file is a read-only watcher, not AI inference. No compatible same-model phone runtime was verified and no software was installed on the phone.
- The signed Brain and public site still return upstream HTTP 429/Cloudflare 1027. Do not advertise live recovery, bypass an enforced failing check, reset credentials, incur fees or change DNS. Next: exact-head source CI and permitted merge, verify the current native assets, then a real native reply and authenticated job when the live provider is available or the migration has a verified host.
