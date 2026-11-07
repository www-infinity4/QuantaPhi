# GIT · verified code-line receipts (phase 1)

GIT is a **separate proposed programming-work asset** in the Infinity/QuantaPhi design. It is not the Git version-control tool itself, not a cryptocurrency, and not an existing balance in the Unified Wallet. One eligible, independently verified added source line can ultimately earn **1 GIT**, while its receipt preserves the commit, path, added-line number, SHA-256 content fingerprint, programming language, requested build intent and credited recipient. Excluded lines also receive **audit records** rather than a payment. GIT types include `git:website`, `git:app`, `git:repair`, `git:test`, `git:integration`, `git:data`, and `git:other`.

## Bubbles recipient rule

**Kris, the Bubbles owner/executor, is the sole recipient of GIT generated through Bubbles for every customer.** Each verified eligible added line earns 1 GIT for that verified executor wallet. Customers receive their Bubble Bits separately; they cannot collect these GIT in their own wallets through Bubbles.

The execution channel is authenticated from the backend job receipt. Changing `--builder`, submitting a customer wallet, or even presenting a signed receipt that names a customer recipient cannot override the owner binding. A missing, inactive, unverified or mismatched executor binding blocks issuance. Code provenance and the requesting customer stay recorded separately from the GIT recipient.

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
3. **Attribution:** Builder labels (`human`, `bubbles`, `gpt`, `copilot`, `other-ai`) describe provenance and cannot select a payout wallet. All work authenticated as executed through Bubbles uses `bubbles_owner_executor_v1`: a signed authorized customer job must match the one server-configured, verified Bubbles owner/executor binding. Its GIT recipient must be that executor wallet. The customer's identity remains the authorization/provenance subject; customer wallets receive no GIT through Bubbles. The same rule applies when a customer changes the claimed builder to `human` or Bubbles uses another provider internally.
4. **Exactly-once accounting:** Receipt IDs derive from repo + full commit SHA + path + new-line number + content hash. Cloudflare D1 `gitcoin_awards.receipt_id` is unique. Replaying the same claim must not produce a second award; prior ownership or line movement should also be checked against history before any issuance.
5. **Wallet isolation:** GIT is not Quants, Star Coins, Music Quants, Infinity tokens or Bubbles Bits. `gitcoin/schema.sql` creates proposed **separate** D1 evidence/award tables; do not overwrite an existing wallet or assume the migration is deployed.
6. **Business trading:** GIT-to-GIT transfers between authenticated business wallets are **planned but disabled** pending consent, atomic debit/credit, idempotency, fraud checks and review of any legal implications. Nothing in this repo sets GIT exchange rates, makes GIT money, or claims a third-party brand participates.

## Interface for the next backend milestone

`evaluateClaim(manifest, {principal, github, quantAI, bubblesExecutor})` in `verification.mjs` requires server-supplied authenticated principals and trusted adapters for `getDiff`, `containsCommitOnDefault`, `checksPassed`, `resolveAttribution`, and `review`. The verified attribution must include its authenticated execution channel. Bubbles evaluation additionally requires a trusted executor-binding resolver; settlement supplies its own database-backed resolver and ignores caller-supplied bindings. Its `createSettlementPlan` returns proposed immutable **1-GIT-per-approved-line** awards. It never inserts into D1, talks to GitHub, or issues a wallet credit on its own. A service must add rate limits, GitHub App attestations, signed provider consent, quality policies, real idempotent database transactions and wallet reading before issuance may be enabled.

### Verification

```sh
node --test test/gitcoin-*.test.mjs
node --check gitcoin/gh-gitcoin.mjs
```

The proposed isolated SQL schema can be checked with SQLite locally; **do not apply it to a live wallet** until server-side review. Follow issue #1250 and the existing Gitpal/Copilot security-release holds; do not describe this standalone phase as deployed or integrated with Quant AI or the Wallet.


## Server settlement source (not deployed)

`settlement.mjs` runs `evaluateClaim` using authenticated GitHub and Quant AI adapters before constructing a transactional D1 award batch. Every verified line requires an attribution evidence ID; every Bubbles customer job credits only the configured verified owner/executor wallet, including jobs using GPT/Copilot internally. Customer identity and code provenance cannot change that recipient. Each qualifying new source line produces exactly **1 GIT**, with no dollar exchange rate.

Receipt replay cannot credit twice or select a different recipient. A historical repository/path/content fingerprint prevents delete-and-re-add reminting; SQL backfills fingerprints from earlier pilot awards without editing those awards. Failed checks, missing attribution and quality rejection cannot award a line. Readback verifies the actual stored receipt before reporting settled units. Batches above 200 verified lines fail before writes; larger-job batching requires a reviewed runtime adapter.

This module is server source, with real SQLite tests, not a deployed API. Production GitHub/Quant AI identity adapters, approved D1 migration, wallet UI integration, signed Bubbles operator job routing, independent security review, protected release and two-user live acceptance remain required. It cannot cause a payment merely by running the CLI or uploading a manifest. Existing Copilot/Gitpal security holds remain.


### Owner binding and migration boundary

`gitcoin_bubbles_executor` is a singleton server-managed configuration. It has no customer enrollment/update API and is not populated from the first caller, a display name, a submitted wallet, or a CLI flag. Reviewed backend setup must provision it from Kris's existing verified Bubbles executor identity. Recipient changes are locked; revocation can deactivate issuance. This source change does not provision a real wallet or transfer old balances.

Bubbles job receipts must carry the authenticated `executionChannel`, customer identity/wallet and authorization, `executorBindingId`, signature verification and the owner recipient. Settlement persists the channel, owner-recipient policy, binding and customer wallet separately. The SQL award guard independently checks that the configured owner binding is active and verified and matches the award wallet.

Existing pilot schemas require a reviewed migration for the new claim columns, owner configuration and updated award trigger. No live migration is performed here. Missing configuration blocks Bubbles GIT rather than falling back to a customer's wallet. Human CLI work outside the Bubbles execution channel is outside this owner-specific correction.

## Globally serialized awards (source milestone)

The isolated authoritative GIT D1 now defines `gitcoin_serials` with a shared
SQLite `AUTOINCREMENT` sequence. Each independently verified 1-GIT award gets
one permanent `GIT-000000000001`-style serial, plus its immutable receipt ID,
credited wallet, authenticated request submitter, optional customer wallet,
and GIT type. A verified claim must already exist: a local Termux
`GIT-P-<receipt id>` is **only a provisional receipt reference**.

The serial insert is part of the same D1 transactional batch as the awarded
line. Repeated GitHub callbacks and retries cannot issue another serial for
the same receipt; prior serials cannot be updated, deleted or transferred by
this schema. The settlement readback verifies the serial recipient and creator
before exposing it in a server-only result. On a shared ledger, serial numbers
are globally sequential across all users, **not** per-account restartable.
A new independent database or a reset is not a continuation of that sequence:
production must use a single authoritative GIT database and preserve backups.

Bubbles-generated code credits the active verified Bubbles owner/executor
binding only, never the customer's wallet. The customer remains the recorded
requester. Issuance still requires a signed customer-authorized GitHub job,
default-branch verified code, passing CI, meaningful independently reviewed
source lines, exact-commit customer acceptance and a server-issued wallet
identity. Mere execution or a local receipt creates no award. Existing PR
#1682 customer acceptance and PR #1703 Unified Wallet reading are separate
integration milestones: this branch does not deploy or turn on live payouts.
