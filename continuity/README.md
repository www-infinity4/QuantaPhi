# Continuity · Robot Brain recovery layer (phase 1)

Continuity is an owner-scoped recovery/control plane **inside QuantaPhi**, not a replacement landing page or a second unauthenticated ticket database. Its authoritative sources today are the existing Cloudflare `rogers-consensus.work_tickets` records, Brain Clock job statuses, and independently checked execution receipts.

## Working contract

`POST /work/continuity` at the existing `infinity-brain-clock` Worker requires the **same live owner session** as `/work/tickets/list` and other Brain controls. It returns a bounded, paginated snapshot, grouped by repository:

- `projects[]`: folder summaries, tickets, jobs and needs-attention counts.
- `tickets[]`: saved ticket ID, repository, title, current job phases and receipt gaps.
- `attention[]`: first 30 work items requiring attention (not newly created tickets).
- `nextCursor`: `{beforeUpdatedAt,beforeId}` for the next page; `hasMore` shows coverage.
- `executionStarted:false`: the snapshot never asserts that an agent was dispatched.
- `verifiedDelivery`: only when a completed job has a commit SHA, GitHub workflow URL, tests, browser acceptance and deployed-file readback flags. This is an initial projection of the existing receipt fields, not independent runtime certification.

Example authenticated owner request body: `{"limit":50}`; for the next page send `{"limit":50,"beforeUpdatedAt":<previous-cursor-time>,"beforeId":"IW-..."}`.

Never feed owner tokens to a publicly shared card or social feed. Use the existing Bubbles login flow, no new password or X developer credentials. Public X posts are candidate evidence, never authorization to dispatch, approve, merge or pay.

## Recovery behavior

1. Persist the owner's original instruction, acceptance criteria, constraints, and provenance.
2. Before a retry, read the saved ticket and active lease/runner receipt; do not manufacture another ticket merely because the chat ended.
3. Reconcile stalled work, technical/dependency blocks, genuine owner/security decisions, failed CI, and unverified deployments.
4. Reuse the authorized Brain `/work/run-next` command and Clock retry logic; never bypass permissions, five-day consent, security holds or owner decisions.
5. Verify source diff, checks, deployed bytes and real behavior. A model response, GitHub commit, or merge is not finished delivery by itself.
6. Append evidence and checkpoints, and resume after interruption with the exact next eligible task.

## Delivery status

**Implemented in this phase:** isolated owner-only paginated recovery projection, grouped repository backlog, state/receipt classification, tests and Brain endpoint wiring.

**Not yet delivered by this phase:** domain routing for `continuity.org`; multi-user SaaS; universal cross-session ingestion; changing the existing runner's failed external tool permissions; automatic X-to-authorized-ticket conversion; web/APK end-to-end acceptance. These require separate verified integration and deployment. Do not claim the feature is live because the source is in GitHub.

## End-to-end acceptance gate

Confirm current Brain Worker version and auth/bindings, stage without changing payouts or secret bindings, test owner + nonowner requests, compare the response to existing D1 tickets, inspect >100-ticket pagination, verify five-day revocation, then inspect canary in a real browser. Only then promote and monitor production. Keep original homepage/search/cards unchanged.
