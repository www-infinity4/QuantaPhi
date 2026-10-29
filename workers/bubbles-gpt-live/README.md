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
2. Provision the **Worker secret** `OPENAI_API_KEY` from an authorized
   paid OpenAI API project. This is never a ChatGPT Plus account credential.
   Bind the `BRAIN` service to the existing `infinity-brain-clock` Worker.
   The verified StarQuest Unified Wallet grants only the short-lived Brain
   `rb_` owner session; the Live Worker verifies it server-side through Brain.
   The optional legacy `BUBBLES_LIVE_OWNER_TOKEN` Worker secret can remain as
   a separate recovery gate. Never expose wallet `sq_` credentials, API keys
   or session bearers to a third-party site.
3. Restrict access to the owner additionally with Cloudflare Access/WAF and
   OpenAI project usage limits before public rollout. The token is an interim
   owner-only gate; it is **not** a scalable per-user authentication system.
4. Publish the QuantaPhi static HTML/JS. Open from Android Chrome under
   HTTPS, enter owner gate token (never an API key), and tap Start.
5. Monitor model session receipts and provider billing. Do not launch
   open public access or claim any funds/token credits without separate ledgers.
6. Preview v0.36 adds native WebView microphone permission handling for the exact
   first-party Live page. It requires a visible page, existing Android microphone
   permission and a native confirmation, and refuses while an audio/screen-audio
   recording is active. Vosk and native TTS pause before granting audio capture.
   Closing/collapsing the live view stops local media; returning to chat does not
   automatically restart listening. This source/build contract is not a real
   phone-call or provider-session verification.

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
https://developers.openai.com/api/docs/guides/live-delegation
https://developers.openai.com/api/docs/models/gpt-live-1

## Remaining limitations
- Not yet authenticated to an actual OpenAI voice project: no secret key
  was provisioned and no paid Live session was invoked.
- Client delegation now supports read-only Brain status through the existing
  first-party wallet/owner helper. Timestamped transcript deltas supply context;
  delegation metadata is not treated as a command. Only bounded counts with
  receipt checks reach the voice provider. The Check Brain status button works
  without starting paid audio. Other tools and job creation remain in Chat.
- Session reset cancels pending status requests and suppresses late results.
  Repeated delegation IDs are deduplicated within a session.
- This first browser client is intended for owner testing, not an always-on
  Android overlay, and does not yet track paid multiuser entitlement.


## October 27 owner wallet bridge (draft)

The source now accepts a short-lived owner bearer issued by the existing
StarQuest→Brain wallet verification process, **only** if the `BRAIN` service
binding exists and confirms the bearer on its owner-gated `/health` route.
The Live page obtains owner headers from the existing first-party
`QuantaBrainOwner.ready` bridge; it cannot turn a raw `sq_` device token into
a provider credential or skip the separate `OPENAI_API_KEY` requirement.
The preexisting private owner token remains a backup. There is still no public
Live service claim: as checked via the connected Cloudflare account on
October 27, the running `bubbles-live` Worker had **zero bindings**. Do not
merge/deploy this draft or enable paid audio until project access, owner-scoped
binding, budget guard, WebRTC microphone and interruption behavior are proven.
