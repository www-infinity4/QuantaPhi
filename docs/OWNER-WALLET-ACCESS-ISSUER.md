# Owner-only Cloudflare wallet recovery issuer (gated rollout)

Status: **NOT LIVE** until the Access service is enabled, the owner identity and original wallet ID are verified, secrets are configured, and live end-to-end verification succeeds.

## Existing data contract — do not migrate or overwrite

The original account remains in StarQuest D1 (bound as `IDENTITY_DB` on the `unified-wallet` Worker).
Preserve the **existing** `wallet_recovery_grants(claim_hash,account_id,created_at,expires_at,consumed_at)` and `wallet_recovery_audit` tables.
`/v1/wallet/redeem-recovery` atomically consumes a `wrc_` grant and registers a **new device hash** in the existing account.
No balance, ledger entry, history, or other account can be modified by this process.

Do not apply the proposed Gemini migration that renames the grant columns to `status` or `recovery_code_hash`; the current redeemer expects `claim_hash`, `expires_at` and `consumed_at`, with dates in **milliseconds**.

## Manual Cloudflare Access setup — required once

1. In the owning Cloudflare account, enable **Zero Trust / Access** if it is disabled. Access was reported as `access.api.error.not_enabled` in the October 19 API inspection. Do not enable account-wide protection for all public Workers.
2. Create a **self-hosted Access application** protecting only the exact URL path `unified-wallet.marvaseater.workers.dev/v1/wallet/issue-recovery`. Do not protect `/v1/wallet/state`, `/v1/wallet/redeem-recovery` or the QuantaPhi site.
3. Configure an **Allow** policy limited to the owner's exact verified identity, not everyone from an email domain. Confirm login with your chosen identity provider. No bypass policy.
4. Record the application's **AUD tag** (not a Cloudflare API credential).
5. Set these server-only `unified-wallet` Worker values, after confirming each value through account administration:
   * `RECOVERY_ACCESS_AUD` — exact Access application AUD.
   * `RECOVERY_OWNER_EMAIL` — Access-verified owner email, case-insensitive match.
   * `RECOVERY_OWNER_ACCOUNT_ID` — independently matched original `starquest-ledger` D1 account ID. This must be authorized through the operator, not selected by a browser user or provided in a request.
   * Keep existing `IDENTITY_DB` binding intact.
6. Deploy the updated Worker with **all its existing bindings and imported modules preserved**; changing the GitHub branch alone does not certify Cloudflare deployment.
7. Test Access login and the issuer on the exact protected hostname. A valid Access `ctx.access` object is mandatory; unverified requests and a forged `Cf-Access-Authenticated-User-Email` header are rejected even if the route is inadvertently exposed.
8. Add/enforce a Cloudflare WAF/rate-limit rule for `POST /v1/wallet/redeem-recovery`, because unknown invalid code hashes have no account ID on which to count attempts. Do not allow a user-supplied account ID for brute-force limits.

## User flow after activation

Bubbles -> Wallet Recovery -> **Verify owner with Cloudflare Access and generate a code** (opens the protected issuer login) -> explicit Generate button -> one-use, 15-minute `wrc_` code -> recovery page (code passed in URL *fragment*, which the page removes from history) -> Cloudflare redeems grant -> read original `/v1/state` -> APK persists a verified device credential under Android Keystore.

The issuer uses `ctx.access.getIdentity()`, enforces the exact AUD and owner email, resolves the fixed account from server configuration, and **never** accepts `accountId` or a wallet balance from client JSON.
It generates a cryptographically random 32-byte code, stores its SHA-256 hash only, and throttles issuance to at most one per minute and three per hour using a single D1 INSERT ... SELECT ... RETURNING query. Redemption's existing atomic UPDATE ... RETURNING remains unchanged.

The existing APK currently restores a verified token from native storage after a WebView reset, but the Chrome-to-APK device handoff must still be tested on an Android 12 phone. A code displayed in Chrome may need to be entered inside the APK; do not call that automatic pairing.

## Acceptance checks

- Access absent, wrong AUD, wrong email, cross-site POST, missing owner ID, or forged identity header: **no code issued**.
- One successful Access owner POST: precisely one grant bound to the approved original account.
- Same code redeemed twice: first succeeds, second fails.
- Restored wallet historical balances match source D1; **zero** mints or cross-account merges.
- Wrong device account remains unmodified; no old credential or plaintext code is logged.
- Confirm APK restart uses Android Keystore with no repeated code in a working verified session.
- Verify Cloudflare deployment receipt and live device access separately from GitHub merge.
