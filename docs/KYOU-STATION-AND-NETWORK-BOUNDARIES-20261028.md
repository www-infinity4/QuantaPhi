# KYOU station card and Infinity network build boundaries

Owner request: use the local FOX affiliate KYOU, retain publisher attribution and advertising, and give the station meaningful referral traffic. Checked October 28, 2026.

## Station and playback evidence

- [KYOU About Us](https://www.kyoutv.com/about-us/) identifies KYOU as licensed to **Ottumwa, Iowa**, serving southeastern Iowa and northeastern Missouri. [Its channel guide](https://www.kyoutv.com/page/channel-guide/) identifies FOX **15.1**.
- [The official live page](https://www.kyoutv.com/livestream/) currently lists KCRG TV9 News, weather, live events, InvestigateTV and Local News Live. Its own description identifies newscasts and local/national news coverage. It is not evidence of a cleared online FOX network or World Series feed.
- Browser inspection initially found a Play control; after initialization the station's own HTML video was playing muted (`paused=false`, `readyState=4`). This verifies playback on the original station page, not a World Series feed or playback inside QuantaPhi.
- A HEAD response for the official live page was HTTP 200 with no `X-Frame-Options` or `Content-Security-Policy` header. This supports testing an intact original-page frame; it is not a statement of syndication rights or guaranteed iframe playback. No standalone publisher-provided external player was verified. Loading a page, a frame, a playlist or a thumbnail does not prove game playback.
- Preserve the station's player, controls, ads and attribution if a supported external player becomes available. Do not extract its stream, reuse viewer credentials, replace its ad requests or label a news feed as a baseball game.
- [Gray's station terms](https://www.kyoutv.com/terms-of-service/), section 3, describe personal/noncommercial uses and the written-permission condition for commercial content uses. Traffic attribution is not itself a syndication agreement. [Copyright Office background on Internet retransmissions](https://www.copyright.gov/docs/regstat61500.html) explains the distinct permission question for broadcast programming; obtain current advice for a distribution contract.

## October 31, 2026 player-screen correction

The former automatic full-page KYOU livestream iframe was shown as a gray/broken mobile panel with an oversized external Stop button. It was removed from the **Infinity TV KYOU channel**. That card now has a 16:9 branded source screen, an integrated centered Play action, and no separate stop/refresh/website buttons. The action opens the publisher's official livestream in a new tab; it does **not** claim to play KYOU video within QuantaPhi. The publisher's published logo remains referenced as before, subject to source permissions. Other TV channels continue to use their existing direct video players. Wallet, Cloudflare, payments and tokens are untouched.

A KYOU-owned standalone embed has not been verified or licensed. Do not extract stream URLs, crop website chrome or ads, or use a source-specific player without the publisher's approval. The historical October 28 implementation notes below describe the earlier full-page-frame behavior and are not the current KYOU channel implementation. Separate station/score cards must be reviewed independently.

## Implemented source behavior

The existing Infinity TV wall now starts with a full-width KYOU channel **above StarQuest**, followed by Omni TV, Chiller and ShopLC. Selecting the TV wall automatically opens KYOU's intact live page without an initial Play tap. The same live viewer is available at `/infinity-tv/kyou.html`. Switching channels stops the preceding iframe/video; Stop prevents an automatic restart. Other live-card requests also stop the TV-wall player, so both views cannot keep streaming simultaneously. During a freshly confirmed live MLB game the carousel pins this TV wall first, with KYOU above StarQuest, while the separate station/score card remains directly available.

The current game card uses KYOU's published logo, station name and location. When selected and visible, it requests KYOU's intact original live page in an iframe and delegates autoplay permission. The station continues to control its player, ads, navigation, consent and program selection. There is no stream extraction, ad cropping, credential proxy or replay substitution. The frame unloads on card departure, backgrounding and exit. A direct station link remains available when the frame cannot play.

Live-game priority remains tied to fresh MLB status, not to an assumption that the station's online video carries the game. KYOU's own home, live-newscast, schedule and channel-guide pages receive outbound referrals with `utm_source=quantaphi`, `utm_medium=referral`, and `utm_campaign=kyou_station_card`. An origin-only HTTP referrer is retained where the viewer's browser permits it.

The site's existing analytics configuration can receive `partner_card_open`, `partner_site_frame_request` and `partner_referral_click`; none is a video view, unique viewer, advertiser impression, money earned or a station-confirmed total. No new analytics identity, station credential, private user identifier or server is introduced. The station decides whether and how to read referral tags in its own analytics. Its audience/ad reports require an actual sharing agreement or authorized reporting integration.

The separate LiveNOW from FOX card is a news-player request, not KYOU's full broadcast signal. No syndication, partnership, copyright license, worldwide game clearance or real-publisher playback receipt is claimed.

## What the existing software does and what remains to build

| Layer | Existing evidence | Concrete next deliverable |
| --- | --- | --- |
| Card/application platform | QuantaPhi HTML/JS carousel, card routing, shared actions, browser/provider handoffs, Cloudflare services | Provider-owned live-player registry with source, territory, schedule, player contract and real playback acceptance for every channel |
| Publisher distribution and measurement | Official-site referrals and ordinary card-open/click events | Authorized embed or distribution agreement, publisher-owned ad delivery, and verifiable aggregate referral/playback reports |
| Owned streaming channel | Existing movie/TV players do not by themselves establish ownership of all programs or a continuous independent broadcast | A schedule made from owned/licensed programs, an encoder, HLS packaging, origin/CDN delivery, accessible controls and measured playback |
| Internet access network | Using a browser, hosting or proxy is application traffic over existing networks | Routers, an actual upstream/backhaul agreement, a defined service area, access links and measured throughput/availability |
| Satellite broadband | No inspected source establishes an Infinity-owned satellite network, spacecraft, gateways, terminals or spectrum authorization | Separate engineering/business program for spacecraft and launch, spectrum/coordination, ground gateways, terminals and network operations |

[Microsoft describes PowerShell](https://learn.microsoft.com/en-us/powershell/scripting/overview) as a shell, scripting language and task-automation/configuration framework. The Quick Card switchboard is an application-routing design. A claim that one is larger needs defined users, capacity, latency, availability and operating scope; source files alone do not establish that comparison.

[ITU's non-geostationary satellite overview](https://www.itu.int/en/mediacentre/backgrounders/Pages/Non-geostationary-satellite-systems.aspx) explains spectrum access and coordination alongside satellite/terrestrial integration. [ITU's filing guidance](https://www.itu.int/en/ITU-R/space/support/nonGSO/Pages/default.aspx) documents the separate satellite-network filing work. Software cards can control a real network after authenticated equipment/service adapters exist; displaying a card does not create that infrastructure.

## Release and acceptance

PR #1216 must retain exact-head CI and independent review. Browser tests use provider fixtures for deterministic UI checks and are not evidence of real KYOU or FOX game playback. The KYOU source update does not remove the APK security hold or claim a production release. The remaining game-specific dependency is a supported, authorized player that actually carries the game for the intended viewers.
