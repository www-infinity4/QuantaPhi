---
issue: 1830
project: "Opt-in collectible image Quick Card studio and creator entitlements"
state: source_tested
dot: "🟡"
progress_percent: 24
progress_basis: "Estimated: local opt-in image draft, exact-image fingerprints and studio tests implemented; rights checks, authenticated protected storage, D1 paid entitlements, wallet integration, production approval and Android live acceptance pending"
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "GPT · Green source build, Pink CI, Purple review, Black release pending"
lease_id: null
fence: null
lease_expires_at: null
task_session_id: null
repo: www-infinity4/QuantaPhi
branch: feat/collectible-set-studio-20261107
head_sha: null
last_observed_at_utc: "2026-11-08"
issue_url: "https://github.com/www-infinity4/QuantaPhi/issues/1830"
pr: "https://github.com/www-infinity4/QuantaPhi/pull/1831"
merged: false
deployed: false
live_verified: false
blocker: "Rights review, authenticated storage and creator D1 payment ledger are not built; exact-head CI and Android acceptance pending"
next_action: "Inspect PR #1831 exact-head CI, repair any regressions, then run independent Android and privacy checks"
---
# Goal
Owner wants previously collected images (original or permitted memes, vintage images, cartoons, art) suggested as a potential creator card set. One free extra cover, ten separate paid collectibles at a proposed 1 Star Coin each, never double-charge, creator-specific provenance and paid rarity after authenticated review.

# Scope resolved
Do not inspect a person's device gallery or saved-photos history without purpose-specific opt-in. Saved images are not automatically licensed for commercial resale. A hash flags exact duplicates, not ownership or guaranteed prevention of screenshots, copying or off-platform reselling. Proposed coin unlocks do not imply current wallet capabilities.

# Source milestone — work carried out in this session
- Existing Media Star creator now links to original `/collectible-set-studio.html`; the existing Developer carousel remains in charge of its original DOM.
- Browser-only studio accepts user-selected JPEG/PNG/WebP cover and 2–30 collectible files, computes local SHA-256 fingerprints, checks exact duplicates and explicit rights/consent, previews the separate free cover, displays priced but disabled collector concepts, and allows copying a safe GPT build brief.
- `collectible-set-core.mjs` rejects non-opt-in AI suggestions, unknown rights, duplicate content and cover-image reuse. Browser-side paid-image availability remains false regardless of a purported entitlement object.
- QuantaPhi original GPT viewer link is used. No user photos, filenames, private interests or account data are sent to GPT by default. Clear revokes temporary local object URLs.
- One independent focused Node test collection added for privacy/rights/economy/entitlement/source wiring.
- CI workflow `.github/workflows/collectible-set-studio.yml` added for exact-head source and syntax tests.
- Commercial gateway / Cloudflare D1 / real wallet transfers deliberately NOT implemented; details in `docs/COLLECTIBLE-SETS-PAYMENT-ROADMAP.md`.

# Verification and next gates
- TDD RED reproduced a missing module; GREEN local core test: 6/6 passed in Node 22 on project files (before connector commit). Remote exact-head CI, independent code review, Android browser and deployed site verification are unverified.
- No authentic paid original assets have been published; all production/financial/rights checks remain pending.
- Estimated 24% of full requested experience: local creator draft + tests completed; authentication, rights/moderation, fingerprint registry, D1 transactions & payout, Cloudflare deploy and Android acceptance outstanding.
- Next safe action: open draft PR, read exact-head CI, repair failures, then test browser at Android widths and obtain independent review.
