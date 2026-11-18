# QuantaPhi owner-only passkey server: verified release contract

Engineering checkpoint, 2026-10-29. This document is intentionally free of
owner email strings, owner wallet IDs, device tokens, OAuth secrets, or
configuration values. **Do not publish the alias list on a public page.**

## Server architecture

- The existing **bubbles-connections** Cloudflare Worker implements
  `/api/quant-mail/passkeys/status`, `/register/begin`, `/register/finish`,
  `/login/begin`, `/login/finish` and `/session`. It uses
  `@simplewebauthn/server@14.0.3` for WebAuthn verification.
- RP ID is `quantaphi.org` and browser origin must be
  `https://quantaphi.org`. User verification is mandatory.
  Registration and sign-in challenges expire after 5 minutes and are
  consumed atomically exactly once. Public credential keys, counters and
  owner-subject association live in the existing `CONNECTIONS` Durable Object.
- **A verified wallet must be checked before examining the email alias.**
  Registration requires an authenticated original `sq_` device session
  verified by the existing `BOT_WALLET` service and a private
  `PASSKEY_OWNER_ACCOUNT_ID` binding that matches its account ID. A paired
  `bc_` token, a typed email or a browser-supplied admin flag is insufficient.
- The private `OWNER_EMAIL_ALIAS_REGISTRY` secret must contain JSON of the
  shape `{"owner":"<approved-address>","administrator":"<approved-address>"}`.
  Use only owner-authorized values from the existing account setup. There is
  **one independently verified credential per alias**, with a distinct
  WebAuthn user ID per alias and an atomic duplicate-credential rejection.
  No owner email or wallet identity is hardcoded into public source.
- Administrator authentication requires both a verified WebAuthn assertion
  and a fresh original owner wallet token checked on the server.
  The owner alias receives a regular short session; administrator sessions
  are limited to 5 minutes. The resulting session cookie is
  `Secure; HttpOnly; SameSite=Strict`; it cannot mint a wallet device token.
- The existing private Robot Brain route
  `https://quantaphi.org/robot-brain-account-security.html` is the only
  owner onboarding surface. It renders an empty email input *after* the
  `QuantaBrainOwner.walletIdentity()` check. The owner types one address,
  registers its phone passkey with Android consent, and repeats for the next
  address. No public homepage, Bubbles generic chat or Quant Mail preview
  may display or advertise the aliases.

## Current verified Cloudflare state

- A narrow Cloudflare Worker route
  `quantaphi.org/api/quant-mail/passkeys/*` is already assigned to
  `bubbles-connections`; do not create a duplicate route.
- Existing Worker settings contain `OWNER_EMAIL_ALIAS_REGISTRY`,
  `PASSKEY_OWNER_ACCOUNT_ID`, `CONNECTION_KEYRING`, `BOT_WALLET`,
  `CONNECTIONS`, Cloudflare OAuth scopes, and `CONNECTIONS_READY`.
  Keep all existing values and bindings untouched.
- `PASSKEY_ENABLED` is absent, deliberately **fail-closed**.
- The current production response to a direct
  `GET /api/quant-mail/passkeys/status` is
  `{"ok":false,"error":"origin_not_allowed"}`, showing the **old Worker
  code** still handles this path. This is not a working passkey service.
- Email Routing for the domain was separately verified **disabled**.
  A phone passkey grants no inbound email, inbox, outbound sending,
  admin mailbox processing, or right to execute instructions from email.

## Safe server-release sequence

1. Obtain independent security review of exact-head source. Check first
   enrollment assurance, original wallet binding, WebAuthn verification,
   one-per-alias atomic writes, alias enumeration, administrator step-up,
   challenge replay, credential counters, cookie security and recovery.
2. Let GitHub Actions install the pinned verifier, run source and regression
   tests, and dry-run bundle the Worker. Do **not** ask the user to run npm.
3. Via the authorized **existing** Bubbles Worker deployment workflow,
   publish with `PASSKEY_ENABLED` unset/false. Its pre/post binding
   inventory must preserve every existing secret, service, Durable Object,
   Cloudflare scope and OAuth grant. Do not alter Unified Wallet or D1.
4. The deployment workflow now runs
   `node scripts/verify-quant-mail-passkey-live.mjs`.
   It requires a JSON `GET /status` response with RP `quantaphi.org`,
   `ok:true`, coherent `enabled` / `registrationReady` /
   `loginReady` flags, `Cache-Control:no-store`, no private alias/account
   fields, and both cross-origin and missing-origin POST registration
   requests rejected with HTTP 403. A stale old Worker **fails** this gate.
5. Verify trusted-owner and unrelated-wallet behavior, origin and role
   denial, real Android authenticator support, and normal wallet/Bubbles
   regression checks. Only after independent signoff, set
   `PASSKEY_ENABLED=true` using an authorized Cloudflare change, while
   preserving the private aliases and all existing bindings.
6. On the verified private Robot Brain page, have the owner type each
   address individually and personally approve one Android WebAuthn prompt
   per address. Confirm successful server storage and subsequent sign-in.
   Never claim a key was registered unless receipt verification succeeds.

## Security / operational cautions

- A guessed private-page URL is not authorization. The server never
  accepts owner entitlement from HTML, local storage or email strings.
- All requests are scoped to the correct relying party and approved
  origin, and unauthenticated users cannot enumerate the two owner
  addresses through the registration endpoint.
- Staged and production Worker deployments must not silently replace
  the `CONNECTION_KEYRING`, OAuth permission inventory, unified wallet
  service, device tokens or account recovery configuration.
- An independent owner recovery procedure is required to handle a
  lost or replaced phone. Do not silently allow re-enrollment of an
  address whose one credential is already recorded.
- Administrator inbox reading and GPT-assisted build proposals require
  separate explicit consent, mail delivery configuration and untrusted
  email-content handling. An email must never automatically authorize
  privileged builds.
- A source-build pass is not a live deployment. A live `/status`
  check without an actual Android WebAuthn ceremony is not a completed
  phone registration.
