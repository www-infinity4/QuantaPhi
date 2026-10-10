# Persistent Robot Brain Clock

Deployed service: https://infinity-brain-clock.marvaseater.workers.dev/health
Fresh evidence: https://infinity-brain-clock.marvaseater.workers.dev/activity/feed.json

A single SQLite Durable Object schedules itself 30 seconds after each completed turn. This is a target interval, not a hard real-time deadline. A one-minute Cron Trigger starts/restarts the clock if no alarm exists. The page reads receipts every ten seconds; its refresh is not an execution claim.

Yellow reads bounded live HTML and detects content changes. Green reads saved robot-directions tickets and bounded repository README/index sources. Gemini supplies one structured inspect_repository or idle instruction through the private BrainModels service binding. Purple uses Cloudflare GPT-OSS to review actual receipts and owner acceptance criteria. Pink records errors and exponentially backs off to thirty minutes. A successful unchanged snapshot does not invoke the models again.

Credentials stay in the existing Infinity gateway. The public gateway routes are preserved. The private entrypoint is exported separately and has no public fetch route. Gemini model availability is discovered via models.list; model declines, missing credentials and provider quota are surfaced as blocked, never disguised as a different provider.

## Supported work and limits
This deployed executor performs repository inspection and progress review. It does not write or deploy arbitrary source, change wallets, mint coins, run generated scripts, or click a button with executable AI code. Repair jobs remain blocked on repository_write_executor_not_connected after the inspection. The owner ticket receives real per-job progress; immutable receipt revisions are retained in Durable Object storage. An unresolved repository scope is recorded and skipped so later jobs can continue.

Current monitoring reads public HTML and source files. It does not yet capture the rendered DOM, live chart values, screenshots or private browser state. Monitoring never changes an old event timestamp or generates fake conversations. The frontend only shows events that occurred after the current visit began.

The instruction schema permits only target_element robotDirections, action inspect_repository or idle, and payload reason. Source excerpts are untrusted evidence. No eval, generated HTML, shell snippets or arbitrary resource destinations are executed. Ticket updates use compare-and-swap to protect owner edits. Duplicate job revisions do not repeat inspection; changed instructions or acceptance criteria create a new revision.

## Verification
Run node --test test/brain-clock.test.mjs.
Live /health exposes lastTick, nextAlarm, status and any provider failure without credentials. Source inspection is evidence of reading, not of completed repairs.
