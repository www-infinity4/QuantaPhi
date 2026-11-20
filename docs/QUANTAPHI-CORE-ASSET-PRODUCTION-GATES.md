# QuantaPhi core asset: production architecture and gates

Design review · October 28, 2026. **Not deployed.** This document and its standalone SQL are not proof of a running Cloudflare queue, eBay authorization, token minting, registered IP, or a dollar appraisal.

## Four integrated systems

**QuantaPhi quick cards:** one primary real function per card; mobile-safe Share, Collect, Build and provider handoff. Do not pretend that signed-in third-party interfaces or credentials are copied.

**Quant AI Power Chain:** explainable intent -> selected allowlisted sites -> bounded async checks -> attributable source receipts. Existing design-lab/power-chain-core.mjs already checks up to 40 domains, at most four public-index searches in parallel. It does **not** log into or directly visit 40 websites.

**Wallet and quant accrual:** existing Unified Wallet, Quant ledger and D1 identity sources remain authoritative; routing metadata is NOT a cryptocurrency mint, Star Coin credit, transfer or spendable asset. Only an audited, wallet-authorized, idempotent ledger event can change balances.

**Owner-scoped context:** preserve session profiles, evidence pointers and job status without leaking data or auth across owners.

## D1 ownership and isolation

Proposed source: design-lab/tenant-context-schema.sql. Deploy only to a separately approved routing D1. It does not modify existing wallet, memory or identity DBs.

| Table | Constraint |
|---|---|
| qp_context_profiles | Composite owner_id + profile_id primary key |
| qp_context_sessions | Owner/profile-scoped FK, digest pointer only |
| qp_route_jobs | Owner/job primary key, owner-specific unique idempotency key, owner/profile FK |
| qp_route_targets | Same-owner and same-profile composite job FK, unique position and up to three attempts |
| qp_route_receipts | Same owner/profile/job FK; unique idempotency; UPDATE and DELETE rejected |

D1 supports foreign keys within one database, **not** across separately bound wallet and routing databases. The Worker must verify real credentials with the authoritative identity service, derive owner_id from authentication rather than user-supplied JSON, and scope EVERY read/write by owner/profile. Schema FKs do not implement SELECT authorization.

No raw chat transcript, provider password, cookies, financial credentials, OAuth bearer token or API secret should be recorded. A SHA-256 content digest is an integrity pointer, NOT encryption. Database triggers prevent ordinary receipt edits; they do not guarantee legal priority or protect against privileged database replacement. For independent provenance, add signed hashes and external retention checkpoints.

## Durable Power Chain worker plan

1. Verify owner, selected circuit and consent. Compute an idempotency key from authenticated owner, action and a bounded request identifier.
2. In one transaction, insert the queued job plus its targets. Return job ID and queued status, not premature completion.
3. A background Worker/queue consumes small batches with leased claims and atomic status changes; enforce per-domain caps, retries with backoff, timeouts, max outstanding per owner, cancellation and circuit breakers.
4. Save matched/empty/error results as owner-scoped receipts, with checked-at timestamps and validated source domains. An interrupted request remains pending/unknown until evidence proves its outcome.
5. Replays return the same job, never duplicate Quants, credits, website follows, purchases or external side effects.

The current 40-target limit stays in the design. A 1,000-domain distributed queue needs additional cost/security review and must not be represented as already live.

## eBay quick card: realistic first release

Render native searchable results in QuantaPhi using verified links, original listing information from permitted sources, first-action-above-the-fold controls, and original-site checkout handoff. Do not assume eBay allows iframe embedding or shared signed-in browser sessions. Native Browse API use requires eBay application access; the Buy / Order API and checkout can require special production approval. Without such approvals, show **Open on eBay**, not a false in-card payment form.

Relevant code: quanta-card-provider.mjs; quanta-card-live-source.mjs; docs/UNIVERSAL-QUICK-CARD-CONTRACT.md; docs/SHOP-AD-PHI.md.

Provider requirements: https://developer.ebay.com/api-docs/buy/buy-requirements.html
Cloudflare D1 foreign keys: https://developers.cloudflare.com/d1/sql-api/foreign-keys/

## Production asset valuation evidence

Record source ownership and permitted licenses, code history and signed releases, working deployed SHA, measured uptime and latency, active users, revenue and costs, audited mint evidence, data protection, original media rights, support burden and maintenance costs. Distinguish designed -> local-test -> CI-pass -> reviewed -> deployed -> production-verified. Token balances alone are not audited revenue, liquidity or enterprise valuation.

## Engineering release gates

- Run node --test test/design-lab-power-chain.test.mjs test/design-lab-tenant-context.test.mjs.
- Test cross-tenant *reads* at Worker/API level, not only SQL write constraints; verify authentication, session expiry, origin rules, secret storage and revocation.
- Keep PR #1193 and PR #1195 separate and draft until tests/review; address issue #1190 Android 320/360/393px controls, network requests, long tasks, software keyboard, carousel ANR and Bubbles timeouts.
- Confirm no copy of third-party account credentials, unsupported iframe mirroring or unauthorized checkout.
- Perform a separately reviewed migration before any routing D1 release. Do not apply to the live wallet, merge unreviewed changes or represent the proposal as already published.

Priority: P0 tenant isolation and evidence -> P1 server queue and reliability -> P1 mobile quick-card usability -> P2 authorized eBay product data -> P3 multi-hundred/thousand target scale after budgets and review.
