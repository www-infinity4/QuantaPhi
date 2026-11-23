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

## Hex-color graph and aligned-window visualization

The owner extended the original numbered-device idea: each approved phone's
numeric string can be drawn as colored RGB "bulbs" whose patterns align into
an account-specific transparent window. This is **implemented as reversible,
non-secret display encoding**, NOT steganographic encryption, a new wallet
password, or permission to read other phone data.

- `encodeDeviceColorTiles`: converts one exact 39-digit 128-bit app-installation
  label to **six `#RRGGBB` tiles** (16 original data bytes plus two
  first SHA-256 checksum bytes). Leading zeroes roundtrip exactly.
- `decodeDeviceColorTiles`: decodes those six tiles and rejects incorrect
  color formats, impossible values and accidental tile corruption. A short
  16-bit checksum detects many mistakes, but someone can deliberately copy
  or forge colors; this is **not** encryption or authentication.
- `buildWalletColorWindow`: takes the **server-supplied list of already
  authorized device labels belonging to only one verified account**. It
  deterministically sorts the labels, hashes the wallet account binding and
  renders its SHA-256 fingerprint as eleven RGB tiles. The same account's
  registered phones generate an aligned pattern even in different list order;
  a different wallet obtains a different pattern.
- `colorWindowsAlign`: compares complete sets of displayed tiles for
  visual agreement, and always returns *comparison only*. Neither rendering
  nor alignment authorizes any account or financial transaction.

```text
Phone A own app alias --> 6 RGB tiles  ┐
                                        ├─ VERIFIED wallet's enrolled devices
Phone B own app alias --> 6 RGB tiles  ┘      ↓
                                  account-bound sorted device-list SHA-256
                                              ↓
                                   11-color visual "window"
                                              ↓
                           device passkey/signature STILL required to log in
```

**Backup separation:** An enrolled owner phone can prepare a private,
encrypted recovery *manifest* containing the account's public device aliases,
public keys, revocation state and last server-reconciled list hash. A future
authorized GitHub App integration may upload that **ciphertext** only to the
specific owner's private backup repository with permission and integrity
receipts; source merges and GitHub Actions do not automatically copy device
data. Never store raw wallet tokens, WebAuthn private keys, unencrypted account
data or other users' device lists in GitHub, nor make GitHub the wallet
authorization server. Recovering the identifiers is not the same as
recovering a lost device's cryptographic key. At least one remaining
authenticated device or independently verified recovery method must exist.

**Privacy and reliability:** A phone only knows its own enrollment plus
whatever *authorized account-scoped* device summary the wallet server returns.
Phones belonging to unrelated accounts are not scanned or joined into a
global identity graph. If some bulbs are unavailable, the display may still
show the last server-authenticated account list, but a lost device must not
block its owner from using a valid recovery method. The private wallet ledger
remains authoritative. Hardware enrollment, authorized private GitHub backup
upload, actual signed session issuance, native Android UI and D1 migration
remain separate unfinished work, not deployed by this PR.


## New World ID · stable account number (`nwi-v1`)

The device enrollment pilot above remains separate. `globalUserIdentity` adds a
read-only **account label** to existing authenticated user responses:

- Input: the immutable server-verified account key (StarQuest generates
  `acct_` plus a random UUID), never a username, email, phone number, password,
  government ID or token. The namespace is exactly
  `QuantaPhi-global-user-id-v1` plus a newline plus the canonical account key.
- SHA-256 retains all256 bits, encoded as exactly **78 decimal characters**,
  including leading zeroes. Keep the value as a string; JSON numbers lose digits.
  The descriptor contains `version:nwi-v1`, `scope:quantaphi`, `number`, and
  `isAuthentication:false`. This is a QuantaPhi application account identifier.
- The same existing account receives the same number across devices/recovery;
  adding or revoking devices does not change it. Separate account keys produce
  independent hashes; cryptographic collision resistance is not an absolute
  mathematical uniqueness guarantee. Account merging would require a separate
  reviewed mapping policy.
- Unified Wallet `/v1/wallet/identity` and `/v1/wallet/state` return
  `user.globalIdentity`. Connector `/session` returns `globalIdentity` only after
  verifying its existing device bearer or account-bound temporary pairing.
  User-supplied IDs in query/body do not select an account, and this label is
  never an authentication credential, owner permission or spending approval.
- No additional database write, D1 migration, public directory or identity
  backup is needed. Hashing is not encryption or anonymity; keep account labels
  out of public activity/logs unless independently required and authorized.
- The existing `/bubbles-accounts.html` Verification Center displays the number
  with a Copy account number button. Its identity check is independent of
  optional provider records. Refresh/rejection clears it and stale older
  account requests cannot overwrite the current display. It is not stored in
  localStorage/sessionStorage.

Tests: existing device-number, wallet-account-isolation, connector-router and
provider-verification suites; `test/global-user-identity.browser.cjs` exercises
mobile360/393 and desktop1280 using synthetic accounts only. Real production
source readback and actual owner/Android acceptance remain separate receipts.
