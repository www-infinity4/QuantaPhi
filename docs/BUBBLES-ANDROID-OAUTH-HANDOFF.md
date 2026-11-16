# Android OAuth handoff — issue #1089

## Verified failure
The current browser client starts OAuth from a popup and only accepts a `postMessage` from that popup or a same-origin `BroadcastChannel` notification. Android Chrome, standalone installed Chrome apps and Infinity Viewer WebView may run in different browser profiles. Neither messaging mechanism reliably crosses these boundaries. A successful provider consent screen is **not** a verified connected account.

## Implementation contract (not implemented by this document)
1. `/start` creates a random, single-use, five-minute OAuth state and binds it to the verified wallet user and session, provider, requested actions, PKCE verifier and a server-side pending transaction.
2. A separate server-side state locator maps only the **digest** of the random state to its owner Durable Object. It must not store provider codes, access tokens, wallet bearer tokens or personal identity in the locator.
3. The provider callback must validate the state format, resolve its owner, atomically consume or seal the callback code in the owner's Durable Object, and return a no-store HTML page that does not echo the code. Callback GET must not exchange credentials before owner-session verification unless the design explicitly proves equivalent CSRF and wallet binding.
4. The original Bubbles client polls a wallet-authenticated status endpoint using the original state, including after `visibilitychange` and `pageshow`. The endpoint must verify wallet user, session, provider, state and expiry before completing the exchange; one-time consumption must precede provider exchange. Polls must not expose the authorization code to JavaScript.
5. Explicit denied-consent and timeout statuses; bounded polling; no automatic retry with broader or reduced scopes. Show **Connected** only after persisted, verified connection receipt.
6. Handle callback opened in another browser, Chrome Custom Tab, installed Chrome app, and Infinity Viewer WebView. Android App Links may bring the user back but cannot be the sole return mechanism.
7. Never log raw OAuth code, state, access token, or wallet bearer token. No code in localStorage, sessionStorage, or query strings after callback handling. Enforce strict origin and content-security headers.
8. Maintain full authorized GitHub/Cloudflare scopes; do not merge limited-scope PR #1087. Do not bypass APK release hold #525.

## Required tests
- Chrome and WebView simulated as isolated contexts without `window.opener` or shared `BroadcastChannel`.
- Wrong wallet, wrong session, wrong provider, forged state, stale state, callback replay, concurrent callback and poll, denied consent.
- Failed token exchange and DO restart; one-time completion and no duplicate connection writes.
- Server code never returned by status endpoint; no code in HTML/history/logging; callback cache disabled.
- Successful full-consent GitHub and Cloudflare flows on Moto G Pure, followed by Cloudflare deployment and live smoke receipts.

## Existing architecture
- Client: `bubbles-connections.mjs`, `AccountConnections.connect`.
- Callback/router: `workers/bubbles-connections/router.mjs`.
- Durable Object and service: `workers/bubbles-connections/worker.mjs` and `consent.mjs`.
- `ConsentService.complete` already atomically consumes state and checks user/session; preserve those checks while adding the cross-browser handoff.

**Status:** Design/acceptance contract only. Not a deployed fix.
