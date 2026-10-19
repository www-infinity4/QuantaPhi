# Bubbles StarCoin GitHub evidence backup (pilot)

**Status:** Source integration; production publication requires deployment and a verified user's GitHub authorization. No existing wallet balances have been moved or merged.

## One wallet, one private GitHub repository

The user signs in to Bubbles with their verified Cloudflare StarQuest wallet, connects GitHub using a user-specific expiring GitHub App authorization, and expressly selects a private repository with repository Contents write permission. They may explicitly request creation of `infinity-starcoins-backup` through GitHub when the installed App has Repository creation permission. New repositories may still require the user to grant the App access.

The server independently reads StarQuest `/v1/state` and the Unified Wallet `/v1/wallet/state` with the user's existing wallet credential. It must verify the same account and same StarCoin balance before writing a backup. A GitHub account, URL, HTML file, SIM identifier, phone model or wallet total by itself cannot establish ownership of that Cloudflare wallet.

A successful backup saves `starcoins/receipts/<SHA-256>.json`, advances `starcoins/latest.json`, and creates a saveable `starcoins/wallet.html` viewer. The wallet HTML is display-only. It cannot sign in, change a balance, create missing credits, or restore a Brain owner session. Do not enable public GitHub Pages for the private wallet repository.

The JSON contains only a pseudonymous account reference, server-reported StarCoin tenths, share count and up to 500 recent StarQuest receipts (event IDs, amounts, balances, type, reference and timestamp). **It never includes SIM ICCID, IMSI, IMEI, phone number, exact address, raw wallet bearer credentials, GitHub tokens, or conversation transcripts.** More extensive personal history is not part of this pilot.

Each sync fetches the current live Cloudflare ledgers again. It checks overlapping receipts and hashes previously committed JSON, detects when the stored GitHub copy has been altered, and returns an error for review. It does not assume a stale GitHub balance is fraudulent merely because new credits or debits have occurred since the last commit. The D1 ledger remains authoritative and GitHub cannot generate credit by editing JSON.

Repo creation has an explicit button and is not automatic. Only one private backup repository can be selected per Cloudflare account and concurrent first-use writes are serialized. The encrypted GitHub credential lives only in the existing Cloudflare connector token vault, not the user's repository. A 15-minute connector-only pairing is not sufficient to authorize wallet backups; a real StarQuest device session is needed.

## Remaining work

1. Deploy the updated `bubbles-connections` Worker with its new `STARQUEST_LEDGER` service binding and perform a live test using an actual user-authorized private GitHub repository.
2. Verify repo-creation permission and app installation scope for each user. Authorization may legitimately fail; never borrow the platform owner's GitHub credential.
3. Build APK hardware-backed, user-approved challenge signing (Android Keystore key) for same-device recognition, replacing insecure assumptions about SIM identity. The current APK vault preserves only an already verified device credential and does not provide browser-to-APK authentication across Chrome storage loss.
4. Add future opt-in backup types: Infinity tokens, Quants, Music Quants, and selected Bubbles/Robot Brain history. Do not enable them until each ledger and account mapping is verifiable.
5. For past split wallet accounts (including the distinct `kris` and `device_*` records), require both identities to be securely proven before an audited association. Nothing in this GitHub backup pilot merges or alters the old accounts.

GitHub commits document what Bubbles committed at that time. They are not immutable financial certificates: users with administrative rights can rewrite Git branches and private repos. Detecting discrepancies requires authoritative Cloudflare records and periodic reconciliation, and a separate server-signed or externally anchored receipt system can be added for stronger independent attestation.
