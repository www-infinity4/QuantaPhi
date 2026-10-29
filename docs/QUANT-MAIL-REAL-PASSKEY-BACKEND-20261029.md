# Quant Mail passkeys: owner-only WebAuthn implementation checkpoint

Updated 2026-10-29. The requested addresses are `kris@quantaphi.org` and `administrator@quantaphi.org`, two aliases of **one existing verified owner wallet identity**. No separate Quant Mail password.

## Implemented on feature branch

- Real WebAuthn registration and authentication challenge endpoints under `/api/quant-mail/passkeys`, relying party `quantaphi.org`, exact web origin `https://quantaphi.org`.
- Registered credentials, public keys, unique one-time challenges, counters and short-lived authenticated sessions stored in the existing `CONNECTIONS` Durable Object, with a dedicated owner namespace. The private key never leaves the user's passkey provider on Android.
- Uses the audited, exact-version-pinned `@simplewebauthn/server@14.0.3` verifier, without authoring custom CBOR/COSE signature verification. Only GitHub build runners install the package; users have no npm commands.
- `/register/begin` and `/register/finish` require a valid existing StarQuest device wallet session (not a paired token), and call the Unified Wallet service's **server-only owner check** comparing the device's authenticated account ID with its existing configured `RECOVERY_OWNER_ACCOUNT_ID`. Browser-supplied admin role/ID is ignored. First registered owner becomes the single allowed subject in the registry; the same credential works for both aliases. Sign-in has independent fresh WebAuthn challenges.
- `/login/finish` requires verified user presence, user verification, RP, origin, challenge, signature and monotonic counter, and sets a `Secure; HttpOnly; SameSite=Strict` session cookie. Plain email selection alone never creates a session. Sessions are scoped to the Quant Mail passkey service, **not** an existing Unified Wallet device token or a working inbox.
- `quant-mail.html` includes an owner address dropdown, Create passkey and Sign in controls **disabled by default**. It checks the live `/status` readiness endpoint, and only unlocks controls when the service is enabled. Without the new service, it stays safely blocked and displays an honest message.
- `PASSKEY_ENABLED` is an explicit opt-in deployment variable: absent/false makes registration/login return 503, while public `/status` reports disabled. This protects live users while routing and staging are tested.

## Critical release ordering — DO NOT skip

1. Review exact source and install pinned package during CI. Target [Quant Mail PR #1235](https://github.com/www-infinity4/QuantaPhi/pull/1235) may overlap earlier frontend sources; reconcile it after this branch, not blindly merge competing versions.
2. Verify the Unified Wallet internal `/v1/wallet/passkey-owner` route and existing `RECOVERY_OWNER_ACCOUNT_ID` configuration are deployed without mutating wallet balances or account ID.
3. Deploy updated `bubbles-connections` while preserving all live OAuth keyring, Cloudflare scopes, service bindings and Durable Object migration history. Keep `PASSKEY_ENABLED` unset/false initially.
4. Route `/api/quant-mail/passkeys/*` to the correct service through a verified same-origin site Worker proxy or explicitly configured Cloudflare Worker route. Do not change an existing route blindly.
5. Independently test live `GET /api/quant-mail/passkeys/status` from Chrome, strict Origin enforcement, denied enrollment using unrelated wallet, wrong RP, wrong origin, stale/replayed challenge, cookie handling, existing Bubbles/Wallet flows and cross-device failures.
6. Following successful security review and acceptance, turn on `PASSKEY_ENABLED=true` **without changing existing sensitive bindings**. Recheck /status from Cloudflare Browser and native Android Chrome. The owner then opens https://quantaphi.org/quant-mail.html, signs into the existing StarQuest wallet if needed, chooses kris@quantaphi.org and taps **Create phone passkey** to accept the Android screen-lock/biometric prompt. The same registered owner credential may also be used with administrator@quantaphi.org, subject to actual owner authorization and administrator step-up.
7. Verify credential storage and true login `/login/finish` with secure cookie; store receipt without raw passkey material. Only then call passwordless owner sign-in active. Mailbox **inbound/outbound email** remains a separate still-unfinished infrastructure task.

## Threats / review checklist

- Owner identity must come from `BOT_WALLET` internal service (not a front-end email address).
- Counter replay, cross-account registration, reusing challenge, malicious origin and unregistered credential must all fail.
- The global owner Durable Object is an owner-only registry, not a public alias claim store; don't reuse it for users. User signup will require wallet-scoped, atomic unique alias registry and independently reviewed privilege boundaries.
- In initial version, credential registration relies on possession of the existing owner wallet device token. For higher-assurance first enrollment, add independent Cloudflare Access/email verification before enabling privileges if required by the security review. A lost/stolen device requires the separate 3-of-6 recovery policy, not silently replacing owner credentials.
- Never enable automatic wallet token issuance using just a passkey session until the wallet's independent server explicitly supports and verifies that transaction. No user session, passkey, mailbox or owner action can be completed by ChatGPT without the Android authenticator confirmation.
