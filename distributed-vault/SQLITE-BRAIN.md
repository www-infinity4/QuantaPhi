# Existing Brain on SQLite — #1907 / migration #2110

The repository engineer's observed failure was `claim`, HTTP 503, in
[Moltnook run 45940054349](https://github.com/www-infinity4/Moltnook/actions/runs/45940054349).
GitHub OIDC and the credential bridge succeeded before that failure. This
does not establish whether a particular D1 request hit its read or write quota.

`sqlite-brain-runtime.mjs` loads the **existing** BrainClock and outer Worker
from `workers/infinity-brain-clock/worker.js`. A Node loader substitutes only
the Cloudflare base class; it does not copy or replace authentication, queue
selection, scope, model prompts, result projection, leases or review policies.
`sqlite-brain-db.mjs` adapts existing private SQLite statements to the D1
`prepare/bind/first/all/run/batch` contract. Lease and receipt persistence reuse
`portable-brain-state.mjs`, separate from the work-ticket database.

The host exposes `/runner/*` through the original OIDC-verifying Worker, plus
an aggregate `/local/health` endpoint. Internal DO, wallet, pairing, phone and
conversation routes are not exposed. The listener is loopback only and will
not terminate a process already using its port. The writer defaults to disabled.
There is no automatic fallback between this database and Cloudflare.

## What has been tested

Tests use synthetic tickets and a synthetic RSA issuer key served only to the
existing JWKS verifier. No production JWT or owner data is used. They exercise:

- The real Brain handler and a real loopback HTTP listener.
- Owner-partitioned queue selection and retained security holds.
- Invalid identity and wrong lease rejection, duplicate attempt fencing,
  retained active repository leases after reopening both databases.
- A blocked result and its durable receipt after restart, without claiming
  source execution, deployment or rewards.
- Atomic batch rollback, existing-schema requirements, private files, missing
  encryption-key refusal, and an occupied port preserving the existing server.

Run the existing CI entry point:

```bash
node --test test/distributed-vault-deploy.test.mjs
```

## Configuration and remaining cutover work

This is runnable source, **not an installed or verified Termux replacement**.
Do not launch it on top of the existing Brain. The existing supervisor must
ultimately start this entry point only after the host and imported state have
been verified. No installation, token creation, process termination, package
download, automatic import or production switch is performed here.

The entry point is `node distributed-vault/sqlite-brain-runtime.mjs`. It reads
`BRAIN_WORK_DB`, `BRAIN_STATE_DB`, `WRITER_OWNER_HASH`, optional
`BOT_WORK_SECRET`, and `BRAIN_PORT` (default 18789) from the existing private
host configuration. Both database paths must already exist, contain the
expected tables and be owner-private files. Missing paths never create a new
empty Brain. Use the original owner hash and encryption key; do not print them
or commit private configuration/databases to GitHub. The state adapter can store
secrets; its SQLite file is private, not an encrypted backup by itself.

Before enabling `BRAIN_SQLITE_WRITER_ENABLED=1`, verify a consistent work DB
export and complete durable state import, including owner sessions, encrypted
credentials, job/repository fences and result history. Fence the old writer,
reconcile in-flight and ambiguously acknowledged claims, compare restored data,
and retain a private restorable backup and rollback plan. A flag is a request
to activate, not proof that these migration conditions were met. This source
does not implement or assert an authoritative-state export or cutover.

The factory accepts explicit existing service bindings. The CLI deliberately
has **no inference provider, wallet service or background alarm adapter**.
`WRITER_AI.run`, when supplied by an embedding host, receives the original
model name and prompts. No substitute model or paid fallback is selected.
Thus the CLI can serve authenticated claim/result persistence once enabled,
but cannot yet plan/build, serve Bubbles conversation, replace the existing
supervisor, or settle wallet work. Treat those as unresolved integrations.

Moltnook's companion origin configuration uses the same selected HTTPS origin
for credential connection, job calls and result handling. Before setting its
`BRAIN_RUNNER_ORIGIN` repository variable, verify an owner-controlled HTTPS
reverse proxy to this loopback host, TLS identity, network reachability from
GitHub Actions, appropriate request limits, the original model adapter and
the cutover evidence above. Leaving the variable absent preserves the existing
origin. Redirects and automatic cross-origin retries are refused.

Physical Android, supervisor restart/reboot, actual imported owner records,
signed production inference, end-to-end ticket engineering, HTTPS deployment
and Bubbles conversation acceptance remain unverified. GitHub source/CI does
not establish these receipts.
