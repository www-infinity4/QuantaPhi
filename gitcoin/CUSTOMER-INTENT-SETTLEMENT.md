# Customer requirements → GIT Coin → executor wallet (source milestone)

**Purpose.** Reward useful, requested engineering outcomes rather than indiscriminate code generation. This builds on draft GIT Coin PR #1675 and Bubbles executor wallet issue #1674. **No live issuance or cash redemption is enabled by these source files.**

## Customer-first earning flow

1. A real, authenticated customer submits a written request. Bubbles' wallet-scoped Personal Context can help clarify preferences, but is not proof of consent to financial activity.
2. The server issues a narrowly scoped customer agreement: a verified customer ID, repository, purpose, provider (Bubbles/GPT/Copilot/human), `requestHash` of accepted requirements, an explicit recipient wallet, signed consent receipt, and expiration. Customer cannot write the payee into an arbitrary submitted claim and cannot be silently charged. The permitted payout is shown before the job starts.
3. A signed GitHub/Brain job links the provider to the customer and their repo. The code must accomplish the customer acceptance criteria; a robot having a conversation, turning a control, polling another agent or rewriting lines for its own sake earns **zero**.
4. GitHub confirms the immutable diff, default-branch inclusion and successful CI. Quant AI independently approves useful non-duplicated changed lines. The customer explicitly accepts the result **for that exact commit and unchanged requirements**.
5. `evaluateCustomerJob` cross-checks the signed grant, customer acceptance and provider attribution. `planAcceptedGits` yields one GIT candidate per approved added line. A grant for Bubbles cannot be reused for Copilot or GPT; independent providers need their own signed agreements and wallets. The executor account may receive Bubbles credits only when the actual customer-approved grant and signature name that recipient.
6. `postVerifiedCustomerGits` uses the **isolated GIT D1** with unique receipt IDs, writes candidate claim/award/acceptance links in a D1 transactional batch, and reads the rows back to reject wrong-wallet, missing or conflicting attribution. This is an internal server-only function, **not a public credit route**. Cloud wallet spendability requires a separately verified deployment and account mapping.

The engineering award is **not** a dollar, guaranteed income, an automatic debit from customers, or a claim that Microsoft, GitHub, OpenAI or any third party recognizes GIT. No line should be credited twice to different payees.

## Install/release constraints

- Phase 1 base: `gitcoin/schema.sql` from PR #1675; then add `gitcoin/customer-contract-schema.sql` in the same isolated D1. Do not run either migration against the original Unified Wallet or Fred's ledger.
- The trusted caller must implement `contracts.verifyGrant` and `contracts.verifyAcceptance` against signed durable server records; `github.resolveAttribution` must authenticate job/provider signatures; `quantAI.review` must review real code. In-memory test adapters are intentionally not production backends.
- Require genuine customer consent to access each repository and to the intended payment policy. Revocation, customer rights, provider rights and business-payment obligations need separate review.
- Include replay/duplicate, concurrent jobs, off-default commits, failed CI, rejected quality, malicious beneficiary, revoked consent, account isolation and acceptance-altered-after-commit tests before launch.
- Never present a GIT award row as spendable until a logged-in GIT wallet balance/settlement endpoint verifies it. Never conflate with Quants, Bubbles Bits, StarCoins, Fred creator revenue or cash.
- Audit historic original-card StarCoin receipts against the real original ledger without retroactively minting missed clicks. A clicked card is an observation, not an earned paid action unless a funded reward rule and a settled payment receipt exist.

## QuantaPhi expansions suggested by the customer-first rule

**Intent → acceptance compiler.** Turn a customer's plain-language request into a compact human-reviewable contract, with a linked test and an easy way to say the result is useful. This supplies the human value test that pure line counting lacks.

**Discoverable Media Star radio lane.** Give every authorized creator a simple public card profile and rights-confirmed media source, publish only after consent, and match opt-in interest tags (e.g., football searches) to football-themed cards. Surface an in-page player *only if embedding/audio rights allow it*. An unrelated profile/search or a fabricated Fox affiliate must not be presented as a licensed live station.

**Media Star earnings audit.** Show views, observed clicks, unlocked content, paid conversions and genuine StarCoin payout receipts in distinct columns. A verified purchase/payout creates a credit; ordinary clicks cannot. Audit historic original cards for missing linked payouts without guessing or minting replacements.

## Checkpoint

Branch: `feature/gitcoin-executor-customer-contract-1674` based on `feat/gitcoin-verified-line-receipts-20261104`.
Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1674
Related: https://github.com/www-infinity4/QuantaPhi/pull/1675 and https://github.com/www-infinity4/QuantaPhi/pull/1676
Tests: `node --test test/gitcoin-*.test.mjs` (CI still required).
Status: source milestone only, no owner lease, no proof of outside customer use, no live Cloudflare deployment, no guaranteed payment or credited balance.
Next single action: pass exact-head CI and independent security review before connecting the authenticated provider/customer grant service.
