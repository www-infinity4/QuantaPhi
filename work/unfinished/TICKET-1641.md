---
issue: 1641
project: "Classic Rock official music buttons with artist-linked releases"
state: source_tested
dot: "🟡"
progress_percent: 70
progress_basis: "5/5 band launch links and merch destinations implemented, zero viewer media elements, targeted source checks passed; CI, deployment and Android acceptance not yet complete"
sessions_spent: 1
sessions_remaining_estimate: "1–2 acceptance sessions; timing unverified"
agent: "ChatGPT"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: feat/classic-rock-official-music-1641-rebased
last_observed_utc: "2026-11-03"
tests: "New regression source and Node test; source contract checks passed locally; full GitHub CI outstanding"
merged: false
deployed: false
live_verified: false
blocker: "Exact-head GitHub CI, review, Cloudflare deployment, Android click/readback"
next_action: "Open #1641 PR, verify exact-head CI and cross-card click behavior, merge only if safe, then independently check live Cloudflare publication"
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
