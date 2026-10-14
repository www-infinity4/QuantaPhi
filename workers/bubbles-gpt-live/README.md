# Bubbles GPT-Live 1 — official model integration

This is a **different route** from Bubbles' ChatGPT OAuth/Responses-text connection.
It uses the official `gpt-live-1` voice model, not system TTS or a third-party voice clone.

## What is actually built
- Owner-only Cloudflare Worker broker `workers/bubbles-gpt-live/index.js`, using
  `POST https://api.openai.com/v1/live/sessions` with the OpenAI project key
  **only on the Worker**, never inside APK/HTML.
- `/bubbles-gpt-live.html` WebRTC frontend for natural two-way audio.
- Explicit start/stop; microphone only after user gesture and permission.
- API errors are displayed; no fallback that falsely claims to be GPT-Live.
- Fails closed when keys are absent; it does not cost money until configured
  and someone starts an authorized session.

## Setup required (no keys are included in the repository)
1. Deploy Worker as `bubbles-live` in the correct Cloudflare account, default
   workers.dev URL `https://bubbles-live.marvaseater.workers.dev`.
2. Provision **Worker secrets**, not plaintext variables:
   `OPENAI_API_KEY` and `BUBBLES_LIVE_OWNER_TOKEN`. Choose a cryptographically
   random 32+ character owner token, unrelated to wallet/ChatGPT credentials.
3. Restrict access to the owner additionally with Cloudflare Access/WAF and
   OpenAI project usage limits before public rollout. The token is an interim
   owner-only gate; it is **not** a scalable per-user authentication system.
4. Publish the QuantaPhi static HTML/JS. Open from Android Chrome under
   HTTPS, enter owner gate token (never an API key), and tap Start.
5. Monitor model session receipts and provider billing. Do not launch
   open public access or claim any funds/token credits without separate ledgers.
6. Before embedding in a native Android overlay, add tested WebView microphone
   permission handling and prevent dual microphone capture with Bubbles Vosk.

## Voice fidelity
The API uses the same documented `gpt-live-1` **model family** powering
ChatGPT Live on eligible plans. Its preset `marin` voice is one official
speaker voice. The selected speaker in a user's ChatGPT application may
sound different. Matching a specific ChatGPT-selected voice is not
guaranteed until verified by listening and testing.

## Costs
As of 2026-10-14 the official `gpt-live-1` rate is $0.05/session-minute,
billed by second, with separate charges for backend reasoning and tools.
ChatGPT Plus/Pro subscription sign-in does **not** pay for this voice API.
OpenAI's official Live WebRTC documentation covers session creation.
https://developers.openai.com/api/docs/guides/voice-webrtc
https://developers.openai.com/api/docs/models/gpt-live-1

## Remaining limitations
- Not yet authenticated to an actual OpenAI voice project: no secret key
  was provisioned and no paid Live session was invoked.
- Brain/tool delegation needs a separately permissioned and receipted server
  adapter. Current session is voice-only, with no authority to create jobs.
- This first browser client is intended for owner testing, not an always-on
  Android overlay, and does not yet track paid multiuser entitlement.
