# Bubbles continuity contract — literal `*`

Owner instruction (October 25, 2026): typing a single `*` in the main Bubbles conversation means **recover and continue recent unfinished, previously owner-authorized work**. Do not ask the owner to identify a repository or repeat an already recorded instruction. Do not invent a new product, ticket, consent, or work scope.

## Existing implementation and data boundaries

- Android Bubbles and the site use the same `bubbles-ai.js` chat. `*` is intercepted **before** the ordinary chat model, tool-call formatter, and general command classifier.
- A verified Bubbles owner session first requests `POST /owner/conversation` with `mode=work-audit-reconcile`. This consults saved owner conversations and compares them with existing tickets. It is **read-only** and may report unmatched candidate work, never enqueue that text as a new ticket or infer consent from it.
- Next, request `POST /work/tickets/list` from the existing Brain. It returns real persisted owner-partitioned tickets and job state; the client chooses recent unfinished work. Up to **eight distinct project slots** are tracked in a bounded working set.
- Only an eligible **previously authorized** ticket/job can be submitted to `POST /work/run-next`. The Brain checks real job eligibility, dependencies, owner authorization, signed runner identity, repo leases, and receipt history. The client requests at most **one** dispatch for each `*` turn; the pre-existing Cloudflare Cron/Durable Object continues rechecking the queue while the APK is not running.
- A locked, revoked, security-held, wallet/payment-sensitive, or approval-requiring task remains blocked. A commit without CI/deployment verification goes to verification, **never** a fresh duplicate write.
- Status messages should be short and truthful: **Started**, **Finished**, or **Blocked**, with detailed receipts available in work history. Queued is not started on the GitHub runner; tests passed is not deployed.

## Concurrency and autonomy

The eight slots are independent **work tracks**, not eight ChatGPT accounts or browser sessions. The production Brain currently enforces a *global one-dispatch-per-five-minutes* automatic retry gate and per-repository leases. Do not bypass those gates merely to raise concurrency. Expand to parallel read-only research or independent CI inspection first; increase authenticated write concurrency only after load/lease tests and explicit deployment approval.

The Brain clock is already configured for every-minute Cloudflare Cron and 30-second Durable Object alarms. It does not need an Android microphone, open chat, or browser automation to wake the existing runner. A missing external credential may still block a job.

**ChatGPT personal context is separate from Bubbles' private owner archive.** ChatGPT can use personal-context retrieval when a user types `*` here; the Bubbles Worker cannot call that privileged context tool directly. A future supported ChatGPT/API connection must be separately authenticated and approved, pass only the minimum owner-scoped context, and never scrape ChatGPT pages/cookies or impersonate user sessions.

## Verification before deployment

1. Run `node --test test/bubbles-star-continuation.test.mjs` and existing Bubbles/Brain tests.
2. With authenticated owner mode, type `*` in the website, then through Android Bubbles; ensure both use the **same authenticated endpoints**.
3. Seed a verified ready ticket and a blocked security ticket; confirm only the approved job is requested and the security ticket remains blocked.
4. Run the GitHub Action and inspect its actual claim, commit/PR/CI result, and production deployment separately. Restart the Android APK and confirm the saved conversations remain available.
5. A browser/phone test, a GitHub dispatch acceptance, and a pending Cloudflare deployment are **not** completion evidence.
