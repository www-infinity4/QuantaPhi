# Bubbles per-user account connections

Requested October 17, 2026. Product goal: embed a Bubbles card, connect accounts once, and ask Bubbles to research, build and operate on the user's behalf.

## Implementation status

This patch implements the account-connection UI, wallet-authenticated HTTP router, per-user Durable Object service, OAuth coordinator, encrypted token vault, refresh/revoke lifecycle and Google read tools. Provider activation remains off (`CONNECTIONS_READY=false`) until the applications and keyring are provisioned and live consent is verified. This does not replace the owner-only Brain executor or claim all requested project/shopping tools are finished.

| Component | Implemented behavior | Remaining integration |
| --- | --- | --- |
| Consent coordinator | Wallet-verified identity/device-session binding, five-minute PKCE/state, transactional single-use callbacks, consent rate limiting and expired-state cleanup | Register provider clients and verify actual browser consent/return |
| Token vault | AES-GCM with record/tenant context, key IDs and old-key decryption | Provision separately managed keyring, rotation/re-encryption operations |
| Google adapter | Authorization URL, code exchange, stable subject lookup, partial scope consent, Drive file search, selected Sheets values and Calendar event reads | Register application, verification as required, test real accounts; write actions remain unavailable |
| GitHub App adapter | PKCE, expiring user-token exchange, verified numeric user ID | Register App, verify installation/repository permissions, authorize explicit resource selection, fork/build execution |
| Disconnect | Delete local credentials before provider revoke, cancel pending callbacks, invalidate in-flight reads/refresh, report revoke failure explicitly | Provider revocation webhooks and cancellation of future job executor queues |
| Refresh | Per-connection transactional lease, atomic rotated-token storage, revision checks, no scope expansion, reconnect on ambiguous failure | Verify real provider rotation and quota behavior |
| Website UI | Connect-account section, Google service selection, account listing/disconnect, explicit resource read controls and exact popup callback checks | Native system-browser callback fallback when the original opener is unavailable |

Implementation modules are `workers/bubbles-connections/{authorization,consent,providers,vault}.mjs`. `ConsentService` accepts trusted storage, keyring and adapter instances; its user/session arguments must come from the host's authentication layer, never unverified request JSON. Public responses omit tokens and internal vault references. No ID token is used for authentication; Google identity is read from the fixed HTTPS UserInfo endpoint using the newly exchanged token. This does not replace the user's Bubbles session.

GitHub intentionally grants **zero repository actions** from account identity alone. The adapter requires expiring GitHub App user tokens; it does not fall back to broad OAuth-App `repo` scopes or the owner's token. Google `drive.write` requests `drive.file`, which covers files the app is permitted to use, not arbitrary Drive access. Provider access remains subject to actual scopes and resource checks.

Validation: `node --test test/bubbles-connections.test.mjs test/bubbles-consent.test.mjs test/bubbles-connections-router.test.mjs test/bubbles-connections-ui.test.mjs` — 34 passing tests, including callback replay/concurrency, verified identity overriding supplied user IDs, partial consent, key rotation, disconnect/refresh races, ambiguous refresh failure, fixed tool endpoints, selected-resource checks and popup origin/source/state validation. Provider responses are simulated; this is not proof of real OAuth or a completed repository deployment.

## Activation checklist

Deploy `workers/bubbles-connections/wrangler.toml`; bind `BUBBLES_CONNECTIONS` on the site Worker to that service. The site route passes only the `/api/bubbles/connections/` prefix to it. `/health` is public; `/catalog` requires a verified wallet and reports configuration; account and tool routes remain gated by `CONNECTIONS_READY`.

Provision `CONNECTION_KEYRING` as JSON mapping a key ID to a random 32-byte base64url key, plus `CONNECTION_ACTIVE_KEY`. Register a Google web OAuth application and GitHub App with these exact callbacks:

- `https://quantaphi.org/api/bubbles/connections/google/callback`
- `https://quantaphi.org/api/bubbles/connections/github/callback`

Store `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, and `GITHUB_CLIENT_SECRET` as server-only bindings. Enable expiring GitHub user access tokens. Configure Google API access and consent review appropriate to the selected scopes. The existing Gemini API key is not a Google OAuth client and the owner's GHP is not a visitor connection. Only then enable the readiness flag and verify two real isolated accounts before advertising availability.

The callback page has no third-party assets, removes code/state from the address bar, disallows framing and restricts scripts with CSP. Disable query-string logging on the edge and connector Worker. The initiating popup must remain available; if provider or native browser isolation removes `window.opener`, the page instructs the user to restart and never claims a connection. No tokens are posted between windows.

## Gemini consultation

The owner requested a Gemini review. The existing Brain Gemini API returned HTTP 429. Gemini was then consulted through the cloud browser on October 17, 2026, and recommended retaining a shared adapter core, implementing Google services before GitHub project actions, and treating refresh/revoke and repository permissions as separate requirements. Its response is advice, not validation of the code or proof of vendor access. In particular, its broad statement about buyer APIs is qualified by eBay's official documentation: an Offer API exists but requires approval. Google verification requirements depend on the exact scopes and deployment.

Browser review: https://gemini.google.com/app/3b608140698beb6d (unsigned-in conversation; may not remain accessible). Screenshot: `gemini-connector-review.jpg`.

October 18 follow-up: automatic review rejected a project-specific security prompt. A general OAuth checklist was submitted instead, without project details. Gemini recommended concurrency checks, permission-limited reads and idempotent cleanup. Its token-family advice describes authorization-server behavior; Bubbles is a client and cannot control Google/GitHub token-family policies. We implemented client-side locking/version checks rather than claiming authority over provider-issued tokens. Review: https://gemini.google.com/app/86862eb7272bcbc6 ; screenshot `gemini-oauth-review-v2.jpg`.

The existing `workers/infinity-brain-clock/github-credential.mjs` is hard-coded to `www-infinity4`. Keep that owner credential separate; never fall back to it for visitor jobs.

## User experience to implement

Connections is available inside standalone and embedded Bubbles. A user chooses Connect GitHub or Connect Google, selects an account in the provider's system-browser authorization screen, grants the requested permissions, and returns to the same conversation. Show verified account identity, granted capabilities, reconnect and disconnect. Support several accounts per provider and an explicit project account selection. Chat login alone is not project authority.

GitHub: choose authorized repositories, import or fork into the user's authorized destination, work in an isolated sandbox, produce Oracle-style cards or the user's chosen website style, and preview before publishing to Infinity Pages under QuantaPhi.org or a domain the user controls. Advertising a separate .com is a distinct publishing action. Preserve commit, test, build and deployment receipts; a fork/import is not a completed deployment.

Google: request Drive, Sheets and Calendar capabilities incrementally. Google sign-in identity does not grant all Google services and does not grant eBay access. Account discovery may use only already-authorized data; never scan unrelated accounts or infer third-party authority from matching email. Offer the account chooser when the right account is unknown.

## Backend requirements before enabling a Connect button

1. Register provider applications, exact callbacks and necessary approvals. Implement authorization code flow with PKCE where supported, single-use expiring state bound to authenticated user/session and redirect allowlists. Use a system browser for native sign-in.
2. Verify provider identity and actual granted scopes. Store connections by internal user ID plus provider subject, not email. Map verified scopes into allowed actions using trusted provider adapter code, never LLM output or request-body grants.
3. Encrypt tokens server-side with a separately managed encryption key and rotation plan. Never return credentials to chat, cards, browser storage, generated code, prompts or logs. Keep the token vault outside arbitrary project execution; sandbox code must not inherit platform secrets.
4. Refresh under a per-connection lock; fail closed on revocation or refresh failure. Disconnect revokes where supported, deletes local credentials and cancels pending actions. Recheck authorization at execution, including delayed jobs.
5. Every tool request resolves the authenticated user's selected connection. Enforce tenant, provider, repository/resource and action boundaries before accessing credentials. The authorization helper in this patch checks the core identity/action contract only; executors must additionally check resource selection and provider scopes.
6. Persist action intents and idempotency keys. Return real provider receipts. Purchases/bids require an explicit user-approved item and maximum total including shipping/tax policy, account, currency and expiry; durable delayed actions reference that authorization rather than asking repeatedly. Do not blindly retry an ambiguous purchase/bid response.

## Plugin builder

Missing connector -> research official documentation -> generate adapter manifest, action schemas, permission mapping and sandbox tests -> review -> configure provider application -> user authorizes -> live receipt verification -> enable. Generated adapters cannot invent vendor APIs, issue themselves vendor permissions, borrow another user's tokens, or mark an unsupported action connected. IBM and Anthropic require their supported project/API authorization methods, not assumed consumer subscription access.

eBay bidding requires approved Offer API access and separate buyer authorization. A scheduled last-second bid cannot guarantee auction timing or acceptance. Walmart's documented Marketplace APIs address seller/supplier workflows; a consumer shopping connector must remain unavailable until a supported buyer integration is verified. Do not present seller order APIs as consumer checkout.

## Acceptance gates

- Two users and multiple accounts remain isolated; no owner-token fallback.
- Read-only consent cannot write, fork, publish, order or bid.
- Expired state, callback replay, wrong session, revoked/expired token and disconnect during a queued job fail closed.
- Google login cannot become eBay permission; account ambiguity is resolved explicitly.
- Embedded and native authorization returns to the initiating user/project without exposing tokens.
- Repository import -> sandbox changes -> tests -> preview -> authorized deployment -> real receipt is verified end to end.
- Bidding/ordering remains disabled until provider approval, user limits and duplicate-submission protection are verified.

## Official references

- https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developer.ebay.com/api-docs/buy/offer/static/overview.html
- https://developer.walmart.com/
