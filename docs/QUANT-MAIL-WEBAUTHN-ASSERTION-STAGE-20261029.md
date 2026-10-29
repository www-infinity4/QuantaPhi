# Quant Mail · WebAuthn assertion verifier staging (2026-10-29)

This is **source-only cryptographic preparation** for issues #1233, #1236 and #1231. It is not a deployed login endpoint, credential enrollment, registered passkey, session issuer, mailbox or mail transport. The safe published `/quant-mail.html` preview remains unchanged.

## Narrow scope

`workers/quant-mail/webauthn-assertion-verifier.mjs` verifies a **previously registered** ES256/P-256 WebAuthn authentication assertion against an exact server-held 32-byte challenge, exact `https://quantaphi.org` origin and `quantaphi.org` RP hash. It requires UP and UV, checks signature bytes and canonical encodings, rejects cross-origin and counter rollback, and returns only evidence (never an account session). Only standards-conforming DER ECDSA signatures are accepted. Backup-eligible authenticators may legitimately use a zero counter; zero counters cannot prove cloning resistance.

`newChallenge` uses CSPRNG. `consumeAttempt` supplies an atomic conditional one-use D1 UPDATE with server subject, purpose, hashed challenge and expiry. `commitCounter` supplies a compare-and-swap counter update requiring the same subject and an unrevoked credential. The SQL table names are **proposed only**; no migration, D1 binding or runtime setting has been changed.

## Required integration before enabling UI

1. Review and reconcile #1235 with the already merged #1238 preview; do not overwrite the live status page. Implement a standards-compliant **registration** verifier (CBOR/COSE attestation, authenticator data, RP/origin/UV), persist the credential public key and owner subject in a new isolated registry, and ensure unique credential ownership. This assertion module alone cannot enroll a passkey.
2. In the existing authenticated identity stack, resolve the subject and admin role **server-side**. A client-provided email or wallet token string is never proof. Both owner aliases map to the same verified owner wallet subject; administrator requires RBAC and a fresh user-verified step-up.
3. Use a durable attempt registry with unpredictable ID, server-issued challenge, TTL, purpose and wallet subject. Add rate limits, CSRF/origin validation, credential revocation, and audited challenge consumption. Verify the signature before consuming; then consume and counter-CAS before committing a secure HttpOnly/SameSite session. Fail closed on any failed write, changed identity, or replay.
4. Security review must address multi-region concurrency, atomicity across the challenge/counter/session transaction, key rotation, compromised or lost passkeys, backup-state changes, denial of service, and credential enumeration. Do not enable `/api/quant-mail/passkeys` until independent review and Android on-device acceptance.
5. Separate actual Cloudflare Email Routing, inbound delivery, authenticated outbound transport, SPF/DKIM/DMARC and per-user mailbox isolation. A passkey is not an email account.

## Evidence levels

The isolated Node WebCrypto test generates a real ECDSA key and signs synthetic WebAuthn payloads. It verifies cryptographic code in CI but is **not** a hardware authenticator, real Android Chrome, Cloudflare deployment or verified owner credential. The old five-day authorization, wallet and APK security holds remain untouched.
