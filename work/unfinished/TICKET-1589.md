---
issue: 1589
project: "WHO and Iowa live-radio Quick Card carousel"
state: implementing
dot: "🔴"
progress_percent: 55
progress_basis: "Seven sourced station cards implemented, 3 official MP3 stream URLs and 4 official broadcaster embeds; exact-head CI red pending test harness and ledger fixes; 0 live browser acceptance"
sessions_spent: 1
sessions_remaining_estimate: "1–3 acceptance sessions; uncertain"
agent: "ChatGPT"
lease_id: null
fence: null
lease_expires_at: null
task_session_id: null
repo: www-infinity4/QuantaPhi
branch: feat/iowa-live-radio-station-carousel-1589
last_observed_utc: "2026-11-05T04:08:00Z"
tests: "CI first pass revealed Node window guard and YAML front matter requirement; fixing both on current branch"
merged: false
deployed: false
live_verified: false
blocker: "Exact-head CI, approved embed/playback behavior, independent Android verification"
next_action: "Verify exact-head GitHub Actions after harness and ledger fixes; then review, merge if safe, and check live Android playback"
---

# Ticket #1589 — WHO and Iowa live radio Quick Card carousel

- Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1589
- Source: Owner request on 2026-11-04 for WHO NewsRadio 1040 and several additional one-tap live-radio Quick Cards in a carousel.
- Repository: www-infinity4/QuantaPhi
- Working branch: feat/iowa-live-radio-station-carousel-1589 from main
- Session: 2026-11-05 UTC / radio-carousel-1589 / ChatGPT
- Work state: implementation authored; exact-head CI not yet verified
- Dot: RED / unverified PR, deployment and Android acceptance pending; no work lease claimed
- Progress: ~55% estimated: station sourcing and 7-card UI + tests authored, 0 live playback confirmations and 0 release/Android checks
- Sessions spent: 1
- Sessions remaining estimate: 1–3, not a promise
- Lease: unclaimed, session identity and expiry null; no implied coordinator ownership

## Verified station sources

- WHO official page: https://www.iheart.com/live/1040-who-925/
- WHO schedule: https://whoradio.iheart.com/schedule/
- KXNO: https://www.iheart.com/live/1460-and-1063-kxno-921/
- 100.3 The Bus: https://www.iheart.com/live/1003-the-bus-2744/
- KISS: https://www.iheart.com/live/1075-kiss-fm-2740/
- IPR stream documentation: https://www.iowapublicradio.org/listening-digitally

## Scope

1. Show horizontal mobile station carousel beside existing Infinity Radio.
2. One press plays IPR direct MP3 News, Studio One, Classical using published URLs, with low-bitrate fallback.
3. WHO, KXNO, Bus and Kiss open broadcaster-owned iHeart players inside QuantaPhi. A further play tap may be required by provider/browser; do not claim confirmed single-tap playback for these.
4. Only one station in module runs; switching pauses existing audio and signals prior quick radio.
5. No autoplay or copying/rebroadcasting streams. No fabricated show schedule, impressions, or payment credits.
6. Existing quick-radio and new tests gate before merge.

## Engineering evidence / gate status

- Added iowa-live-radio-cards.js and test/iowa-live-radio-cards.test.mjs.
- Hooked into quick-infinity-radio.js; updated quick-infinity-radio workflow.
- Test command: node --check iowa-live-radio-cards.js && node --test test/quick-infinity-radio.test.mjs test/quick-radio-recovery.test.cjs test/iowa-live-radio-cards.test.mjs
- Automated CI: pending actual GitHub receipt.
- Review, merge, Cloudflare deploy and Android audio verification: pending.
- Blocker: iHeart iframe policy and embedded playback cannot be validated by static inspection.

## Next single executable action

Open scoped PR, inspect exact-head CI results, fix regressions, then review and merge once checks pass. Verify published carousel on Android for official iHeart player behavior and audio exclusivity. Log outcome in #1589.
