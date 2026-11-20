# Bubbles Pulse, robot control, Bubble Bits, GPT Bits and Gits

**Source:** Owner's November 4, 2026 description of a heart-rhythm pulse, Cloudflare coordination, visible real work iterations, and a three-tier bit economy. **Canonical work issue:** https://github.com/www-infinity4/QuantaPhi/issues/1296 ; live engineering execution issue https://github.com/www-infinity4/QuantaPhi/issues/1192 .

This records the owner's proposed design and claimed authorship of the **Gits** idea. It does not independently prove intellectual-property ownership, grant rights over GitHub or other organizations' systems, establish monetary value, or imply that unrelated AI companies adopted the proposal.

## From song metaphor to engineering contract

- **Heart / drum = heartbeat:** a monotonic, bounded work-session pulse: owner-authenticated intent → context → pending ticket → verified tool start → signed result → next eligible step. It shows activity *only when evidence arrives*. A periodic Cloudflare alarm without a job claim is a scheduler wake-up, **not** completed work or minted Bit.
- **Clouds above = Cloudflare orchestration:** Cloudflare Worker routes authenticated commands, Durable Object retains job lease/fence/replay state, D1 stores durable ticket/result snapshots, Workers AI or explicitly authorized external providers may generate plans, and signed GitHub Actions/Cloudflare adapters perform only permitted work. The frontend never holds GitHub or Cloudflare keys.
- **Yellow lemon drops = resolving trouble:** record the typed error, isolate the failed step, repair/test it, retain history, and reroute when justified. Never erase unverified blockers, hard security holds or failed records merely to make the UI green.
- **Blue bird = communications:** authenticated events and opt-in connectors (social platforms included when their real APIs are connected). A Twitter/X handle, posts or an inferred thought are **not** permission to read a person's mind or act on their behalf. Social publication requires separate authorization and confirmed result.
- **Wishing on a star = a specific goal:** an owner's requested task with acceptance criteria, not an executable command until approved by the owner grant and work queue. Verified progress must eventually carry a commit, CI, PR and deployment readback where relevant.
- **Phil Collins / walking robot rhythm = local motion control:** a physical robot needs a genuine local master timing/control unit, motion feedback, bounds, emergency stop and a watchdog. The Cloudflare pulse can **request high-level motion** but must never replace real-time local motor timing or directly drive motors over a jittery internet connection. No motor is claimed to be connected yet.

## Three conceptual tiers — no fabricated asset settlement

| Tier | Proposed purpose | Evidence | Current status |
| --- | --- | --- | --- |
| **Bubble Bit** | A user-criteria-specific visible operation (e.g. read GitHub, search, query D1, review status). User-facing spendability is a proposed separate backend policy. | Unique owner-scoped operation and real tool receipt; never mere chat text or each redraw. | Observation-only counters today; **zero automatic wallet minting**. |
| **GPT Bit** | A proposed user-facing usable credit for model assistance; separate from Bubble Bits and technical work. | Authorized model-service receipt and a separately approved, idempotent credit/debit ledger. | **Design proposal only**; no existing cross-provider asset or exchange is verified here. |
| **Git / Gits** | Owner-proposed higher-tier measure of verified code-building/technical contribution, potentially retained by the developer/operator rather than given away with the user interface. | Signed commit/PR evidence, independently reviewed diff and eligible net contribution. Prevent mass additions/reversions, duplicate hashes, generated boilerplate or code churn from minting rewards. | **No monetary minting, pricing, exchange or third-party adoption implied.** Ownership and legal rights require evidence and appropriate agreements beyond a counter. |

**A line in the visible iteration feed is one step of user-understandable evidence, not one spendable Bit.** A stack trace, repeated 15-second poll, log replay, deployment announcement or a model's claim must never trigger automatic payment or Gits. A single verified operation can create an observation while an independent ledger decides whether it qualifies for a real credit.

## Technical pulse / iteration format

Every actual step should have: `ownerSession` (server-bound, never client-controlled entitlement), `ticketId`, `jobId`, `operationId`, `criteriaKey`, `kind`, `phase`, `sequence`, `receiptId`, `evidenceUrl` (allowlisted), `timestamp`. Derive the state from the authenticated Worker/job/event store. A failed or pending step is never displayed as deployed or fully verified.

The Bubbles UI remains a *projection* of these records. Its expanded tool names include GitHub commit, test checks, merge, Cloudflare Worker stage/deploy/readback and signed Brain runner receipt. Client-side events and their receipt strings are still **not standalone proof of credentialed execution**; a production-grade server-authoritative event stream, signatures/dedupe, session isolation and direct deployment readback are still required.

## Minimum acceptance proof

1. The owner gives one signed Bubbles request with clear acceptance criteria. Cloudflare confirms consent and records an owner-partitioned task.
2. Brain's server reports a real lease claim rather than `eligible_but_not_claimed`, and each task's prerequisite has a verifiable receipt or typed blocker. The heartbeat is alive when it changes a **real** state.
3. The runner produces an actual source diff, focused tests, a reviewable GitHub PR and the correct result in the *same* Bubbles thread.
4. A separate release gate validates exact production version and bindings, confirms Cloudflare deployment, and preserves rollback. Android owner UI displays the matching stages and keeps draft text/music continuity where applicable.
5. No payment/Gits/Bit balance changes unless an independently authorized D1 transactional ledger and anti-replay policy have passed dedicated acceptance tests.

Existing pending work: issues #1192 and #1296. This proposal does not bypass owner auth, hardware control, old backlog security holds or subscription/license requirements of external providers.
