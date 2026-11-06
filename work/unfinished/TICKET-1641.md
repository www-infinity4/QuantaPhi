---
issue: 1641
project: "Classic Rock official music buttons with artist-linked releases"
state: implementing
dot: "🟡"
progress_percent: 65
progress_basis: "Six artist on-page controls plus compact source-backed digital album offer source and focused tests authored; exact-head CI, browser verification, independent review, and deployment outstanding"
sessions_spent: 3
sessions_remaining_estimate: "1–2 acceptance sessions; timing unverified"
agent: "ChatGPT"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: fix/artist-music-stays-on-quantaphi-20261103
last_observed_utc: "2026-11-05"
tests: "New regression source and Node test; source contract checks passed locally; full GitHub CI outstanding"
merged: false
deployed: false
live_verified: false
blocker: "Exact-head GitHub CI, review, Cloudflare deployment, Android click/readback"
next_action: "Run exact-head radio-artist-offers CI and independent review of PR #1655; reconcile main conflicts before release, then verify on Android"
---

# Canonical issue

https://github.com/www-infinity4/QuantaPhi/issues/1641

# Personal Context Skill / engineering intake

Reviewed saved project context and the repository's AGENTS.md, unfinished-work README and INDEX, and Personal Context/Bits ticket #1296 before editing. Existing 21+ shelf, Steve Miller card, Infinity Radio and music wallets are untouched. No authenticated personal record, token, Bubble Bits, purchase, merchant API or tracked user preferences were read or changed. No coordinator lease claim was made. This work is a single bounded UI module, not execution of broader unfinished tickets.

# Owner acceptance scope

Five independent official artist YouTube channel launch buttons (Pink Floyd, REO Speedwagon, Cheap Trick, Journey and Styx), each with band-specific links for official CD/vinyl/digital/apparel where a trusted artist-linked store was found. No YouTube video viewer in QuantaPhi. Playback/volume controls are handled by YouTube after a genuine click. REO's independently named reospeedwagon.shop was intentionally excluded because its relationship with the band was not verified; official REO album/catalog links are shown instead. This is not paid/sponsored advertising and no unverified prices, merchant inventory, affiliate claims or eBay resales are used.

# Source evidence (observed 2026-11-03)

- Pink Floyd YouTube official artist channel and https://www.pinkfloyd.com/store/ / https://shop.pinkfloyd.com/collections/wish-you-were-here-50
- REO official channel and https://www.reospeedwagon.com/album/hi-infidelity/ / https://www.reospeedwagon.com/music/
- Cheap Trick official channel and https://store.cheaptrick.com/ plus band-linked https://cheaptrick.tmstor.es/
- Journey official artist and https://journeymusic.com/pages/store
- Styx official channel and https://styxworld.com/collections/all

# Session 1 — 2026-11-03

- New modules: classic-rock-official-catalog.mjs; classic-rock-official-card.mjs
- Source changes: index.html / oracle-card-deck.js. Original same-node Oracle deck contract preserved.
- Targeted automated checks: five canonical band names; no resale URLs; no hidden audio/video player; link and merch panel selection; carousel placement/registration; no wallet paths.
- New regression: test/classic-rock-official-card.test.mjs; exact head CI remains separate.
- Current status is not live; merge and Android browser acceptance are separate gates.


# Session 2 — owner correction, 2026-11-03 evening (2026-11-04 UTC)

Owner clarified that music selection must be **play/pause on QuantaPhi**, not an external YouTube launch or a large album viewer in each card. Users should keep browsing the same page. This supersedes the original external-launch acceptance text in #1641.

Branch: `fix/artist-music-stays-on-quantaphi-20261103` (based on current main); unclaimed coordinator lease, no conflicting file edits on another branch.

Implemented in this branch:
- One page-level `infinity-artist-music.js` controller, loaded once, with six sourced official tracks: Steve Miller Book of Dreams playlist, Pink Floyd, REO Speedwagon, Cheap Trick, Journey, Styx.
- Steve Miller and five rock artist buttons now call shared Play/Pause. No per-card player, automatic playback, or external navigation from music buttons.
- Player stays outside Oracle stage, so selecting a new card does not destroy or pause it. Infinity Radio and the artist controller pause each other on selection; manual stop/close works.
- Official YouTube requires an **on-screen, minimum 200×200 iframe player**, so the single 220×220 pinned dock is deliberately visible and attributed. A truly invisible, audio-only YouTube player is forbidden by YouTube API policies; this part of the owner's ideal is **not delivered**. No stream extraction, proxying or unlicensed audio copies.
- Site navigation via **full page unload** (e.g. another page or a new tab) is still not continuous; a persistent SPA navigation or native Android audio service would be a separate implementation. Browser autoplay restrictions may require a second tap inside the official player.
- New test `test/infinity-artist-music.test.mjs`; updated Steve Miller and rock-card regressions, cache-busted entry scripts; no wallets, token balances, sign-in gates, ad inventory or merchant sales modified.

State: `implementing`, 🟡, **~65% estimate** for corrected scope (source updates done, no exact-head CI/browser/Cloudflare/Android release verification). Sessions 2; remaining 1–3 acceptance/review sessions, unspecified effort. Independent review should verify player visibility, official-video embeddings, playback after card switching, shared-audio focus, no music button outbound action, browser restrictions and deployed source readback. **Never declare merged, deployed or playing on device without receipts.**

Next action: run focused Node regression suite and exact-head CI on this branch; repair failures, then independent review before any merge and Cloudflare live browser/mobile readback.

## Session 3 — 2026-11-05 · compact artist album/product offers

Owner reiterated requirements: Infinity Radio remains playing inside News Phi; compact artist product/digital full-album offers beside radio; Classic Rock Play/Pause directly on QuantaPhi without outbound YouTube navigation. A separate keyboard/voice-flicker symptom is **documentation-only** with no Android mutation authorized in this session.

- Continued **existing** draft PR [#1655](https://github.com/www-infinity4/QuantaPhi/pull/1655), preserving its shared pinned official player, artist controls and audio-focus contract. No copied audio, no hidden YouTube player.
- Added `radio-artist-offers-data.mjs`: six artist-approved release/catalog destinations for Steve Miller, Pink Floyd, REO, Cheap Trick, Journey, Styx. Strict HTTPS host allowlists and Apple provider artwork/album identity validation; no claim of paid placements or stock.
- Added `radio-artist-offers.mjs` and homepage entry point: narrow rotating two-item product rail adjacent to Infinity Radio with real Apple album covers, voluntary full-album/provider links and official artist merchandise destination. One column on small Android widths. Never creates another audio player or alters wallet, sign-in, or song-selection state. Product cards are omitted if provider identity/art is not verified.
- Test-first source: `test/radio-artist-offers.test.mjs` authored before implementing these two modules; focused Node assertions specify six source links, fake Apple lookalikes rejected, no fabricated media/checkout, and homepage loader. Dedicated read-only `.github/workflows/radio-artist-offers.yml` added to execute Node checks on PR events.
- **Verification:** GitHub file-write commit receipts exist on this branch; dedicated exact-head CI still not confirmed, independent reviewer not recorded, actual iTunes lookup / Android / Cloudflare readback not verified. PR remains open draft and GitHub currently says not mergeable; do not force merge. Source metadata tested in a browser remains outstanding.
- **Related independent work:** News Phi audio continuity draft [#1654](https://github.com/www-infinity4/QuantaPhi/pull/1654) remains open; older album-lookup draft [#1631](https://github.com/www-infinity4/QuantaPhi/pull/1631) and Alien-Radio [#41](https://github.com/www-infinity4/Alien-Radio/pull/41) remain unmerged. The compact source strip should not overwrite those workstreams.

**Status:** 🟡 `implementing`, 65% source-scope estimate, sessions 3, remaining unknown, lease/fence unclaimed. **Next:** verify exact-head CI on #1655, repair conflicts with current main safely, independent review, then separately merge and verify mobile playback and artist offer source links before declaring live.


## 2026-11-06 screenshot-driven reconciliation

- Owner Android screenshot confirms default-branch Steve Miller still shows an empty black video placeholder and external YouTube handoff; the Classic Rock buttons open external media. These violate the later, superseding on-page play/pause requirement.
- Reused draft PR #1655 and existing ticket #1641, no new work issue or coordinator lease. Sourced shared official-player controls from the existing unmerged repair, while preserving main's newer Infinity Radio catalog/audio recovery logic and adding mutual artist↔radio focus.
- The six music buttons do not open YouTube tabs; a single visible 220×220 embedded provider player stays anchored outside the Oracle carousel so switching Quick Cards does not unmount it. YouTube policy still requires a visible player and provider/Android/browser autoplay or embed restrictions can prevent a particular source from playing; a hidden audio-only player is not claimed.
- Preserved all newer main authentication and site changes by producing a merge tree based on the current main, rather than replacing homepage or radio modules wholesale. Corrected an existing test typo (`b.name` instead of `band.name`) and placed the media dock on the left to avoid the existing right-side Bubbles orb.
- Stage state: source prepared; exact-head CI and independently verified Android playback still required. No production deployment, full-album playlist validity, licensing rights, monetization, or wallet credits asserted. Next: inspect workflow status and run device/browser readback after reviewed merge.
