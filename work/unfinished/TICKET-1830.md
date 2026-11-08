issue: 1830
project: "Opt-in collectible image Quick Card studio and future creator entitlements"
repo: "www-infinity4/QuantaPhi"
branch: "feat/collectible-set-studio-20261107"
state: "source_tested"
dot: "yellow"
progress_percent_estimate: 24
sessions_spent: 1
sessions_remaining_estimate: "unknown"
last_observed_utc: "2026-11-08T01:30:00Z"
lease_id: null
lease_owner: null

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
