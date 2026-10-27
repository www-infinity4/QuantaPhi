# QuantaPhi Provider Browser Quick Cards (owner pilot)

Date: 2026-10-27
Status: **code branch / draft PR only. Not merged, deployed or verified as a live Bubbles Gemini answer route.**

## What was built

The existing QuantaPhi source-card carousel was extended, not replaced.

- The source deck already included Google Gemini, Claude and GitHub Copilot. We added Microsoft Copilot, IBM watsonx and Levi's, and connected the existing StarMaker card to a common **open official provider** action.
- The common `provider-quick-cards.mjs` action gives the visitor the actual provider HTTPS destination. No iframe-copy of protected login, fake Google login form, password proxy, shared X/Google cookies or inferred access.
- `gemini-owner-browser-card.mjs` adds a private owner-authenticated *experimental* browser task to the Gemini card. It is **not the Gemini developer API** and is not automatically available to visitors.
- `workers/infinity-brain-clock/provider-browser.mjs` is a typed, fixed-provider server handler behind owner authorization at `POST /work/provider-browser`. Only Gemini browser prompts are enabled in the pilot. All other provider browser automation fails closed pending independent login, provider authorization, and acceptance tests.
- Handler accepts `{action:'capabilities'}`, `{action:'ask',provider:'gemini',question:'...'}`, or `{action:'status',id:'UUID'}`. No free-form URLs or executable scripts. It uses `TINYFISH_API_KEY` (server secret), matching `TINYFISH_PROFILE_ID` (server variable), creates a browser run, and retrieves real provider run receipts. It limits prompts to 1,000 characters and 12 owner attempts per UTC day to bound metered usage.
- A completed TinyFish *browser job* **is not the same as a verified Gemini answer**. Result is labeled as provider/browser output with no false API or conversation parity claim.

## First empirical Gemini acceptance — FAILED to send a prompt

The saved TinyFish browser opened `https://gemini.google.com/app` authenticated on 2026-10-27. The browser showed the owner's account and the real Gemini input composer. However, **19 browser steps could not enter the text in Gemini's rich-text composer**, the Send control never appeared, and no Gemini answer was retrieved. This establishes **signed-in page access only**, not a working third-party chat API.

The next targeted engineering task is a controlled browser UI input acceptance test (contenteditable shadow DOM/input events) and proof of an actual response, not scraping past chats. If direct live provider UI scripting is too fragile, retain the official Gemini handoff or implement an explicitly authorized provider API within its own terms and charges.

## Per-user sessions are not the owner's session

The TinyFish account profile used in the ChatGPT pilot belongs to the owner. Browser sign-in in one session cannot be shared with public QuantaPhi users. Before any public synced-history experience:

1. **User signs in on the original provider's domain**, with correct domain displayed, and no QuantaPhi or fake Google password form.
2. A **provider-approved delegated OAuth/API** and permission-scoped, independently revocable user token is best where available. A separate isolated per-user TinyFish browser profile is an alternative only with explicit opt-in, compatible terms, account isolation, encryption and a reliable logout/revocation process. A mere Google OAuth identity token does not grant Gemini chat-history access.
3. Require a documented way to retrieve each permitted conversation/history scope. For Gemini Apps, user-directed export is described by Google Takeout: https://support.google.com/gemini/answer/16920332 .
4. No shared browser profile, session cookie export, multiuser prompt relay through the owner's Gemini, unsolicited account reading, or silent collection of all a user's private history.
5. Every card receipt must be scoped to the QuantaPhi verified user; prevent private conversations from appearing in the public carousel, analytics, logs or share images.

## Shopping contract

A Levi's card may display authorized product records and the merchant's exact visible price, then direct the buyer to `https://www.levi.com/US/en_US/` to select a size, add a product to cart, and finish payment on the real merchant website. Never collect raw card data in QuantaPhi then replay it into merchant forms. If later approved, a formal merchant checkout/affiliate integration may add a verifiable referral receipt. Levi's public affiliate program: https://www.levi.com/US/en_US/features/affiliate-program

## Next production gates

- Run focused CI for `test/provider-browser-cards.test.mjs` and whole Brain diagnostics; adjust regressions.
- Set `TINYFISH_API_KEY` and `TINYFISH_PROFILE_ID` exclusively on `infinity-brain-clock` through a verified secure Cloudflare write, after confirming same TinyFish account profile.
- Verify prompt input and genuine output on Gemini in a test browser. Until then leave publishing blocked/experimental.
- Add per-user owned profiles plus consent/revoke only after product, privacy, billing and security review. Do **not** repurpose owner session for public cards.
- Merchant data and payment integration require authorized product/checkout source; existing Levi's card is merchant-site handoff only.
- Confirm mobile card UI, swipe arrows and all existing Share / Collect / +1 Build actions after deployment.

### Follow-up live acceptance retry — also blocked

A second TinyFish run targeted Gemini's `rich-textarea` element and attempted keyboard input with live visible checks. Even after clicking the specific editable region and tab navigation, no prompt text appeared. The test was halted without claiming a response. The account remains authenticated, but **Gemini browser chat transport is not operational through the currently tested TinyFish Agent typing method**. Possible next implementation is supported low-level CDP/Playwright input against a separate browser session, with its own verified consent and costs; this is not yet implemented.
