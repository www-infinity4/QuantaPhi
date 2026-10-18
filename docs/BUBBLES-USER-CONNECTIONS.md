# Bubbles per-user account connections

Requested October 17, 2026. Product goal: embed a Bubbles card, connect accounts once, and ask Bubbles to research, build and operate on the user's behalf.

## Implementation status

This patch adds a tested, server-only authorization contract. It is NOT an OAuth server, token vault, live provider integration or buying tool. It is not wired into the owner-only Brain executor. All provider catalog entries deliberately remain `not_configured`.

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
