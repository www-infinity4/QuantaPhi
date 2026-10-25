# Bubbles ↔ ChatGPT Continuity Router (owner-scoped, October 25, 2026)

## Purpose
Bubbles is the **driver**. It opens signed-in ChatGPT conversations in the owner's approved Cloud Chrome session, determines whether a continuation is appropriate, sends a bounded `*` only when there is explicit unfinished work, and reads the **new** assistant reply. No owner has to tap a star in each conversation.

## One-run algorithm

Start by opening **ChatGPT history · sign in once** in Bubbles' real Cloud Chrome. The owner uses the same ChatGPT sign-in method as the original account, including the Google account chooser when applicable; the remote Chrome profile may not share the phone browser cookies. Account credentials and MFA are entered privately in the provider browser, never sent through a conversation. A visible session and an owner-approved five-day grant are both required.
1. Require an existing Robot Brain owner session, active five-day ChatGPT/Cloud Browser approval, and the owner's own signed-in `chatgpt.com` Chrome tab. Never infer authorization from a chat message.
2. Inspect up to 40 **visible** ChatGPT sidebar conversation links and process up to eight at a time, in displayed order. Advance to the next eight on the next `*`. Do not claim to enumerate the entire account/archive, assert precise timestamps or invoke a private ChatGPT API.
3. Visit a conversation, verify exact same-origin conversation URL, nonempty message history, editable composer, no unsent draft, no active generation.
4. Only send `*` when the last completed assistant message explicitly indicates pending/blocked/unverified work **without requesting credentials, approval, files, or details**. Never overwrite a draft, nudge a user request still awaiting its first answer, or repeatedly nudge a recent `*`.
5. Verify the just-submitted `*` appears as the newest user turn in the correct conversation. A click or keystroke alone is not success.
6. Wait for a **new** completed assistant message (message count increased by at least two from pre-send, correct conversation, stable reply across observations).
7. Classify the reply as needing owner details, awaiting external evidence, or assistant answered but work unverified. Do not infer GitHub or Cloudflare effects from GPT prose.

## Status language
- **Blocked:** owner approval, authentication, page context, or browser action unavailable.
- **Waiting:** the reply is still generating, there is an unsent draft, a recent `*`, or no explicit unfinished signal.
- **Needs details:** the conversation requires a real owner choice, document, approval, or sign-in.
- **Submitted:** new owner-visible `*` was actually observed.
- **Reply observed:** a new stable assistant turn was observed after that submission.
- **Awaiting evidence:** the reply is still pending or unverified.
- **Assistant answered, work unverified:** no outside evidence of a commit, CI pass, deployment, or APK result.
- **Complete:** **not available from the ChatGPT bridge alone**. The corresponding GitHub/Cloudflare/Android executor must independently prove completion.

## Scope and security
The batch is explicitly owner-started (the Bubbles chat `*`, a button or voice command) and has a stop action. Eight conversations are processed sequentially, never eight independently authenticated ChatGPT sessions. It is not a perpetual background process, not full historical chat import, and not an unrestricted clicker. It does not store private ChatGPT messages, URLs, cookies, credentials, or live-view tokens in persistent browser storage. Dedupe is currently per owner-page session plus the last few ChatGPT message turns. Cross-device durable dedupe and wider archival discovery require a separate authorized, scoped checkpoint store.

## Acceptance before production
- Green Node regression tests for DOM guards, continuity policy, spoken launch, background polling, browser consent, and Cloudflare bridge.
- A real signed-in owner Cloud Chrome smoke test: reads multiple actual conversations, skips drafts, detects an owner-details prompt, submits at most one `*` in an eligible chat, verifies a new response, repeats without duplicated nudges, and stops promptly.
- A corresponding GitHub/Cloudflare execution proof **if the resumed conversation says work finished**; do not call a conversation completed from a text reply.
- Verify production worker deployment and page asset version against the PR SHA; check Android separately.
- Keep PR draft until these live gates pass.
