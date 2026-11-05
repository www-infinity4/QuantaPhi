# Bubble Bits v1 — context-rich work packets and proposed exchange

**Existing work reused:** QuantaPhi Bubble Bits issue #1296; merged Bubbles live action feed #1664; merged candidate receipt projection #1297; GIT line collector draft PR #1675; Termux and signed-attribution draft PR #1679; owner wallet evidence draft PR #1676. This is a source-only packet/reuse extension, not another wallet or chat.

## House and key

**GIT, the key:** one source-code line with repo, immutable commit, path, line number, SHA-256 and builder intent. Operator rule: one GIT per independently verified qualifying newly added line Bubbles builds for a consenting user. Signed job attribution and approved wallet mapping are required. A source receipt is not a license or payout.

**Bubble Bit, the house:** one meaningful criteria-driven Bubbles work iteration with goal, context, tool receipts, test/deployment stage, plain-English result, reusable guidance and related GIT hashes. A Bit may represent substantial technical work; multiple meaningful operations can create multiple candidates, not one Bit per screen redraw.

**GPT Coin:** entirely separate, optional provider-issued system. Users can create analogous records but cannot assert provider issuance. No GPT participation, minting or importer is verified.

A deployment with 73 files tested is an **illustrative** example, NOT a current verified Bubbles result. A reusable Bit could explain stage, proof, and repeatable testing approach without disclosing the prior customer’s private code or account. Recipients must run their own tests.

## Source contracts and no-minting limits

- bubble-bits/work-packet.mjs: createBitCandidate requires independent server adapters to verify customer-scoped context, completed tool receipts and job result. Deterministic per-operation packet identity, status=pending_settlement, walletCredits=0.
- exportBitBlueprint requires independently verified customer share permission plus public_blueprint policy. Exports only safe summary, goal, result, tools and useful tags; excludes customer IDs, receipt IDs, full source and wallet data.
- matchReusableBit is local deterministic tag matching only, not live Quant AI, ownership transfer, execution permission, value or price.
- draftPeerTransfer checks a caller-supplied backend authorization and returns only status=pending_server_settlement, creditsMoved=0. It never pays, debits, issues or transfers real funds.
- bubble-bits/schema.sql defines isolated D1 candidate, evidence, customer sharing grant and transfer-intent tables. No live wallet mutation or settlement occurs. Do not deploy this migration without approved review, identity mapping, and transactional integration.

## Proposed backend lifecycle

1. User consents to scoped Bubbles task; Personal Context retrieved inside the same authenticated tenant.
2. Brain runs actual tools and emits signed distinct receipts with job/operation IDs, acceptance criteria, and verified end state.
3. Quant AI independently checks evidence and creates a human-readable candidate Bit for each meaningful iteration. Repeated receipts or unverified model claims are rejected.
4. GitHub commit diff, code quality, CI and signed Bubbles attribution determine separately the qualifying GIT operator candidates, one award per accepted new code line after real settlement. Customer Bits and operator GITs do not mix.
5. Authorized D1 ledger later settles available/earned/spent with exactly-once writes, anti-replay and account isolation. Candidate status is not spendable.
6. Only after customer opt-in can Quant AI recommend a public reusable blueprint to another user; private source never automatically accompanies the summary.
7. Peer Bit trading or business-to-business GIT trades require signed consent, licensing, legitimate counterparties, agreed value and atomic settlement. No financial value or third-party acceptance is established.

## Cards and releases

QuantaPhi Oracle carousel gains a Bubble Bit example card and an optional GPT Coin explanation card next to the existing GIT Termux Quick Card, plus bubblebit-economy.html. Original source SVG art, readable dark backgrounds and clipboard-only illustrative blueprint; no fabricated commercial ads, credits or tools.

Tests: zero-dependency Node work-packet and card contracts, SQLite schema constraints via Python. Release requires exact-head CI, independent security review, Cloudflare production deployment/readback, Android checks and authenticated cross-customer wallet acceptance. Do not mark issue #1296 complete based on source commits alone.
