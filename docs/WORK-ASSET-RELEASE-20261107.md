# GIT · Bubble Bits · GPT Coin — verified deployment checkpoint (2026-11-07)

## Authoritative live D1 schema readback

- NEW isolated GIT D1 `quantaphi-gitcoin-ledger` (`8fdbe4a2-a1d1-48c6-a188-372f631cd187`): six `gitcoin_*` tables read back successfully after applying the unchanged serialized schema from existing PR #1779. No award or owner-executor enrollment was inserted.
- EXISTING Unified Wallet D1 `infinity-ledger` (`711b3e05-f318-4d30-9a67-4de2af92aa6d`): `bubble_bit_credits` and `gpt_coin_imports` created using the already reviewed source definitions from stacked PR #1703. All previously existing wallet tables and balances left untouched.
- Readback immediately after setup: 0 GIT claims/awards/serials; 0 active verified GIT executor bindings; 0 Bubble Bit credits; 0 GPT provider imports. **Schema creation is not issuance or settlement.**

## Tested source versus production

This focused PR #1824 isolates the wallet presentation and authenticated asset readers from stacked PR #1703, without replaying its unrelated older Brain Worker source. The current main already contains Brain `iteration-credit.mjs`, authenticated direct-GitHub iteration receipt handling, outbox retry and the internal Bubble Bit Wallet route, but the production bindings readback did **not** include `BUBBLE_BITS_ENABLED`. The code must not credit on client-rendered steps, queued tickets, model responses, or repeated polls.

GIT source producer/verification/settlement remains in existing PRs #1675, #1682, #1779, #1679 and #1780. The new GIT database currently has no active owner executor binding. Do **not** infer the wallet ID from a username or transfer customer earnings without signed job acceptance and verified executor mapping. Each eligible new line needs a GitHub/Quant AI provenance receipt and a globally unique serial; replay cannot award twice.

The GPT Coin import is issuer-signed Ed25519 and account-bound. A provider still needs to issue authentic receipts, with separate evidence for GPT work and Bubbles-connected GPT work. The UI must never create GPT credits merely because a conversation or iteration occurred. No issuer identity, private signing key or provider contract is supplied by this source change.

## Safe release sequence

1. Independently review this clean-main PR and its focused signed-issuer, wallet-isolation and Android UI checks; verify exact head and branch-policy status.
2. Stage the Unified Wallet and site revision with a binding-preserving source pin; confirm existing `DB`, `IDENTITY_DB`, `BOT_WORK_SECRET` and all previous secrets still match. Add only the verified `GIT_DB` D1 binding for `quantaphi-gitcoin-ledger` to the Unified Wallet **after** the code is approved. Do not submit a settings update that drops/rewrites any old bindings.
3. Perform owner-authenticated wallet readback: all three assets show source-backed zero/pending/unavailable states and are isolated between different accounts, without changing STARCOIN, QUANT, MUSIC_QUANT, INFINITY or cash.
4. For Bubble Bits only, after staging and signed internal receipt tests, enable `BUBBLE_BITS_ENABLED=1` on both the existing Brain and Wallet Workers using the guarded release path. Verify one real completed tool operation earns exactly one same-account credit; repeat request must not mint again. Confirm failed/queued tools earn none.
5. GIT settlement is a distinct gated backend release after the dependent source PRs reconcile and the already-authorized owner executor wallet is cryptographically verified. No approved production minting or serial allocation yet.
6. GPT Coin may import only independently signed provider receipts after issuer enrollment. ChatGPT conversation access does not imply a provider signer or source-event hook. Verify invalid signatures and cross-account replays are rejected.
7. Final acceptance requires actual Cloudflare version/source/binding readback, production Android 360px browser observation, same-account wallet receipt and a recorded rollback source pin.

Keep this checkpoint with the existing canonical issues #1296, #1674 and the unfinished GIT source PR chain; this is not a claim that release is complete.

## Global GIT serial reconciliation guard (2026-11-07)

A verified line-award record is not itself a serialized issued GIT coin. The authenticated wallet asset reader now credits ONLY GIT awards joined to immutable `gitcoin_serials` by exact `receipt_id` AND `wallet_id`. Missing or mismatched serials are shown separately as `awaitingSerial` reconciliation and **never increase the displayed credited balance**. If the GIT serial schema/binding cannot be read, balance is unavailable rather than fabricated as 0. Pending line claims remain a separate `pending` count. Android wallet labels distinguish pending verification from pending serial allocation; no client operation creates serials.

This source guard cannot mint GIT or substitute for owner/executor enrollment. Existing live Cloudflare GIT schema contains `gitcoin_serials`; source issuance from stacked #1675/#1779, independent review, verified worker binding, and backend readback still require an approved release.
