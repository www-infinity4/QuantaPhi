# Brain iteration receipts and Bubble Bit credit

A completed direct GitHub operation has a stable Brain receipt. For a direct engineering turn, Brain looks up the owner archive using the canonical request that the server tool runner executes. The packet binds the owner, conversation, request ID, selected repository, criteria and a hash of any supplemental observations. Image observations and source hints remain separate evidence. Brain takes the recipient from its verified wallet connection.

For supported operations, the Brain stores a private packet containing criteria, actual tool, repository/path/source reference and operation receipt before contacting the existing Unified Wallet service. The internal request uses the existing BOT_WORK_SECRET service credential. An append-only `bubble_bit_credits` row represents exactly one internal Bubble Bit; its receipt primary key makes concurrent retries idempotent. The original StarCoin, Quant, Music Quant and Infinity balances are untouched. A credit has no stated dollar value, spending API or transfer API.

Chat projections share a reducer. They distinguish observed receipt candidates from receipt-matched wallet confirmations. Brain saves the pending receipt and retry entry in one durable write. Receipt readback and the existing alarm retry wallet delivery using the same ID. GitHub runs once for the saved request. Workflow inspection, dispatch and deployment each have distinct receipts.

The runtime scope covers the existing authenticated owner pilot and direct engineering turns with actual GitHub file, repository and code reads, source commits and workflow-result reads. Customer onboarding, web and Cloudflare tool settlement, context-lookup rewards, legacy runner ingestion and reusable packet transfers remain open on #1296/#1681.

## Release acceptance

Both Brain and Unified Wallet must explicitly configure `BUBBLE_BITS_ENABLED=1` for credit. It is absent/off by default, including this source change. Require exact-head CI and independent review, then stage both Workers while preserving binding identities and existing secrets. Enable only after the reviewed rollout; verify a real authenticated chat receipt against the same account's wallet credit, replay it without a second credit, and verify a second wallet cannot read or receive it. Record production and Android acceptance separately from source tests. Never change existing owner grants or the APK security hold.

If the flag, schema or service is unavailable, the UI reports the ledger unavailable/pending. It must not manufacture a zero balance or claim payment. Fixture SQLite and mocked service tests are not production deposits.


## Unified Wallet work assets

The authenticated wallet state reads GIT awards and pending claims from the separate `GIT_DB` binding using the account's linked ledger wallet ID. It reads settled Bubble Bits using the account ID. Pending wallet delivery and missing ledgers remain distinct from confirmed holdings.

GPT Coin uses the `GPT_COIN` wallet code. The optional provider import accepts a JSON object with `receipt` and base64url `signature`. Configure `GPT_COIN_ISSUER` and the issuer's raw Ed25519 public key in `GPT_COIN_ISSUER_PUBLIC_KEY` only for an authorized provider. The signed UTF-8 JSON array is `["quantaphi:gpt-coin:v1", issuer, receiptId, recipient, amount, issuedAt, expiresAt]`. The receipt has version 1, asset `GPT_COIN`, the listed fields, and millisecond dates. The signature and the wallet's authenticated account must agree before the immutable ledger accepts it. Import retries use the same issuer and receipt ID. Existing imported holdings remain visible while new imports are paused.

This revision addresses the two source findings from the previous credit review. Activation still requires independent review and the live acceptance above. GIT settlement and a GPT Coin issuer each have their own deployment dependencies.
