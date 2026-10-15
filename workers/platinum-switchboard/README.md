# Infinity Platinum Phone · Infinity Switchboard

Internet voice/video preview using web-address identities, not conventional phone
numbers. Public entry point is `https://quantaphi.org/phone/`, and each consenting
subscriber claims a URL such as `/phone/mary`. The site serves the same phone
page for a subscriber's URL; the separate `infinity-switchboard` Cloudflare
Worker handles ownership, presence, and WebRTC offer/answer signaling.

## Implemented

- A participant claims an available slug by generating a locally held 256-bit
  owner secret. Its SHA-256 hash is stored in a **per-address SQLite Durable Object**.
  A stranger cannot change that line using another key.
- A second registered owner can look up the address and request a call. The
  caller must prove possession of their own registered secret before ringing.
  Private ephemeral call ticket gates polling and ICE-complete SDP offers.
- Receiver voluntarily answers. Both sides request browser microphone/camera
  permission. Media is carried via browser WebRTC, not saved on the switchboard.
  Public Cloudflare STUN is configured; TURN relay is **not** configured. Some
  restrictive networks will fail until a time-limited TURN credential service is
  added.
- Owner devices keep a page-open online heartbeat. No push notifications,
  background call service, voicemail, SMS, or transport outside existing Wi-Fi/
  mobile data. Reinstall/recovery requires explicit imported private key backup.
- Browser-entered text and private *forwarding plans* save to localStorage.
  Neither phone number forwarding nor legacy number verification is operational.
- The Android Infinity Platinum preview allows website microphone/camera access
  **only** on visible first-party `/phone/` pages after Android permission prompts.

## Not yet implemented

- Regular PSTN telephone calls or SMS, conventional numbers, SIM/eSIM, mobile
  data service, carrier number porting, routing of someone else's telephone
  number, lawful number ownership checks, emergency calling, E911, disability
  access requirements for a full telecom product, number portability rules.
- TURN/SFU relay, end-to-end quality monitoring, abuse management beyond
  elementary destination throttling, anti-squatting verified account ownership,
  backend user account recovery or cross-device history synchronization.
- Reliable background incoming calls on Android or physical-device tests.

**Important:** A user-entered conventional phone number is an unverified,
PRIVATE device-local forwarding plan. Never publish it as a directory entry and
never imply that it is owned or connected. Public directory listings are opt-in
web addresses only. Calls work between two online registered Platinum pages.

## Cloudflare deploy

`workers/platinum-switchboard/wrangler.json` provisions a SQLite Durable Object
class `PlatinumLine` and binds `PLATINUM_LINES`. It is intentionally separate
from the wallet, Code Phi, QuantaPhi site and Robot Brain workers; do not
overwrite their scripts or bindings to deploy it. The web frontend calls
`https://infinity-switchboard.marvaseater.workers.dev`.

`workers/quantaphi-site/worker.js` routes `/phone/` and `/phone/<alias>`
to `/phone/index.html`. The web phone needs the edge route published in order
to serve user-specific addresses.

Run `node --test test/platinum-phone.test.cjs` with Node 20+.
