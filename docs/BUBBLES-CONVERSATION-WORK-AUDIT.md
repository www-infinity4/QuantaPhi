# Bubbles conversation-to-work audit (owner only)

**Status:** source implementation for a read-only discovery stage. Not a production deployment, a ChatGPT owner-chat connection, or an autonomous publisher.

## Existing interface

Use the wallet-verified Robot Brain `/owner/conversation` operation, shared by the canonical Bubbles website and original APK. With that existing authentication, request:

```json
{"mode":"work-audit","limit":100}
```

For a longer history, the same verified owner can use the **read-only multipage operation**:

```json
{"mode":"work-audit-sweep","limit":150,"pages":4}
```

A sweep scans at most **four owner-partitioned pages**, each at most 250 user turns (up to 1,000 total), and groups repeated requests across those pages. `mentions` counts matched owner turns even when `evidence` is capped at 12 short newest source excerpts. `messagesScanned` and `pagesScanned` report the actual scan. Follow `nextCursor` with another sweep when necessary; candidate groups from sequential sweeps can be reconciled using `combineAuditCandidates`, while preserving the newest twelve excerpt IDs and not resubmitting jobs. A sweep **does not** import private ChatGPT/Gemini files or perform actions. Each response remains behind the existing authenticated wallet owner boundary.

Read `candidates` and follow `nextCursor` as `beforeAt` and `beforeId` to scan more messages. The backend selects only archived `role='user'` messages in the **server-derived owner** partition with D1 keyset pagination (maximum 250 rows/page). It groups requests by known topics, retains message IDs, date and bounded excerpts, and preserves negative instructions as constraints. Candidate repository names are **suggestions**, not verified routing, and the classifier can miss novel topics or nuanced contexts.

All results stay behind the existing owner authorization. No private history is written to GitHub, shared with an AI provider, or appended to public CI artifacts. The endpoint creates no jobs, authorizations, git commits, PRs, or releases. Assistant prose or a claimed prior completion is not a receipt.

## Next autonomous stage

1. Continue paging the owner archive; reconcile candidates across all pages and with existing jobs. Retrieve full messages through `sessions-get` when a short excerpt is insufficient. Bubbles already has an explicit in-browser ChatGPT/Gemini history importer into private BubblesMemory; **that is a separate store** and its imported records are not automatically present in the Brain `bubbles_messages` archive. Any bridge must be explicitly owner-authorized, idempotent, source-attributed, and account-isolated.
2. Inspect each proposed repository via **existing owner-authorized GitHub tools**, reading exact files, READMEs, open and merged PRs, issues, workflow runs, and last successful deployments. Discover ambiguities rather than choosing an arbitrary repository.
3. Compare source to the current owner requirement; resolve later corrections and negative constraints, and never promote an example, an assistant answer, or a quoted instruction into an authorization.
4. Deduplicate planned work against completed, blocked, or in-flight tickets. Offer eligible plans through existing owner Run All approval; no automatic self-approval or expansion of scopes.
5. Submit scoped jobs through established Robot Brain adapters only when already authorized; collect separate evidence for writer completion, Pink review, commit, PR, target CI, deployment and real browser/device interaction. `queued_for_runner` never means finished.

## Test and acceptance

New tests cover owner-only archived-message selection, pagination beyond the recent-64 window, duplicate requests, constraints, uninvolved projects, assistant-claim exclusion, and independent test/deployment receipts. Run `node --test test/bubbles-conversation-work-audit.test.mjs` and existing Brain/conversation suites. A live wallet-authenticated Bubbles owner-chat audit remains an independent acceptance gate after deploying the actual Worker revision.

## Priorities found in the October 2026 owner work

- ChatGPT ↔ Bubbles/Robot Brain owner delegation (issue #872); signed server conversation alone is not owner-archive control.
- Memory/history import, topic association, and verified code-coverage comparisons.
- Self-building GitHub agent pipeline: repo discovery → verified diff → tests → PR → deploy → live interaction evidence.
- Android APK/website shared sessions, natural voice, native recording and screen interactions.
- Infinity Radio uninterrupted playback, site-card working controls, and verified wallet/commit receipts.

These are owner requirement categories, not verified claims that particular repos are incomplete. Inspect current source and receipts before acting. Never publish private transcripts or secrets in this public repository.
