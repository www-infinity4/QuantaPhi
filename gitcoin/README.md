# GIT · verified code-line receipts (phase 1)

GIT is a **separate proposed programming-work asset** in the Infinity/QuantaPhi design. It is not the Git version-control tool itself, not a cryptocurrency, and not an existing balance in the Unified Wallet. One eligible, independently verified added source line can ultimately earn **1 GIT**, while its receipt preserves the commit, path, added-line number, SHA-256 content fingerprint, programming language, requested build intent and credited recipient. Excluded lines also receive **audit records** rather than a payment. GIT types include `git:website`, `git:app`, `git:repair`, `git:test`, `git:integration`, `git:data`, and `git:other`.

## GitHub CLI (works without npm packages)

Requires installed `git`, `gh` and Node.js 20+. In a cloned QuantaPhi repository, opt in once:

```sh
bash gitcoin/install-gh-alias.sh
```

This sets a **local gh alias** rather than publishing a new official GitHub extension. It will not replace an existing `gitcoin` alias. In a code repository with an authenticated `gh` session:

```sh
git add .
gh gitcoin preview --intent website            # staged provisional totals only
git commit -m 'Build website feature'
gh gitcoin scan --intent website --builder human
# For a Bubbles-sourced change, use --builder bubbles (a claim, not proof).
gh gitcoin balance
```

For offline or test use: `node /path/to/QuantaPhi/gitcoin/gh-gitcoin.mjs scan --repo OWNER/NAME --github-login LOGIN --intent website --builder human`. `--commit SHA` selects any local commit. The manifest is stored under the local Git directory's `gitcoin/claims/` folder with owner-only file permissions, not in tracked source or uploaded automatically. Do **not** commit this file if metadata is sensitive. A local `balance` reports pending eligible candidates only and deliberately prints `verified_wallet_balance: null` until real wallet integration exists.

## Security and earning rules

1. **Authenticated GitHub proof:** A trusted backend must refetch the immutable commit diff, require the exact commit in the repo's default-branch history, check CI, and compare *every* receipt to the actual added lines. The local CLI cannot verify somebody's wallet or award GIT.
2. **Quant AI quality gate:** For each eligible line, independently check meaningful code relative to the owner's build intent, project context, compilation/tests, non-duplicative changes and generated/filler characteristics. Formatting-only churn, generated bundles, vendored sources, mass boilerplate, plagiarism and line-splitting abuse must be rejected. Current syntactic heuristics are only a preliminary filter and **are not proof of quality**.
3. **Attribution:** The claimed builder can be `human`, `bubbles`, `gpt`, `copilot` or `other-ai`; it cannot direct funds. For hand-coded work, a separately authenticated contributor/recipient link credits the contributor's verified wallet. For agent-built work, only independently signed task/job receipts, explicit user authorization and verified provider-wallet mapping can credit the provider. Mixed authorship requires a reviewed split policy rather than double credit.
4. **Exactly-once accounting:** Receipt IDs derive from repo + full commit SHA + path + new-line number + content hash. Cloudflare D1 `gitcoin_awards.receipt_id` is unique. Replaying the same claim must not produce a second award; prior ownership or line movement should also be checked against history before any issuance.
5. **Wallet isolation:** GIT is not Quants, Star Coins, Music Quants, Infinity tokens or Bubbles Bits. `gitcoin/schema.sql` creates proposed **separate** D1 evidence/award tables; do not overwrite an existing wallet or assume the migration is deployed.
6. **Business trading:** GIT-to-GIT transfers between authenticated business wallets are **planned but disabled** pending consent, atomic debit/credit, idempotency, fraud checks and review of any legal implications. Nothing in this repo sets GIT exchange rates, makes GIT money, or claims a third-party brand participates.

## Interface for the next backend milestone

`evaluateClaim(manifest, {principal, github, quantAI})` in `verification.mjs` requires server-supplied authenticated principals and trusted adapters for `getDiff`, `containsCommitOnDefault`, `checksPassed`, `resolveAttribution`, and `review`. Its `createSettlementPlan` returns proposed immutable **1-GIT-per-approved-line** awards. It never inserts into D1, talks to GitHub, or issues a wallet credit on its own. A service must add rate limits, GitHub App attestations, signed provider consent, quality policies, real idempotent database transactions and wallet reading before issuance may be enabled.

### Verification

```sh
node --test test/gitcoin-*.test.mjs
node --check gitcoin/gh-gitcoin.mjs
```

The proposed isolated SQL schema can be checked with SQLite locally; **do not apply it to a live wallet** until server-side review. Follow issue #1250 and the existing Gitpal/Copilot security-release holds; do not describe this standalone phase as deployed or integrated with Quant AI or the Wallet.
