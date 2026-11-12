---
issue: 1284
project: "X / Twitter Infinity Spaces Quick Card"
state: implementing
dot: "🟡"
progress_percent: 38
progress_basis: "Dedicated X Spaces Quick Card with local topic/host search, source-validated URLs, wallet-authorized Media Star reads, and static tests; 0 verified X-native audio embeds, no live Spaces API or OAuth."
sessions_spent: 2
sessions_remaining_estimate: "unknown; live audio blocked by X provider capabilities"
agent: "ChatGPT"
lease_id: null
fence: null
lease_expires_at: null
task_session_id: null
repo: www-infinity4/QuantaPhi
branch: feat/x-spaces-post-lifecycle-1284-20261107
last_observed_utc: "2026-11-07"
tests: "Four local Node lifecycle tests passed from matching source; new GitHub exact-head CI and browser verification pending"
merged: false
deployed: false
live_verified: false
blocker: "Owner X post ID does not reveal direct Space ID; no verified free X lifecycle/replay metadata adapter or server-side Media Star import exists. Live audio iframe unsupported."
next_action: "Run exact-head CI for source branch; verify original X post link and 360px UI; independently implement trusted post-to-Space ID + confirmed-ended replay handoff without paid trial or wallet mutation."
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

## November 7, 2026 · Owner-shared Fred post and verified lifecycle contract

- **Canonical user source:** https://x.com/dotkrueger/status/2119202415702605899 (X post, not independently verified as live Space or tied to a specific Space ID).
- **Continuity:** same #1284 issue, source branch `feat/x-spaces-post-lifecycle-1284-20261107`; existing Fred Media Star and payment PR #1820 left untouched. No coordinator lease or model execution claimed.
- **New source:** `x-spaces-lifecycle.mjs` separates unverified, provider-confirmed live, and provider-confirmed ended; only exact matched post + fresh provenance are eligible. Confirmation of replay availability yields an **unpublished Media Star candidate**, never an automatic paid episode or credit.
- **Visible card source patch:** `x-spaces-quick-card.mjs` now offers an original Fred X post link and owner-initiated official X post widget inside the existing Spaces card. Does not label post live/ended or claim unsupported X audio embed.
- **TDD:** four dedicated Node lifecycle tests passed locally after initial missing-module test failure. Existing source regressions updated; CI workflow includes new Node tests. Exact-head GitHub CI and actual Android/browser verification remain unverified.
- **Not yet built:** authenticated, permitted X post→Space ID resolution, reliable ended-state source, server-side import to Fred's original Media Star episode library, live promotion expiry, D1 persistence and provider playback proof. A search returning no live results or a blocked X link must **not** be treated as verified end or deletion.
- **Cost boundary:** no trial, purchased research feed, auto-recharge, wallet debit, royalty or paid X API activation. Original Fred payment/receipt work in #1820 is independent.
- **Next:** exact-head CI, independent review, metadata provider permissions and a narrow backend import route; test live→ended→archive on genuine provider receipts before deployment.
