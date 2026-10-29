# Quant Mail owner passkeys · source-stage security contract

**Owner correction (Oct 29, 2026):** The requested passkey login addresses are **kris@quantaphi.org** and **administrator@quantaphi.org**, **NOT the owner's outside Gmail addresses**. They are two aliases for the *same verified QuantaPhi owner identity*. No email password is assigned. A passkey must be made on the owner's phone after a device-held WebAuthn prompt is opened on the deployed QuantaPhi site. Nothing in GitHub can remotely create or authorize a private passkey on that phone.

Source PR #1235 includes a Quant Mail passwordless panel, client API contract, owner identity guard and CI tests. **No production WebAuthn API route, verified credential, active mailbox, account issuance, or admin login was created.** The controls must remain disabled unless the server returns a positive passkey readiness contract; do not enable them merely because a user typed an owner address.

## Identity boundaries

- Canonical RP ID: `quantaphi.org`, expected web origin `https://quantaphi.org`. Do not accept arbitrary sibling subdomain origins. In a future native Android app, only explicitly associated and verified signing certificates / Android origins qualify.
- Both addresses map to the same existing owner subject established by the wallet/identity verifier; the alias string alone does not prove that subject. Do not create two separate wallet accounts, balance pools, owner identities or mailboxes with independent credentials.
- Registration must start from an existing **server-verified owner wallet session** and confirm privileged ownership of both aliases. For public accounts, use an independently verified, wallet-bound address claim. Never trust client-supplied IDs or a social profile name.
- Login may begin without a wallet session, but the WebAuthn assertion must prove a stored credential attached to the **same owner subject**, using the server-generated one-time challenge, RP ID hash, exact origin, required UV (local screen lock/biometric), signature and counter/backup state checks. Return a fresh secure, HttpOnly, SameSite session cookie only after atomic verification. A failed assertion leaves existing wallets and chat sessions unchanged.
- Any operation under `administrator@quantaphi.org` also requires an actual, server-granted administrator role and a **fresh verified passkey assertion**. Selecting the administrator alias is never an elevation.
- Passkeys are a sign-in credential, not an email delivery account, password, forwarding instruction or mailbox encryption key. Users can later add multiple independently enrolled passkeys; never export a user's private passkey or ask Bubbles to click a phone's lock screen.

## Proposed private server API

All endpoints are under the same-origin `/api/quant-mail/passkeys`. None are activated by this PR.

1. `GET /status` returns `{ok:true, enabled, registrationReady, loginReady, rpId:'quantaphi.org'}`. This is **service readiness only**, not whether an alias exists; avoid account enumeration.
2. `POST /register/begin` requires the current verified owner wallet bearer and a CSRF-safe exact origin, then generates a one-use time-limited challenge, verified owner subject from the wallet, and registration options with `userVerification:'required'`, scoped to the RP. Only start after verified owner role.
3. Browser calls `navigator.credentials.create()` on the phone. `POST /register/finish` validates the attestation with a trusted standards-compliant WebAuthn server library, binds the credential public key and owner subject to an isolated durable registry, consumes challenge atomically and returns `{ok:true,passkeyVerified:true,registrationStored:true,alias,rpId}`. **The one registered owner identity can be used with both aliases; do not demand a separate passkey for each address.**
4. `POST /login/begin` accepts selected owner alias, applies throttling and account-enumeration resistance, generates fresh challenge, discoverable or bound public-key options with `userVerification:'required'`. `POST /login/finish` verifies the complete assertion, verifies that alias maps to the authenticator's owner subject, checks admin role and fresh step-up where applicable, consumes challenge once and sets a new secure cookie, returning `{ok:true,passkeyVerified:true,sessionEstablished:true,alias,rpId}`.
5. Enforce idempotent replay rejection, credential revocation, session invalidation on logout, account takeover alerts, binding of recovery methods, independent audit and multi-device verification. Never return private keys, passwords, proof receipts or unverified account IDs.

The frontend requires the browser's WebAuthn JSON parsing/serialization support. It fails closed on older Android browsers and asks for an update rather than downgrading to an insecure password or silently skipping verification. The secure server contract and actual Android phone confirmation are required before turning on the controls.

## Release acceptance

Real Android Chrome test on the owner's device, correct registration attestation, credential persistence, ordinary alias sign-in and elevated admin step-up sign-in, wrong-owner/alias tests, wrong-origin/RP, replay, absent UV, revoked credential, email outage, session isolation, lost-phone recovery, and actual mail inbound/outbound are independent acceptance requirements. Only after all tests/review/authorization should the source merge and be published. See issues #1233, #1236 and #1231.
