# Continuity five-minute observation cycle

This is the executable monitoring portion of Kris's eight-track Continuity system.
It is distinct from the existing hourly ChatGPT **Continuity Builds** engineering
task and from dormant authenticated ChatGPT continuation PR #1070. Eight tracks
are not eight authenticated conversations. This Worker cannot send chat messages,
renew a five-day grant, claim the owner's Work browser, change repositories, release
an APK, or execute Brain tickets. Those operations retain their existing adapters.

Every five minutes, the Worker reads public source/CI evidence, home HTML, three
service health endpoints, the traffic ledger and APK hold #525. It saves one
fenced, idempotent receipt per scheduled time bucket in the **existing** Brain D1
database. Only `continuity_cycle_receipts` is created/written/pruned; this is telemetry,
not another work queue or identity store. Seven days of receipts are retained.
Responses never contain upstream bodies, private work, credentials or conversation
archives. Failing checks and missing authenticated adapters remain explicit.

Public GitHub observations are reused for 15 minutes to reduce request load.
Each saved check retains its original `observedAt` time and `sourceState`; reused
checks have state `cached`. If a refresh fails, the prior observation can be shown
for at most one hour as `stale`, with the actual refresh failure. Its timestamp is
never renewed by reuse. A cached/stale CI result cannot establish current-head CI,
lift a hold, authorize execution or prove a release. Site/service health and traffic
are still read on every five-minute cycle.

`GET /health` describes this monitor. `GET /status` returns the latest completed
cycle and its original check time. It returns 503 after two missed intervals;
refreshing either URL cannot run a cycle or extend a grant. A checked health URL
is not a model conversation, working OAuth login, security validation, visual
acceptance, deployment proof, or physical Android test.

Run `node --test test/continuity-cycle.test.mjs`. Tests use real SQLite for duplicate
claims, expired leases, stale writers, cross-bucket recovery and unchanged private
records, plus controlled HTTP fixtures for the bounded public probes.

Deployment must pin `SOURCE_REVISION` to the reviewed 40-character commit. Keep
`CYCLE_ENABLED=false` until candidate review/tests and all binding identities are
verified; then enable this isolated monitor and set `*/5 * * * *`. No existing
Worker, schedule, binding, wallet, consent or route is replaced. Confirm actual
scheduled receipts with increasing cycle IDs before claiming the cron is running.

The hourly engineering task should read `/status`, reconcile its exact source/CI
references with current repository state, and implement the highest-priority
authorized bounded repair through existing review/test/release paths. Do not let
an unavailable browser block useful source work. Gemini questions can be collected
by that task and sent through the observed authorized TinyFish profile; a one-off
Gemini consultation does not install a persistent Gemini runner in this Worker.
