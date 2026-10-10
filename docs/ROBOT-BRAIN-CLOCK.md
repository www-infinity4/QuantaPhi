# Persistent Robot Brain Clock

Deployed service: https://infinity-brain-clock.marvaseater.workers.dev/health
Fresh evidence: https://infinity-brain-clock.marvaseater.workers.dev/activity/feed.json

A single SQLite Durable Object schedules itself 30 seconds after each completed turn. This is a target interval, not a hard real-time deadline. A one-minute Cron Trigger starts/restarts the clock if no alarm exists. The page reads receipts every ten seconds; its refresh is not an execution claim.

Yellow reads bounded live HTML and detects content changes. Green reads saved robot-directions tickets and bounded repository README/index sources. Gemini supplies one structured inspect_repository or idle instruction through the private BrainModels service binding. Purple uses Cloudflare GPT-OSS to review actual receipts and owner acceptance criteria. Pink records errors and exponentially backs off to thirty minutes. A successful unchanged snapshot does not invoke the models again. Gemini provider failures pause Gemini calls for fifteen minutes while the mechanical inspection router can continue.

Credentials stay in the existing Infinity gateway. The public gateway routes are preserved. The private entrypoint is exported separately and has no public fetch route. Gemini model availability is discovered via models.list; model declines, missing credentials and provider quota are surfaced as blocked. During Gemini backoff, a explicitly labeled mechanical router can continue bounded source inspections and Cloudflare GPT-OSS progress reviews; it is never labeled Gemini.

## Supported work and limits
The clock performs inspection and progress review. An authenticated GitHub runner now claims eligible saved brain-interface jobs, applies bounded patches, obtains a separate GPT review, runs regression tests, commits with a base-SHA conflict check, and verifies exact deployed source on .org. A hosted Chromium browser checks Android behavior and stores screenshots in the workflow artifacts. The first acceptance adapter implements Clear text and verifies empty input, persisted draft clearing after reload, and a 44px touch target. Other job types remain blocked or committed_unverified until their own repository and acceptance adapters exist. Wallets and monetary operations are outside this adapter. The owner ticket receives real per-job progress; immutable receipt revisions are retained in Durable Object storage. An unresolved repository scope is recorded and skipped so later jobs can continue.

Current monitoring reads public HTML and source files. It does not yet capture the rendered DOM, live chart values, screenshots or private browser state. Monitoring never changes an old event timestamp or generates fake conversations. The frontend only shows events that occurred after the current visit began.

The instruction schema permits only target_element robotDirections, action inspect_repository or idle, and payload reason. Source excerpts are untrusted evidence. No eval, generated HTML, shell snippets or arbitrary resource destinations are executed. Ticket updates use compare-and-swap to protect owner edits. Duplicate job revisions do not repeat inspection; changed instructions or acceptance criteria create a new revision.

## Verification
Run node --test test/brain-clock.test.mjs.
Live /health exposes lastTick, nextAlarm, status and any provider failure without credentials. Source inspection is evidence of reading, not of completed repairs.

## Writer and shared hosted browser
Workflow: `.github/workflows/brain-writer.yml`. It starts on adapter changes, manual dispatch, and a five-minute schedule (GitHub scheduling can be delayed). All color roles use the same per-job browser evidence; this is not a separate browser process per named role. Browser screenshots and reports are saved as `brain-browser-and-repair-evidence` artifacts. Public progress links to the real workflow and source commit.

GitHub OIDC authentication validates signature, expiry, audience, numeric repository ID, main ref, exact workflow path and allowed event. No GitHub token or owner token is sent to the public page. A private WRITER_OWNER_HASH binding limits intake to this owner's saved robot-directions jobs. Job revisions, expiring leases, compare-and-swap ticket updates and workflow concurrency protect competing writes. Failed jobs retry after 30 minutes; source changes after claiming cannot be marked complete by an old receipt.

The writer can change only robot-directions and quanta-agent-iterations JS/CSS; it cannot modify workflow files, tests, backend workers or wallets. General model patches require their own browser acceptance adapter before complete. A successful source commit without browser acceptance is explicitly committed_unverified. Inspection does not overwrite completed jobs.
