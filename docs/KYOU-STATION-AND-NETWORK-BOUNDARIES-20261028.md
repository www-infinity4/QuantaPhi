# KYOU station card and Infinity network build boundaries

Owner request: use the local FOX affiliate KYOU, retain publisher attribution and advertising, and give the station meaningful referral traffic. Checked October 28, 2026.

## Station and playback evidence

- [KYOU About Us](https://www.kyoutv.com/about-us/) identifies KYOU as licensed to **Ottumwa, Iowa**, serving southeastern Iowa and northeastern Missouri. [Its channel guide](https://www.kyoutv.com/page/channel-guide/) identifies FOX **15.1**.
- [The official live page](https://www.kyoutv.com/livestream/) currently lists KCRG TV9 News, weather, live events, InvestigateTV and Local News Live. Its own description identifies newscasts and local/national news coverage. It is not evidence of a cleared online FOX network or World Series feed.
- Browser inspection found the station's own player and a Play control. No publisher-provided external embed option was verified. Loading a page, a frame, a playlist or a thumbnail does not prove game playback.
- Preserve the station's player, controls, ads and attribution if a supported external player becomes available. Do not extract its stream, reuse viewer credentials, replace its ad requests or label a news feed as a baseball game.
- [Gray's station terms](https://www.kyoutv.com/terms-of-service/), section 3, describe personal/noncommercial uses and the written-permission condition for commercial content uses. Traffic attribution is not itself a syndication agreement. [Copyright Office background on Internet retransmissions](https://www.copyright.gov/docs/regstat61500.html) explains the distinct permission question for broadcast programming; obtain current advice for a distribution contract.

## Implemented source behavior

The current game card uses KYOU's published logo, station name and location. Its live-game priority remains tied to fresh MLB status, not to an assumption that video is available. KYOU's own home, live-newscast, schedule and channel-guide pages receive outbound referrals with `utm_source=quantaphi`, `utm_medium=referral`, and `utm_campaign=kyou_station_card`. An origin-only HTTP referrer is retained where the viewer's browser permits it.

The site's existing analytics configuration can receive `partner_card_open` and `partner_referral_click`; neither is a video view, unique viewer, advertiser impression, money earned or a station-confirmed total. No new analytics identity, station credential, private user identifier or server is introduced. The station decides whether and how to read referral tags in its own analytics. Its audience/ad reports require an actual sharing agreement or authorized reporting integration.

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
