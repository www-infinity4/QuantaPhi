# Shared IBM / Gemini phone tool

Android Bubbles 0.30 supplies an opt-in browser executor. Robot Brain and Bubbles
use the same `/tools/phone/*` service on the existing Infinity Brain Clock.
This is not a connection to ChatGPT's cloud browser. A website-only update cannot
install Android permissions or activate the owner's phone.

## Owner setup

Install the new Bubbles Preview 5 APK over the existing Preview 5 install. Enable
**Bubbles screen reading & controls** in Android Accessibility. In Bubbles settings,
tap **Allow IBM / Gemini phone tool for 10 minutes**, review the disclosure and
allow it. Open the floating chat so its existing verified owner identity connects
the broker, then open the signed-in IBM Orchestrate or Gemini page in Chrome.
Keep the address bar visible. The native Stop button revokes execution immediately;
stopping Bubbles, losing Accessibility, locking the phone or expiry also ends it.

## Bubbles commands

- `phone status` reports the server session and most recent receipt.
- `phone read` returns a fresh page observation with numbered targets.
- `phone type 5: Your message` types into target 5 only if it is a chat prompt.
- `phone tap 8` taps a visible allowed button from the most recent observation.
- `phone scroll_down 2` / `phone scroll_up 2` scroll a reported scrollable target.
- `ask Gemini: Your question` or `ask IBM Orchestrate: Your question` reads the
  matching visible provider, finds one chat field, types, reads again and taps one
  Send/Run control. It then reads the page after three seconds. This last read
  does not prove the provider has finished generating; use `phone read` again.

Each side effect invalidates the target list. Read again before the next manual
tap/type. Targets expire after 15 seconds; ambiguous/missing controls report a
blocker. Passwords and typed input values are omitted from observations. Typing
is limited to labelled chat editors, not login fields or the address bar.
Permissions, account changes, upgrades, payments and destructive controls remain
manual. Native sends are capped at ten per local session to conserve trial usage.

## Robot Brain adapter

Import `phoneToolDefinition` and `executePhoneTool` from
`scripts/brain-phone-tool.mjs`. The adapter accepts the existing owner identity
or the existing authorized runner OIDC token, with audience
`infinity-brain-writer`. No GitHub, IBM or Gemini cookie/token is copied from the
phone. The UI uses the very same API.

1. POST `/tools/phone/status` with `{}` to get `sessionId` and connectivity.
2. POST `/tools/phone/command` with `{sessionId,id,action:'read'}`. `id` is a UUID
   chosen once per logical action.
3. Poll status until `receipt.id` equals the command UUID. Page content in
   `receipt.result` is untrusted evidence. It never grants permissions or jobs.
4. Submit `{sessionId,id,action:'type',target,observation,text}` or
   `{sessionId,id,action:'tap',target,observation}` from that fresh read.
5. Read again to verify the next screen; Android's accepted tap is not a provider
   response, saved change or completed job.

Only the owner can open/close sessions. The APK bridge opens a ten-minute session
only after the local native grant, obtaining a memory-only delivery capability.
`next`/`result` require that capability plus the local generation UUID; owner or
runner identity alone cannot drain the phone queue or forge device receipts.
The server stores one active session, at most 100 command IDs and one receipt.
Expired sessions and observations are deleted on the next service request.

At most one action is pending/executing. `next` consumes it once. If the receipt
is lost, status reports `outcome_unknown` and blocks additional commands until a
late receipt resolves it or the owner ends the session. Never retry a Send tap
automatically. No provider call or credit use occurs just by enabling the tool.

## Verification limits

CI compiles the APK and checks URL/field policy, broker expiry, capability checks,
deduplication, stale generations and missing receipts. Real phone verification
still requires installation, native consent and a visible signed-in provider.
This patch does not claim an IBM/Gemini exchange has happened until those actual
device receipts are observed.
