# Unified Wallet · GIT Coin / Bubble Bits / GPT Coin / USD Cash

**Canonical issue:** [QuantaPhi #1674](https://github.com/www-infinity4/QuantaPhi/issues/1674). Related [#1296](https://github.com/www-infinity4/QuantaPhi/issues/1296), [#1773](https://github.com/www-infinity4/QuantaPhi/issues/1773), and [Gitcoin](https://github.com/www-infinity4/Gitcoin). Draft [PR #1845](https://github.com/www-infinity4/QuantaPhi/pull/1845).

**Status Nov 8, 2026 UTC: source staged; zero new payout/real cash mutations in this session; not merged/deployed.**

The Bubbles Unified Wallet must always show these four *separate* signed-in asset tiles, beside the existing StarCoins, Quants, Infinity and Music Quants. A missing ledger/provider/identity returns **em dash + No verified balance**, never a fictitious zero or earned cash. Server receipt-confirmed sums can update on refresh, wallet events, and return-to-visible browser state. Do not treat client animation or Bubbles/GPT text as proof of a credit.

| Tile | Canonical source of truth | Activation gate |
| --- | --- | --- |
| **GIT Coin** | EXISTING Cloudflare `quantaphi-gitcoin-ledger` D1: `gitcoin_line_claims`, `gitcoin_awards`, `gitcoin_bubbles_executor`, `gitcoin_serials` | `GITCOIN_DB` trusted Worker binding and `GITCOIN_OWNER_BINDING_ENABLED=1` only after account's signed StarQuest ID is independently tied to an active verified executor binding; never trust browser-supplied wallet IDs; use canonical `gitcoin_awards` count, not a duplicate mint |
| **Bubble Bits** | Existing `bubble_bit_credits` D1 and `/internal/bubble-bit-credit` with server-signed Brain receipt, authenticated owner and idempotency | Trusted Brain + Unified Wallet `BUBBLE_BITS_ENABLED=1`, confirmed same-wallet credit readback and immutable per-operation receipt |
| **GPT Coin** | *New proposed* `verified_gpt_coin_receipts` D1 (one verified model invocation per immutable receipt); distinct from Bubble Bits and GIT | `GPT_COIN_LEDGER_ENABLED=1` only after a trusted GPT/Bubbles model invocation verifier, unique receipt IDs, independent authorization and tests; no client mint route |
| **Cash Wallet** | Separate regulated/provider-managed USD balance, never the reward D1 | Partner, verified funds/settlement, provider signature and reconciled account, merchant compliance and explicit user payment approval; separate draft PR #1772 |

## Verified Cloudflare snapshot (READ-ONLY)

Live `quantaphi-gitcoin-ledger` currently has the real GIT tables. Queries returned **0 issued GIT award receipts** and **0 verified active Bubbles executor bindings**. This is a database-wide snapshot, *not a private user's historical Gitcoin JSON balance*. Do not import `www-infinity4/Gitcoin` JSON records or pretend they are an identified StarQuest owner.

Live `unified-wallet` Worker settings showed existing `DB`, `IDENTITY_DB`, `BOT_WORK_SECRET`, but **no enabled `BUBBLE_BITS_ENABLED`**, **no `GITCOIN_DB` binding** and **no `GPT_COIN_LEDGER_ENABLED`**. Existing Bubble Bit code does not prove production accrual. No confirmed licensed cash-provider binding was established. These gaps must be reviewed rather than changed automatically.

## Source implementation

- `bubbles-cloud-wallet.js` retains all four visible status tiles on Android even when disconnected, without leaking previous user's balances. The connected account's verified StarQuest token and Unified Wallet signed account remain authoritative. It refreshes after signed wallet updates.
- `workers/unified-wallet/work-asset-ledger.mjs` adds **READ-ONLY** D1 projections for existing canonical GIT awards and proposed GPT receipt entries, conditioned on independently enabled bindings. Unbound/missing tables produce unavailable rather than 0.
- `workers/unified-wallet/work-asset-schema.sql` defines only the distinct GPT receipt journal. It must **NOT** duplicate the already operating Gitcoin D1 issuer. No public credit endpoint or automatic mint has been introduced. The migration is not deployed.
- `test/wallet-four-assets.test.cjs` exercises genuine D1 alias selection, per-user query scoping, idempotent unique GPT invocation and immutable receipt rows, mobile labels and safe unavailable balances. Existing two-account wallet isolation fixture is retained.

## Acceptance requirements remaining

1. Read, reconcile and independently verify the owner's existing Gitcoin claims and serials, including one-per-eligible-line proof, GitHub SHA/path/line/hash and linked executor StarQuest identity; register the signed owner binding only with real evidence, then verify exact account readback with nonzero only when legitimate.
2. Wire Bubbles' actual signed operation receipts to the already existing `bubble_bit_credits` D1 and verify real *credited* counts; no synthetic chat actions or tool narration counted.
3. Implement independently verified model invocation receipts from BOTH authorized GPT and Bubbles mechanisms, with unit policy and replay guard, before enabling GPT Coin.
4. Integrate separate authorized USD provider only after #1773 compliance, provider sandbox, real money controls, account recovery and merchant settlement acceptance. **No balances from Stripe product pricing or fictional Quants**.
5. Independent security/asset review, exact-head GitHub CI, approved merge, Worker bindings/migration, deployment version readback, and real Android verified-wallet balance/receipt tests. No completion until all pass.

## November 8 engineering continuation — receipt-compatible Bubble Bits and pending GIT code-line producer

**Source PR:** [#1845](https://github.com/www-infinity4/QuantaPhi/pull/1845), issue [#1674](https://github.com/www-infinity4/QuantaPhi/issues/1674). These are source changes, **not yet live or paid**.

- Fixed an actual mismatch: Brain emitted `github.capabilities`, `github.list_workflows`, `github.list_runs`, and `github.create_pr` step receipts, but the Bubble Bit D1 validator refused all four. Signed, completed operations now share the validator allowlist. `github.dispatch_workflow` (merely accepted/queued) is explicitly observation-only and cannot credit a Bubble Bit. The new red regression reproduced both defects before the implementation fixed them.
- GIT Coin already has one canonical D1 database: `quantaphi-gitcoin-ledger`. No second issuer was created. A new **feature-flagged and server-secret-gated** `/internal/gitcoin-line-claim` takes a Brain-signed source receipt, exact repo/commit/path/line/hash/language/intent and the authenticated owner account ID; it looks up the singleton active **owner_verified** executor binding and derives the destination wallet **server-side**. It only performs idempotent `INSERT OR IGNORE INTO gitcoin_line_claims` as `pending`. It does not write `gitcoin_awards`, `gitcoin_serials`, user balances or transfers. A claim ID collision against another wallet is rejected.
- `workers/infinity-brain-clock/gitcoin-diff-evidence.mjs` reads the exact GitHub commit by SHA through the signed Brain's server credential, checks the single-parent commit, parses the unified diff new-line coordinates, hashes added code lines without sending raw source code to the wallet, skips binary/non-code/generated files/blank lines, and fails closed for truncated or excessive diffs. A committed source receipt + privately bound owner identity can propose up to 25 candidates at a time. Large diffs and deeper verification require additional reviewed batching; do not pretend partial coverage is complete.
- `workers/infinity-brain-clock/worker.js` invokes that producer only after a **real** `github.commit` tool receipt, while `GITCOIN_CLAIMS_ENABLED=1`. The flag is absent from current production; the owner executor binding is absent; no live GIT candidate or issue resulted from this commit.
- Tests: `test/bubbles-iteration-credit.test.mjs` proves accepted vs observation-only outcomes. `test/gitcoin-claim-intake.test.mjs` checks wrong owner, malformed evidence, duplicate receipt, browser replay, disabled worker route, and synthetic SQLite D1 idempotency with zero awards. `test/gitcoin-diff-evidence.test.mjs` checks actual patch hunk line numbers, filtered generated files, incomplete diff failure, real GitHub API read, per-line pending transport, and Brain's signed owner-only hook.

**Remaining release blockers:** actual verified owner StarQuest → Gitcoin singleton binding (no active binding in latest live readback), reviewer approval of source and line ownership, line history anti-churn reviewer, funding/serial settlement procedure, safe bounded backlog retries, Cloudflare Worker bindings and flags, exact-head security/CI, merged source and live Android evidence. GPT Coin also still requires a separately authenticated model-run issuer; USD Cash Wallet still requires its regulated partner and provider reconciliation. No retroactive minted earnings are inferred.
