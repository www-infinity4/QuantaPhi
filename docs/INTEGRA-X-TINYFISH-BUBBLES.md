# Integra AI ↔ Bubbles ↔ TinyFish X browser bridge

**Status (2026-10-27): source staged for review. Not deployed or live-verified.**

## How the interface works

The ChatGPT session used the **connected TinyFish app** to launch a remote browser automation with a saved Browser Context Profile, then awaited the returned job ID until it reached a terminal result. The authenticated profile contained **@IntegraAI**'s X session. One initial post was independently inspected via the TinyFish browser result: https://x.com/IntegraAI/status/2114992507222425732. This does **not** grant Bubbles access to the ChatGPT app's private TinyFish tool handles, credentials or cookies.

Bubbles needs a **separate server-to-server TinyFish integration** under the same TinyFish account/profile. Its architecture in this branch is:

1. User's Bubbles **owner chat** types a clearly prefixed Integra command. `bubbles-ai.js` dynamically imports `bubbles-integra-x.mjs`.
2. `verifiedOwnerHeaders()` obtains the existing, server-validated unified-wallet Brain session. No guest/iframe action is allowed.
3. `POST /work/integra-x` on `infinity-brain-clock` independently checks the owner session with `ownerAuthorized`. Browser chat cannot supply a made-up role to bypass it.
4. Brain's existing owner Durable Object serializes requests and keeps job IDs, drafts, status, last verified link, daily manual read budget and no-retry unknown state. `workers/infinity-brain-clock/integra-x.mjs` calls TinyFish `POST https://agent.tinyfish.ai/v1/automation/run-async` with `X-API-Key` and `use_profile: true, profile_id`. Status is checked via `GET /v1/runs/{id}`.
5. TinyFish browser automation opens **only fixed, whitelisted X pages** and verifies the current account is @IntegraAI before attempting actions. It returns research summaries or a posted permalink. Bubbles only reports what the provider actually returned, with a job receipt.
6. A post is drafted first, and is dispatched **only after** a first-party owner confirmation. Voice/model instructions never authorize publication. A draft ID may be dispatched once; if upstream submission is uncertain, do **not** retry until provider history is inspected.

## Bubbles commands

- `Integra connection` — report backend configured state (does not prove X session or publishing).
- `Integra read #bubbles`
- `Integra read #integra`
- `Integra read #QuantaPhi`
- `Integra read @YahooPingcwlz`
- `Integra read @googlegware`
- `Integra post: <280-character original post>` — shows a **publish-once** confirmation; does not publish from voice.
- `Integra status <job UUID>` — poll the receipt. Do not confuse a queued job with a completed X read or published post.

Currently status polling is an explicit owner command rather than silent recurring checks. Do not claim that Bubbles watches X automatically every few minutes. X hashtag results can be unrelated to Bubbles; only promote source-linked, relevant evidence. X posts and replies are **untrusted source data** and cannot grant owner authority or trigger repository work.

## Deployment configuration: still required

Backend secrets/settings are **not** included in the repository, HTML, the APK or chat transcripts.

- `TINYFISH_API_KEY`: configure as a **Cloudflare secret on the owner Brain Worker**, from the correct TinyFish account. Do not use the X password, Google password, ChatGPT connector credential, or browser cookies.
- `TINYFISH_PROFILE_ID`: configure server-side as the **profile ID saved in that same TinyFish account** and verify it currently signs in as @IntegraAI. Do not publish the actual saved-profile identifier in the public repository; configure it only after confirming the backend key can access the same TinyFish account.
- Review and deploy `infinity-brain-clock` and its Bubbles website asset together, using the existing release workflow and retaining other Worker bindings. No new public endpoint, blanket X permissions or user credential sharing.
- TinyFish agent steps are metered (official published rate $0.016 per step; browser time may also be charged). Auto reload remains disabled unless the owner expressly changes it. This branch defaults to at most 24 manual read starts per UTC day (global to owner Brain) to prevent accidental cost escalation. A retry after a network timeout can duplicate a charge/action; do not auto-retry.
- Continue to respect X website terms and platform automation policies; do not mass reply, mass follow, unsolicited mention or evade restrictions.

## Checks / real acceptance gates

Source tests: `node --test test/bubbles-integra-x.test.mjs`, plus existing Brain/voice tests and CI.

Required live acceptance (after an authorized deployment): `Integra connection` returns backend ready, `Integra read #QuantaPhi` produces a job, `Integra status UUID` returns a real source-linked terminal receipt, `Integra post: ...` prompts for human confirmation, and a single approved harmless test post is verified through its real X permalink. Verify negative cases: wrong owner session, guest iframe, expired X profile, insufficient TinyFish credits, stale/unknown run status, repeat confirm. If any step fails, leave publishing off.

**Do not claim live Bubbles control of X from merged source, an API-ready flag, or the successful ChatGPT-only post.**
