# Brain iteration receipts and Bubble Bit credit

A completed direct GitHub operation now has a stable Brain receipt. The existing owner-authenticated conversation lookup issues a short-lived opaque context proof, bound server-side to owner, conversation and the hash of the customer's criteria. The Brain resolves the previously connected wallet recipient; browser input cannot select a recipient.

For supported operations, the Brain stores a private packet containing criteria, actual tool, repository/path/source reference and operation receipt before contacting the existing Unified Wallet service. The internal request uses the existing BOT_WORK_SECRET service credential. An append-only `bubble_bit_credits` row represents exactly one internal Bubble Bit; its receipt primary key makes concurrent retries idempotent. The original StarCoin, Quant, Music Quant and Infinity balances are untouched. A credit has no stated dollar value, spending API or transfer API.

Chat projections share a reducer. They distinguish observed receipt candidates from receipt-matched wallet confirmations; polling and repainting cannot add credits. Pending wallet delivery survives in the Brain and retries on receipt readback and the existing alarm. A pending credit does not rerun GitHub or imply failed source work. A successful workflow inspection is distinct from queued dispatch and deployment.

The actual runtime scope is the existing authenticated owner pilot, using direct GitHub file/repository/code reads, source commits and workflow-result reads. No arbitrary GitHub customer onboarding is claimed. General web/Cloudflare tool settlement, context-lookup rewards, legacy runner per-step ingestion and reusable packet transfers remain separate unfinished work on #1296/#1681. GIT remains the distinct one-verified-line asset on #1675; a Bubble Bit does not issue a GIT.

## Release acceptance

Both Brain and Unified Wallet must explicitly configure `BUBBLE_BITS_ENABLED=1` for credit. It is absent/off by default, including this source change. Require exact-head CI and independent review, then stage both Workers while preserving binding identities and existing secrets. Enable only after the reviewed rollout; verify a real authenticated chat receipt against the same account's wallet credit, replay it without a second credit, and verify a second wallet cannot read or receive it. Record production and Android acceptance separately from source tests. Never change existing owner grants or the APK security hold.

If the flag, schema or service is unavailable, the UI reports the ledger unavailable/pending. It must not manufacture a zero balance or claim payment. Fixture SQLite and mocked service tests are not production deposits.


## Credit activation blockers from independent review

Keep BUBBLE_BITS_ENABLED absent/OFF. The reviewed source may merge in that state, but credit activation remains blocked on (1) atomic receipt/outbox persistence or orphan-pending reconciliation after a retry-queue write failure, and (2) binding the stored criteria proof to the canonical submitted turn/request, including a defined boundary for supplemental untrusted context. Same-session proof reuse with an unrelated request must not claim the old criteria provenance. Independent review reproduced both cases; they are not certified by the default-OFF source checks.
