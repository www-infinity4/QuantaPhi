# Unified Wallet · numbered device identities (#1906)

**Status: source-only identity pilot, NOT connected to live wallet authentication.**
Current production wallet calls authenticate with StarQuest `sq_` device tokens through
`workers/unified-wallet/worker.js` and `IDENTITY_DB.account_devices`. Changing
that untested would risk account takeovers and breaking balances, Google sign-in,
Bubbles and wallet recovery. Both original tables and balances are untouched.

## Phone-number-string concept, safely interpreted

Each installed QuantaPhi app instance may locally generate a **39 decimal digit**
number from 128 bits of platform cryptographic randomness. Store it as a
**string**, not a floating-point integer (JavaScript would lose digits).
It is an app-installation label, **NOT** a mobile telephone number, IMEI, serial
number, fingerprint or secret. A phone sends only its own registered label to
the future wallet enrollment endpoint after a verified account login. Other
people's phones cannot be scanned, enlisted or assigned to an account without
their explicit action. The owner of one wallet may enroll several devices.

The private account database maps:
```text
Verified owner account A
   registered app X: 39 decimal digits → public P-256 key X, revocable
   registered app Y: 39 decimal digits → public P-256 key Y, revocable
   account-only list fingerprint: SHA-256(domain + account ID + sorted aliases)
```
The fingerprint summarizes an **authorized account's device list**, not a
global master password or combined string of all users' device identifiers.
The server cannot use it to unlock accounts or reconstruct private records.
**The numeric alias alone NEVER signs anybody in.** Copying a label is harmless
only if it remains insufficient to authenticate.

## Device possession proof and safer real production option

A linked device needs a private P-256 key or, preferably, an actual
**WebAuthn passkey**. On every login, the server issues a random one-time
challenge that expires in ≤5 minutes, binds it to an account and the enrolled
device, and verifies the device's cryptographic signature. The server must
consume each challenge atomically, issue a short-lived scoped session, rate
limit attempts, allow account-wide revoke, and reject unknown/expired/mixed
account credentials. The numeric identifier serves only to locate the
*expected* public key.

This PR includes testable P-256 proof primitives and an **unapplied** SQLite
schema for aliases and challenges, but does not expose an auth endpoint,
issue any session, persist a private key, or enable login with numeric
identifiers. We have an existing [Quant Mail WebAuthn PR #1240]
(https://github.com/www-infinity4/QuantaPhi/pull/1240) that uses a real
WebAuthn server library. Reuse its validated credential ceremony/review
rather than replacing it with a homegrown login proof. A locally generated
WebCrypto private key is not necessarily secure hardware-backed; prefer
Android Credential Manager/WebAuthn on real phones.

## Safe migration: NOT a production cutover

1. First verify an existing owner's wallet or permitted recovery step, using
   today's supported login. A user-typed account ID or a number saved on a
   phone never proves ownership.
2. A real enrollment page requests explicit consent, creates an Android
   platform passkey and a random app alias, sends only the public key+alias to
   a server scoped to that account, and records an enrollment receipt.
3. Apply `workers/unified-wallet/migrations/0001_numeric_alias_pilot.sql`
   only to a verified private **staging** copy after backing it up. No live
   D1 migration has been executed or authorized.
4. Test server-generated random challenges, device proof, one-time atomic
   consumption, old/new phone isolation, lost/revoked phone, two accounts
   on one physical device, backup restore, 10+ enrolled phones and
   rate-limited probing. Do not permit phone identities or alias strings
   to be used as financial authorization or payment consent.
5. Add an explicit staged flag and only then gradually migrate login to
   passkeys. Keep prior token validation and independent recovery until
   physical Android and cross-account acceptance and rollback are verified.
6. Separate the new identity system from the distributed app-fragment cache.
   A fragment placement ID is not a wallet credential, and the mesh may never
   aggregate other people's login metadata to unlock an owner account.

## Source tests

```bash
node --test test/unified-wallet-device-number.test.mjs
node --test test/unified-wallet-account-isolation.test.cjs
```

An origin-scoped identifier, not an unrestricted hardware ID, follows
Android's current ID best practices:
https://developer.android.com/identity/user-data-ids

Actual user authentication must follow W3C WebAuthn Level 3's server-side
random challenge and verified public-key credential rules:
https://www.w3.org/TR/2026/REC-webauthn-3-20260825/

This source proves *individual components* only. It does not prove a live
identity replacement or production login. The two numeric examples provided
in conversation must **not** be embedded into repository files or treated as
real credentials.
