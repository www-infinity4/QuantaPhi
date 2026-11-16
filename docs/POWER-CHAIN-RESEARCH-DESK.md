# Power Chain research desk · source-only implementation contract

**Canonical ticket:** [QuantaPhi #1330](https://github.com/www-infinity4/QuantaPhi/issues/1330). **Source inspiration:** [Lumix X post](https://x.com/lumixsv/status/2122010671445328164) and accessible public posts describing small specialist teams, a single controlled executor and readback checking. Direct X post retrieval was blocked during this session; this document adapts the general architecture, not a verified verbatim transcription of that particular video or any third-party proprietary prompt.

## Purpose and boundaries

Adapt the *separation of responsibility* from multi-bot trading desks to the existing Infinity Power Chain **research and sourcing** workflows. No trading logic, funds access, exchange integration, automatic orders or payment authority is imported. Reuse `design-lab/power-chain-core.mjs`, `design-lab/cooperative-power-chain.mjs`, Moltnook's signed repository runner and the current QuantaPhi Oracle Quick Cards. This is **not** a new autonomous bot service.

The useful principle: **the specialist that recommends an action must not be the same authority that executes it**. A verifier/veto must check evidence and permissions before any externally visible action, and a readback must compare actual result to the approved intent. Multiple independent **read-only** research tasks can operate concurrently; only one lease-bound writer/cursor should mutate a shared browser/repository session at a time.

## Five specialist seats and existing color routes

| Seat | Existing desk | Required output | Cannot do |
| --- | --- | --- | --- |
| Scanner | Red | Public-index source candidates, URL, query, scan timestamp, actual checked count | Pretend a page was fetched or a merchant quote received |
| Analyst | Blue | Allowlisted domain and source provenance, deduplicated evidence, exact variant identifiers where available | Treat index snippets as confirmed prices, scientific facts or stock |
| Chief | Bubbles / GPT Purple | A single owner-scoped research question, priorities and cited alternatives | Grant an execution lease or approve payment |
| Veto | Pink + Black release evidence | Reasoned refusal on unsafe URL, thin/missing evidence, stale source, conflicting actions or permissions | Be bypassed by a model narrative |
| Executor | Green via existing signed runner | A bounded, authorized tool invocation and real readback, each with job ID/lease/cursor lock | Self-authorize checkout, trading, wallet access, owner grant changes or deployment |

Orange is invoked **only** for a real choice or conflicting evidence. Do not create one artificial child process for every seat; these are roles in the existing Bubbles system unless actual model/tool receipts prove workers were invoked.

## Research handoff

1. An explicit user research request is turned into the existing `planChain` allowlisted public-index circuit. The scanner runs `runPowerChain`, retaining exact source count, failures, aborts and observed timestamps.
2. `reviewPowerChainResearch(plan, receipt)` validates the plan against the current source registry, checks each completed target, revalidates domain-bound HTTPS links, removes duplicates and rejects unsafe rows. It returns either `research_discovery` or `blocked` with reasons. Its evidence label is **public_index_links_only**; it never verifies factual claims or merchant quotes.
3. Chief may summarize candidate sources as leads. A second stage must actually read permitted original pages and assess source independence, freshness and claims before describing an assertion as corroborated.
4. Veto must block stale, unsafe, source-mismatched, incomplete or conflicting actions. Escalate unsupported provider access or missing owner consent rather than replacing with a fabricated receipt.
5. Any future browser or repository action requires the *existing* authenticated, job-scoped, lease-bound executor and one shared cursor/writer per session. Pre-action verification checks action type, exact URL, source, current page, intended quantity and owner consent; post-action readback checks the observed result before another action. `compareResearchReadback` provides only a **pure comparison**, not a browser click or new permission.
6. For Power Chain product research, the external provider must supply a current legitimate SKU/variant price/stock/shipping quote before the existing quote comparison can call it verified. Voice-saving, source discovery and research-vetting are not purchase consent. All final payment actions remain behind separate explicit owner/user approval and merchant receipts.

## Next engineering slices

- **S1 in this PR:** source-only five-seat registry, conservative deterministic evidence/veto checker and readback comparison with Node tests. No existing UI or scheduler modified.
- **S2:** connect the checker to the existing Power Chain Design Lab result path, showing **discovered / needs verification / blocked** without cluttering the Oracle 320/360/393px Quick Card. Record actual scan status, never simulated bot motion.
- **S3:** use authorized source readers for original product/research pages, with explicit citation timestamps, variant matching and contradictory-source handling. Never invent a price or scientific result from two search snippets.
- **S4:** enforce one actual cursor/writer with a lease and action readback in the *existing* Bubbles signed runner, not a parallel automation engine. Two conflicting actions must serialize; duplicate retry must not repeat a purchase or source write.
- **S5:** exact-head GitHub CI, independent reviewer, guarded merge, production readback and physical Android verification. Check source, CI, merge, deployment and user acceptance separately.

## Tests and proof

Focused command: `node --test test/power-chain-research-desk.test.mjs`. Check source code behavior on both good and malicious source URLs, duplicate links, stopped/partial searches, forged targets, zero-result receipts, and a mismatched readback. Run adjacent `test/design-lab-power-chain.test.mjs` and `test/cooperative-power-chain.test.mjs` under CI when merged with the real repo, then the repository's broader required checks.

A green unit test means **the source contract passes its fixture**, not that five running bots, live browser clicks, merchant integrations, trades, purchases, Cloudflare deployment or Android acceptance happened. Receipt labels must preserve this distinction.
