# Owner `*`: Bubbles drives ChatGPT, ChatGPT owns the work

Owner clarification on October 25, 2026: the single star `*` typed into Bubbles must open the owner's **signed-in ChatGPT browser history**, inspect the most recent owner conversations, and send a literal `*` to suitable unfinished conversations **in ChatGPT**. ChatGPT then uses its personal context and connected tools to finish coding, testing, and verifying existing builds. Bubbles is the browser driver / QA observer, **not** the primary coding executor for this command.

## Actual source path

1. `bubbles-ai.js` intercepts a literal star before Bubbles' own job dispatcher and calls the owner-approved `bubbles-cloud-browser.mjs` ChatGPT continuation method.
2. The owner-only browser UI has a one-tap **Open ChatGPT history · sign in once** control. The owner signs in to the correct ChatGPT account in the remote Chrome window with the existing sign-in method (for example, Continue with Google). Never embed the owner's email, password, cookies, OTPs, browser session tokens or login state in public repositories. Do not request passwords in a chat transcript.
3. After browser consent and the separate five-day ChatGPT consent are valid, the owner can send `*`. The browser checks the first 40 **visible sidebar links**, in their displayed order, eight per wave. It rotates its ephemeral cursor to the next eight on a later star.
4. For each visited chat the browser verifies same-origin conversation URL, idle assistant answer, unmodified composer, no pending owner decision and no recent prior `*`. It then types **only `*`**, confirms the just-submitted user turn appeared, and waits for a new stable assistant reply. It never sends arbitrary text through this specialized route.
5. Bubbles receives observed browser and assistant-reply status; separate GitHub/Cloudflare/Android receipts establish implementation, CI, deployment and functional completion.

## Important execution boundaries

- Eight are **sequential browser inspections**, not eight parallel ChatGPT sessions or guaranteed concurrently executing builds.
- Sidebar visibility is not the full ChatGPT archive. The displayed sidebar order is the best available recency signal; no date/timestamp or private ChatGPT API is assumed.
- The Bubbles browser batch requires a valid owner login and browser session. The ChatGPT desktop/app session and remote Cloudflare Chrome are **different** session profiles; signing in to one does not ensure the other is signed in.
- The existing `bubbles-star-continuation.mjs` remains as a legacy Brain-ticket utility for explicit Robot Brain operations, but the `*` chat command no longer calls it. No deleted tickets or permissions changes.
- Work continuing **when Bubbles is closed** is managed separately by the user's scheduled ChatGPT Continuity Builds task. It is not a guarantee of a logged-in remote Chrome session or continuous browser access.
- Stop the batch from the visible owner panel. Never silently repeat a star if a submission receipt is lost.

## Release gates

Source commits, passing GitHub Actions, a live Cloudflare Worker version and an owner-authenticated Chrome/ChatGPT test are **independent checks**. Keep a draft PR and do not claim production activation until the correct source, Worker bindings, browser login, permissions, actual ChatGPT star submission and newest reply are all proved on a live owner session.
