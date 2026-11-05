---
issue: 1411
project: "Infinity Radio continuous News Phi navigation; Android Media3 remains separate"
source_requests:
  - "2026-11-03 owner: Music shouldn't stop opening News Phi link"
  - "https://github.com/www-infinity4/QuantaPhi/issues/1411"
state: source_tested
dot: "🟡"
progress_percent: 30
progress_basis: "5 focused local mock tests passed for web reader / navigation; production iframe, real browser, Android Media3 and release not verified"
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "ChatGPT bounded web-navigation repair"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
last_observed_at_utc: "2026-11-04T02:58:09.389Z"
repo: www-infinity4/QuantaPhi
branch: fix/integrate-news-radio-artist-offers-20261105
head_sha: null
pr: null
tests:
  - "Node 22 local isolated source: node --test test/news-phi-continuous-audio.test.mjs — 5/5 PASS (mock DOM)"
  - "node --check news-phi-continuous-audio.js — PASS"
ci:
  - "Dedicated workflow committed; latest exact-head run not yet verified"
merged: false
deployed: false
live_verified: false
blocker: "Exact-head CI, independent code review, real Chromium/Android News Phi iframe and media-focus checks, and Cloudflare release not verified"
next_action: "Run exact-head Node CI and an Android browser test: Play Infinity Radio, open both News Phi links, verify uninterrupted sound and Play/Pause/Next, then review release"
---

# Infinity Radio / News Phi continuity · web stopgap under issue 1411

## Scope
- QuantaPhi homepage quick radio owns one audio element. Following either newsroom link or legacy News Phi GitHub Pages link previously navigated away from the document and destroyed the player.
- A lightweight first-party dialog/iframe reader is created only upon a News Phi click; the homepage remains alive, and its original radio is neither remounted nor paused.
- Reader header exposes Play/Pause and Next controls routed to the existing radio buttons, not a competing media element. Escape and Close leave the original radio alive; the news iframe is released on close.
- Modified clicks, downloads, non-News-Phi routes, and browsers lacking native dialog support preserve normal navigation; original news URLs remain available through a clearly labeled separate-window link.
- For the legacy GitHub Pages site, a third-party frame restriction may prevent embedding: verify real iframe acceptance and use the separate-window fallback if needed. No third-party media right is inferred.

## Evidence and acceptance
- Local RED before implementation: five regression tests failed because the new reader and wiring did not exist.
- Local GREEN after implementation: five focused Node tests passed; JS syntax check passed. Committed test, reader module and homepage loader plus dedicated read-only CI workflow on branch fix/news-phi-radio-continuity-20261103.
- This source-level fix does **not** provide Android system Media3 foreground playback. Browser app kills, audio-focus changes, and network failures can still stop music. Preserve issue 1411 native-service acceptance separately.
- No wallet, tokens, login, credentials, media licenses, or autoplay settings changed. Do not mark 100% until review, merge, Cloudflare release and actual playback observed on the owner's Android.

## Next executable action
Run exact-head CI and independently review the reader, then test on Chrome Android while real Infinity Radio audio plays through News Phi, pause, next, close and return. Record deployment and browser receipts separately.

## Nov 5 clean integration checkpoint

Prior PR #1654 was `mergeable_state=dirty`. Same-page News reader and its test were ported to `fix/integrate-news-radio-artist-offers-20261105` from latest inspected main `d5a1510d0dd338f97638f838f8c45e9adb608609`. Main radio's newer retry logic preserved. This is source integration, not proof of production or Android continuity; native Media3 issue remains open. New exact-head CI, independent approval and device playback proof required.
