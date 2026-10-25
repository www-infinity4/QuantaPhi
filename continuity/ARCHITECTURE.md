# Continuity: one system around the State Router

Owner architecture decision, October 25, 2026: the four proposed Continuity concepts belong together. The System State Router is the core. Knowledge preservation, identity and authorization, and chronological evidence are connected services of that core, not separate competing products.

## Core responsibilities

The router maintains durable work identity, current state, dependencies, executor lease, next action, blockers, and references to original requirements. Every transition must preserve owner scope, original instructions, acceptance criteria and evidence references. A saved task is not an executed task.

| Layer | Responsibility | Router contract |
| --- | --- | --- |
| Knowledge preservation | Versioned requirements, research, decisions, source provenance and recovery checkpoints | Resolve referenced context before dispatch; missing context blocks the transition rather than being invented |
| Identity and authorization | Verified owner, scoped delegation, expiry, revocation and per-operation permission | Recheck authority on each privileged operation; stored knowledge and social posts never grant authority |
| Chronological evidence | Ordered events, source commits, tool results, test/review/deploy receipts and observed outcomes | Each transition records its cause and result; requested, queued, executed, merged and live remain distinct |

## Transition contract

A proposed transition carries work ID, owner scope, expected revision, idempotency key, actor/delegation reference, prior state, requested next state, original-context references and evidence references. Server time and a per-work sequence order committed events; retain separately the source's reported time. The server atomically validates revision, permission and evidence before committing state plus event. Conflicts are explicit; retries cannot double-execute. An event log must not claim cryptographic tamper resistance without an implemented verification mechanism.

Completion requires the acceptance evidence for that work type. Source-only work can finish with reviewed source/tests/merge receipts; a published feature additionally requires deployment readback and a real behavior check. Failed execution retains its context and precise blocker. Lease expiry permits controlled recovery, not unconditional replay of an external side effect. Separate prepared, attempted, confirmed and uncertain external effects and reconcile uncertain effects before retry.

Knowledge is stored before it is synthesized: each research action first produces an owner-scoped source/history entry, then derived conclusions link back to those entries with uncertainty and contradictions retained. Preserve private content outside public repositories. Export and restore must preserve links and event identity, with access revalidated on import.

## Reconcile existing implementation

- `/continuity/` already supplies the local project/task/checkpoint workspace and portable snapshots. Browser-local persistence is not the authoritative multi-user router.
- PR #1049 proposes owner-authenticated Brain backlog snapshots. Reconcile it with this core; a read-only inventory is not a dispatcher or completed execution.
- Existing Brain work IDs, D1/DO identities, signed server conversation and scoped owner routes should be reused. Do not introduce a second queue, replacement wallet or independent permission system merely to satisfy this document.
- The technical-handoff repair in PR #1047 preserves original instructions and acceptance in child repairs. Keep that invariant throughout router recovery.

## Implementation acceptance

1. Inventory current deployed router/store and existing Continuity PRs before changes; pin source and runtime versions.
2. Implement the authoritative transition/event transaction in the existing owner store, with expected revisions, idempotency and owner isolation.
3. Connect knowledge references and research-before-synthesis history; prove recovery preserves context and provenance.
4. Enforce expired/revoked/wrong-owner delegation failures without state mutation.
5. Test duplicate requests, competing workers, interrupted writes, uncertain external effects, restore/import, failed tests and merge-without-deploy cases.
6. Verify one bounded owner-authorized task from original request through actual tool execution and acceptance evidence. Report source, deployment and physical-device checks separately.

This document records the architecture and acceptance plan. It does not implement or deploy these remaining services, connect continuity.org DNS, or authorize new payments or account access.

## Integration finding: preserve the existing workspace

Review of open PR #1049 on October 25 found that its proposed `continuity/index.html` and `continuity/README.md` occupy the same paths as the already merged PR #1050 workspace. Do not resolve that conflict by replacing the working workspace. Keep the local notebook/export/recovery app at `/continuity/`; mount the authenticated backlog separately at `/continuity/owner/` (with correctly relative asset paths) and expose a clear navigation link only after browser verification. Keep its read-only projection module and existing Brain owner gate; reuse `/work/run-next` for authorized execution. The new pure router must not be connected to that endpoint until a server-owned work-state mapping and atomic state/event transaction are implemented and tested.

Reconciliation acceptance: both views remain usable; existing notebook data/export/import survives; unauthenticated requests cannot access owner tickets; the owner backlog covers more than 100 tickets through pagination; recorded completion claims remain distinguished from independently verified delivery. PR #1049's current UI/README path conflicts must be resolved before integration. This finding does not establish that the proposed endpoint is deployed.
