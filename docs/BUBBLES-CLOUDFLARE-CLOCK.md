# Bubbles · Cloudflare owner clock

This is a **server-side scheduled-work control** that reuses the existing
`infinity-brain-clock` Worker, once-per-minute Cloudflare Cron Trigger,
and 30-second target Durable Object alarm. It does **not** use ChatGPT reminders,
Android AlarmManager, live microphone capture, or browser timers to execute jobs.

## What Bubbles can do

The authenticated owner can speak or type the following normal chat requests:

- "Show scheduled jobs"
- "Schedule ticket IW-20261021-ABCD1234 job TASK-1 tomorrow at 4 PM"
- "Schedule ticket IW-20261021-ABCD1234 job TASK-1 at 2026-10-21T20:00:00Z every day"
- "Pause clock_<verified-schedule-UUID>"
- "Resume clock_<verified-schedule-UUID> at 2026-10-22T20:00:00Z"
- "Cancel clock_<verified-schedule-UUID>"
- "Clear old completed clock tasks"

Those are examples, not actual ticket IDs. Get a real ticket ID and job ID
from Bubbles work history. Bubbles refuses to invent one. Its chat parser lives
in `bubbles-cloud-clock.mjs`; the endpoint is `POST /work/clock`.

The owner-only API accepts:
`{action:"list"}`,
`{action:"create",ticketId,jobId,repeat:"once"|"hourly"|"daily",startAt:ISO8601_with_timezone}`,
`{action:"pause"|"cancel"|"archive",id}`,
`{action:"resume",id,startAt:ISO8601_with_timezone}`, and
`{action:"archive_old"}`.

The repeat interval uses UTC elapsed time (hourly 60 minutes, daily 24 hours).
It does **not** currently offer daylight-saving-safe local calendar schedules
or arbitrary Cron expressions. Chat's "tomorrow at 4 PM" follows the owner's
phone/browser time zone, then submits an absolute instant.

## Security and execution

The public endpoint requires the **same verified Bubbles owner session**
as Robot Brain tickets and checks allowed request origin. The Durable Object
reads an existing owner-scoped D1 `work_tickets` record and exact `TASK-N`
job. Only already authorized Robot Brain work may be scheduled. Private
GitHub tokens are never placed in schedule data or chat messages.

At the due time, a Durable Object alarm reserves the occurrence *before*
requesting that same job through the existing `/run-next` gate. Its
five-minute global dispatch cooldown, job leases, source version checks,
dependency checks, security decisions and signed GitHub runner checks remain
authoritative. A schedule receipt means **request scheduled**. A
`queued_for_runner` receipt means **runner dispatch requested**, not that
source was written, tests passed, or software deployed.

Overdue hourly/daily alarms skip missed occurrences instead of replaying all
of them. A one-time alarm won't rerun from timeout or page refresh. If an
already completed/blocked ticket cannot dispatch, the schedule pauses; Bubbles
must not silently re-create or overwrite its work. An inactive old schedule
may be marked archived after fourteen days, but original tickets, receipts,
commit hashes and work history are never deleted.

An active owner session is required to **create or change** a schedule, but
once saved, Cloudflare alarms can trigger it even when Android Bubbles is
closed. This is different from the five-day ChatGPT browser message bridge:
that bridge's private chat reply still requires an owner Bubbles consumer
unless its authenticated processing architecture changes.

## Verification / deployment

Run `node --test test/bubbles-owner-clock.test.mjs` and the existing
`test/brain-clock.test.mjs`, plus the shared Bubbles diagnostic suite.
The wrangler config already declares `crons = ["* * * * *"]`; do not create
extra Cron Triggers or erase existing Worker secrets/bindings. Publish using
the existing staged Cloudflare deployment process, verifying equal bindings
and an actual active Worker version, **not** assuming a GitHub merge deploys
the Worker. Test a real owner schedule with a harmless approved QA ticket;
watch saved schedule, wake, signed runner claim, test/commit evidence and
failure state separately.
