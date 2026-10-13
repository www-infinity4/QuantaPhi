# Group Build Topic & Source Import Proposal

## Purpose and scope
This document proposes a privacy‑first, auditable workflow for importing **opt‑in submitted context** (user‑provided topic lines, source URLs, citations, etc.) into the Group Build system. The goal is to enable collaborative story rooms that can reference verified external sources while respecting the strict concurrency, attribution, and privacy rules outlined in `docs/GROUP_BUILD_BRAIN_BRIEF.md`.

## Definition of “opt‑in submitted context”
* **Opt‑in** – The user explicitly clicks *Submit* in the pre‑room typing lobby. Only after this action is the text considered for import.
* **Submitted context** – The final text the user submitted, any attached source URLs, timestamps, and optional author pseudonym. Raw unsent drafts are never stored beyond the client session.

## Step‑by‑step source ingestion workflow
1. **Validation** – When a submission arrives, the server validates:
   - Non‑empty text.
   - Each attached URL responds with HTTP 200 and a `Content‑Type` of `text/html` or `application/pdf`.
   - The URL is not on a blocked‑domain list.
2. **Provenance capture** – For every URL we store:
   - `url`
   - `fetched_at` (ISO‑8601 timestamp)
   - `title` (extracted from `<title>` or PDF metadata)
   - `author` if available in meta tags.
3. **Storage** – The validated submission and its provenance are written atomically to the `group_stories` table (see `workers/group-stories/schema.sql`).
4. **Acknowledgement** – The client receives a receipt containing the story‑room ID, submission ID, and a hash of the stored record for later verification.

## Privacy safeguards
* **No raw unsent text** – Drafts that never reach the *Submit* button are kept only in the client’s memory and are discarded after a configurable inactivity timeout (default 5 minutes).
* **Minimal metadata** – Only the fields listed in *Provenance capture* are persisted. No IP address, user‑agent, or session identifiers are stored beyond the short‑lived authentication token used for the write.
* **Expiration** – Submissions older than 30 days are archived to a read‑only bucket; the live `group_stories` table retains only the most recent 10 versions per story.

## Attribution model
* The original author’s chosen pseudonym (or “Anonymous”) is stored alongside the text.
* Each revision keeps a `parent_id` linking to the previous version, enabling a full edit history.
* When a source URL is attached, the citation appears in the manuscript as `[[source-id]]`. The `source-id` resolves to a footnote containing the captured provenance.

## Concurrency handling
* **Optimistic locking** – Each story row includes a `version` integer. Updates include the expected version; a mismatch triggers a retry with the latest version.
* **Merge‑conflict avoidance** – If two users submit to the same room within the same transaction window, the server serialises writes using a per‑room mutex (implemented in `workers/group-stories/worker.mjs`).
* **Idempotent retries** – The client includes the receipt hash on retry; the server recognises duplicate submissions and returns the original record without creating a new version.

## Error handling & retry semantics
| Situation | Response | Client Action |
|-----------|----------|---------------|
| Validation failure | `400 Bad Request` with JSON error details | Show user the specific problem (e.g., unreachable URL) |
| Provenance fetch timeout | `504 Gateway Timeout` | Retry after exponential back‑off |
| Version conflict | `409 Conflict` with latest version payload | Re‑fetch story, merge locally, and resubmit |
| Unexpected server error | `500 Internal Server Error` | Show generic error, allow manual retry |

## Alignment with existing Group Build architecture
* **`group-story.js`** – The front‑end will call the new `/api/submit-topic` endpoint; the response format matches the existing story‑room JSON schema.
* **`workers/group-stories/worker.mjs`** – The worker already performs per‑room locking; we extend it to also lock during source‑fetch operations.
* **`workers/group-stories/schema.sql`** – Add columns `source_url`, `source_title`, `source_author`, `source_fetched_at`, and `version` to the `stories` table (migration script to be added separately).
* **Analytics** – The receipt hash is logged to the public trends endpoint without exposing raw text, satisfying the privacy‑first analytics requirement.

## References
* **Owner brief** – Sections *Privacy safeguards*, *Attribution model*, *Concurrency handling* in `docs/GROUP_BUILD_BRAIN_BRIEF.md`.
* **Existing code** – `group-story.js`, `workers/group-stories/worker.mjs`, `workers/group-stories/schema.sql`.
* **External source guidelines** – https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Type (for MIME validation).

---
*Prepared by the Blueberry specialist (topic import) and reviewed by Pink‑Panther (privacy) and Greenbeans (test implementation).*
