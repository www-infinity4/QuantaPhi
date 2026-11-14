---
issue: 1284
project: "X / Twitter Infinity Spaces Quick Card"
state: implementing
dot: "🟡"
progress_percent: 35
progress_basis: "Dedicated X Spaces Quick Card with local topic/host search, source-validated URLs, wallet-authorized Media Star reads, and static tests; 0 verified X-native audio embeds, no live Spaces API or OAuth."
sessions_spent: 1
sessions_remaining_estimate: "unknown; live audio blocked by X provider capabilities"
agent: "ChatGPT"
lease_id: null
fence: null
lease_expires_at: null
task_session_id: null
repo: www-infinity4/QuantaPhi
branch: feat/stream-radio-x-spaces-20261104
last_observed_utc: "2026-11-05"
tests: "Static regression tests authored, pending GitHub CI and browser verification"
merged: false
deployed: false
live_verified: false
blocker: "X live Spaces APIs require plan+permission and existing X developer status does not prove usable API credentials; no verified general live Space audio iframe."
next_action: "Inspect exact-head CI, verify new Spaces card appears on live QuantaPhi, test wallet-index and canonical X link controls without implying live audio playback."
---

# Issue #1284 — X Spaces Quick Card

Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1284

This scoped work continues the user's requested Twitter/X Spaces card. Account X developer app ID 33593296 appears in issue #1284, but no authenticated X API key, OAuth user grant, paid search access, or native live Spaces embed has been verified. Existing X Developer Connect policy issue #1282 and the Media Star Spaces library remain separate: do not leak credentials, generate costs, sign in on a visitor's behalf, create fake live room counts, or auto-post.

## Source evidence

- X official Spaces help: https://help.x.com/en/using-x/spaces
- X official embed posts: https://help.x.com/en/using-x/how-to-embed-a-post
- X official record/share page: https://business.x.com/en/products/twitter-spaces/recorded-spaces
- X search endpoint access: https://developer.x.com/apitools/api?endpoint=%2F2%2Fspaces%2Fsearch&method=get
- Existing first-party index: quanta-feed-spaces.mjs, wallet-authorized Media Star Worker, not unauthenticated public live Spaces.
- Previous following-spaces-radio.js attempted direct x.com iframe; this is NOT independently proven to render the audio player and must not be labeled verified.

## Session changes

- Added x-spaces-quick-card.mjs with validated original Space links and topic/host filtering.
- New card is mounted next to Fred/Magoo/Media Star following Spaces, not buried inside an existing picker.
- User can load real index entries only after the existing wallet authorizes them, or paste a canonical Space URL for a session-only collection.
- Live-claim/recording status and listener counts are not invented. User-initiated official X player link is the only confirmed path until X supports a documented embed.
- No X API calls from frontend, authentication changes, wallet mutations, StarCoin debit, copied X audio or background loops.
- Test: node --test test/live-radio-x-spaces-quick-card.test.mjs

## Acceptance still missing

- Verify runtime card on Android and wallet-bound index, login/no-login/error branches.
- Verify that actual official X Space embed/audio can legally play within QuantaPhi; failing this, honest official-player link remains.
- Independent implementation of full user-authorized X OAuth/post/feed in #1284; only this Spaces slice is built here.
- Separate exact-head CI, review, merge, deploy, independent readback and issue update.
