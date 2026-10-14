# Bubbles Site Kit — visitor-side assistants (October 2026)

This is the current **first working boundary** for user-owned website assistants.
A site can embed Bubbles for chat, optional private device/browser notes,
and a manually shared **work draft**. No visitor gets the QuantaPhi platform owner's
Robot Brain, wallet, Cloudflare, or GitHub credentials.

## Embed a bubble on a site you control

```html
<script async src="https://quantaphi.org/bubbles-embed.js"
  data-bubble-id="my-site-helper"
  data-bubble-role="builder"
  data-bubble-name="My Assistant"
  data-bubble-instructions="Help draft a simple public website."></script>
```

Notes/history remain in the browser storage of the Bubbles iframe (and
storage may be blocked/partitioned by the browser). They are **not** a synced
personal Quant wallet or ChatGPT memory. Chat currently uses Oracle/Cloudflare,
not the visitor's ChatGPT plan.

A visitor opens the assistant, describes a task in **Notes & authorized work**,
and presses **Share draft with this website**. The host script validates
the message's iframe window, exact QuantaPhi origin and bubble ID, then emits
a `bubbles:work-draft` DOM event on the host window.

```js
window.addEventListener('bubbles:work-draft', event => {
  const {request, bubbleId, executed} = event.detail;
  // This is visitor-supplied, untrusted text; executed is always false.
  // Display it for review; textContent avoids HTML injection.
  const review = document.getElementById('bubbles-task-review');
  if (review) review.textContent = bubbleId + ': ' + request;
  // To run a task, implement independent sign-in, user confirmation,
  // server-side permission checks, and a RECEIPT-producing job API.
});
```

**No job executes** merely because the browser event fires. It is intentionally
not a cross-origin robot-execution API. User-owned sites can wire their own
backend worker, independent per-user ledger, and provider-authorized tool
adapters after explicit consent and authenticated task submission.
Do not trust `request`, `bubbleId`, a postMessage, or a browser Origin as
proof of identity, billing authority, repository rights, or a paid mint.

To build further: require per-site account/session isolation and separate
provider consent; route research/search through publicly documented Infinity Phi
or Code Phi APIs (not invented endpoints); require scoped approval for website
publishing, appointments, shopping and financial transactions; bind receipts
and token events to the visitor's verified wallet. Never mint for chat text,
retry or page refresh alone.

## Short replies and model access

Default chat output is one or two short spoken sentences. Actual user requests
for detailed explanations or technical repairs receive a larger budget. The
Worker uses bounded model output tokens; this does not create free OpenAI usage.

As of October 2026, OpenAI offers an open-source/local-app Sign in with
ChatGPT flow for eligible model requests, with per-user OAuth consent.
That is **not yet implemented in Bubbles** and does not transfer account
memories, existing conversations, or user tools. Providing commercial or
remotely hosted ChatGPT plan inference requires appropriate participation/
approval. A ChatGPT sign-in web link is not a working inference adapter.
The independent Android app needs its own correct PKCE/OIDC credentials
and protected local token storage before requesting ChatGPT plan inference.

## Current limits and verification

- Website visitor: chat, local optional notes, work draft event.
- Website owner: may implement an *independent* authenticated job adapter.
- QuantaPhi owner: existing owner-authenticated Brain path remains separate.
- Calls to reminders/calendars, payments, online shopping and website publishing
  are **not** granted by installing the embed.
- Speech/overlay: native Android APK still requires installing a successful
  CI build, Android microphone/overlay permission, and on-device verification.

Tests: `node --test test/bubbles-tools.test.mjs test/bubbles-embed.test.mjs`.
