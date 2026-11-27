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

The factory accepts explicit existing service bindings. The CLI can load the
original `WRITER_AI.run` adapter from explicit private host configuration, as
described below. Without that configuration it has no inference provider;
enabled CLI startup refuses a missing model binding before opening databases.
No substitute model or paid fallback is selected. The wallet service,
background alarms and Bubbles owner-session/conversation routes are not
connected by this host. Actual inference, installation into the existing
supervisor and live engineering remain separate acceptance requirements.

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

## Private queue and durable-state import

`brain-private-import.mjs` stages an **owner-provided offline snapshot pair**
into a new private bundle. The existing work SQLite file is copied byte for
byte, preserving every table, owner partition, BLOB, index and trigger. Durable
JSON values are inserted into the existing portable state schema in one
transaction, including encrypted credentials, existing session expiries,
repository leases, run replay markers and result history. No credential or
consent is renewed, and no ticket status is rewritten.

Input files must be regular non-symlink files with private permissions. The
destination root must already be a private directory. Use the existing
`d1-stage.py snapshot` on a private staged SQLite database if a standalone
snapshot is needed: this importer rejects WAL/journal sidecars and non-DELETE
journal mode. It reads no Cloudflare API, phone archive or public GitHub data.
Its command is part of the repository source, not another recovery installer:

```bash
node distributed-vault/brain-private-import.mjs stage PRIVATE_WORK.sqlite PRIVATE_STATE.json PRIVATE_DIRECTORY
node distributed-vault/brain-private-import.mjs verify PRIVATE_BUNDLE_DIRECTORY
```

Both commands read the **existing** `WRITER_OWNER_HASH` from private environment
configuration. Do not paste its value into a public command, issue or log. The
receipt returns bundle paths and aggregate counts, never state values or keys.
All snapshots, bundles and receipt files remain private; they are not encrypted
backups by this module and must not be uploaded to public repositories.

The JSON input contract is `format: "infinity-brain-private-state/v1"`, the
existing `ownerHash`, immutable 40-character `sourceSha`, a bounded `snapshotId`,
`complete: true`, `entryCount`, `entriesSha256`, `workSha256`, and `entries` as
`[[key, JSON_value], ...]`. `entriesSha256` is SHA-256 of UTF-8
`JSON.stringify(entries)`; `workSha256` identifies the exact standalone SQLite
file. Exports are bounded to 32 MiB / 100,000 entries and JSON values of depth
at most 128. Duplicate keys, incomplete counts, mismatched hashes, invalid
values and owner mismatches fail before a bundle is accepted. Exporters must
preserve any unsupported typed values explicitly in a separately reviewed
format; this importer never silently drops them.

The completion marker is written and synchronized last. Repeated imports
verify and reuse only the exact same snapshot. Changed or incomplete existing
bundles, including another same-owner snapshot moved into the expected path,
are preserved and refused. New imports never overwrite prior files. Verification
is for an untouched staged copy; once a runtime legitimately writes into a
bundle, its original snapshot checksum is expected to stop matching.

**The supplied complete flag, counts and hashes do not authenticate an export
or prove a shared consistency boundary across D1 and Durable Objects.** A real
complete private cloud export and old-writer fence still need implementation
and live receipts. Every import/verification result explicitly reports
`sourceAuthorityVerified:false`, `sourceFenceVerified:false`,
`productionVerified:false` and `writerEnabled:false`. Staging does not start a
listener, choose a model, install a supervisor, change the runner origin,
replace the original Brain or enable execution.

## Original model binding and supervised host entry point

`brain-host-bindings.mjs` connects an explicitly configured existing host
adapter to the original Brain CLI. Set `BRAIN_BINDINGS_MODULE` in the existing
private host environment to an absolute `.mjs` path owned by the current user,
with no group/world permissions. It must export only `WRITER_AI`, whose
`run(model, input)` method is the existing inference adapter. This is trusted
server code, not a ticket/model-supplied module, downloaded skill or API URL.
No provider, model, account, endpoint or key is invented by the loader.

The loader preserves the model name, arguments and receiver. An optional
`BRAIN_BINDINGS_SHA256` must match the entrypoint's SHA-256. The exact checked
bytes are loaded through a narrow Node hook, so swapping the file after the
check does not execute replacement code. Relative imports retain the original
file location. **Dependencies remain trusted host code and are not covered by
the entrypoint checksum.** Confirm the existing adapter and its dependencies
before supplying them; this is not a sandbox for untrusted JavaScript.

Missing/invalid/private-incompatible modules fail with sanitized messages.
They cannot override `WORK_DB`, `CLOCK`, the owner hash or wallet bindings via
exports. The CLI inherits the original private environment and credential
encryption key. Host-side JavaScript has normal server-process access; never
pass a path from a public conversation or job as its configuration.

`brain-supervisor.py` is a source entry point for the **same** Node runtime,
usable by the owner's existing host launcher once the real configuration has
been verified. It installs nothing and does not start at merge time:

```bash
python3 distributed-vault/brain-supervisor.py
```

By default it launches only `sqlite-brain-runtime.mjs`; explicit mesh mode
selects only the fixed `mesh-runner.mjs` entry point described below. It uses
a kernel lock and records
every launch in a separate private SQLite ledger before starting its child.
The maximum is **three starts per rolling hour**, including the initial start
and manual relaunches. The budget survives supervisor restarts and conservatively
counts future entries after clock rollback. Unexpected child exits may recover
within that budget; normal exit and configuration/occupied-port exit 78 stop
without retry. Another active supervisor exits 73; an exhausted budget exits 75.
HTTP authentication, provider and 503 responses do not trigger process restarts.

| Host variable | Purpose |
| --- | --- |
| `BRAIN_WORK_DB`, `BRAIN_STATE_DB` | The original private queue and durable state; both must already exist. |
| `WRITER_OWNER_HASH`, `BOT_WORK_SECRET` | Existing identity and original encryption configuration; no values are generated or reset. |
| `BRAIN_BINDINGS_MODULE`, optional `BRAIN_BINDINGS_SHA256` | Existing private model adapter and optional entrypoint checksum. |
| `BRAIN_SUPERVISOR_DB` | Separate private launch ledger; defaults beside the state DB as `brain-supervisor.sqlite`. |
| `BRAIN_STOP_FILE` | Persistent manual-stop marker; defaults to the launch-ledger path plus `.stop`. |
| `BRAIN_PORT`, `BRAIN_SQLITE_WRITER_ENABLED` | Existing local port and explicit activation flag; writer still defaults off. |
| `BRAIN_HOST_MODE` | `standalone` by default; explicit `mesh` selects the existing storage listener with optional Brain routes. Unknown values fail. |

The supervisor preserves an existing stop file. On SIGINT/SIGTERM or a stop
marker it terminates only the child it launched, allowing up to ten seconds
for shutdown before stopping that same child. It never kills an existing
port listener or an unrelated server. It cannot be pointed at either original
database as its launch ledger. It does not reset credentials or alter leases.

Tests use real local subprocesses and synthetic data: a child fails twice and
recovers using the same state, a second supervisor is refused, the launch cap
survives parent restart, manual stop and occupied ports are preserved, and
signed original Brain claim/lease checks precede the configured fixture model
call. The fixture receives the unchanged `@cf/openai/gpt-oss-120b` model ID.
These are **not actual provider inference or owner engineering receipts**.

`modelConfigured` in local health means a `run()` function was supplied, not
that the original provider/model has been independently attested or answered.
The supervisor reacts to child exit; startup hangs and application/model
health recovery are not verified. Android may stop Termux and its supervisor
together. Physical phone background/reboot behavior, original host deployment,
complete private source export, writer fencing, TLS and end-to-end Bubbles
conversation/engineering remain unverified. No origin or writer is switched
by loading these source files.

## Share the existing mesh listener

The observed staging `/health` response identified `infinity-mesh-local-v1`,
the encrypted storage coordinator. It did not establish a connected model or
an executing Brain. Starting a second process on the same port cannot add
those capabilities. `mesh-runner.mjs` now exports `createConfiguredMeshHost`
so the existing listener can host the original Brain explicitly.

For the existing host configuration, `BRAIN_HOST_MODE=mesh` selects this fixed
entry point in the supervisor. It uses the original `MESH_DB`,
`MESH_OWNER_TOKEN`, `MESH_HOST`, `MESH_PORT`, replica count and TLS settings.
`MESH_PORT` controls the **single listener**; `BRAIN_PORT` is unused in this
mode. No new listener, token, tunnel or installation is created at merge time.
Without explicit mesh mode the direct mesh runner remains storage-only.

In mesh mode all three database paths must already exist as separate,
current-user private regular files. The factory checks real paths and inode
identity, including hardlinks, before opening either Brain database. A
read-only mesh schema/integrity check prevents an empty or unrelated database
from being converted into storage. The coordinator retains its existing
additive schema upgrades only for the verified mesh database. Its database
cannot be used as the supervisor launch ledger or lock, including aliases.

| Request surface | Existing authority |
| --- | --- |
| `/health` and storage app assets | Existing mesh response and app behavior, unchanged. |
| `/v1/owner/*`, `/v1/node/*` | Existing mesh owner and per-node credentials. |
| `/runner/*` | Original Brain Worker OIDC verification, owner scoping and lease checks; writer still defaults off. |
| `/local/health` | Aggregate Brain configuration status only when explicitly cohosted. |

Mesh tokens cannot claim Brain work, and a GitHub runner JWT does not grant
mesh-owner access. The shared HTTP adapter streams the request into the
original Brain Worker, preserving its own per-route body limits rather than
applying the encrypted-shard limit. Internal DO, owner pairing, wallet,
phone and conversation routes remain unexposed. Shutdown drains the shared
HTTP server before closing Brain state. An occupied listener is preserved and
exits with configuration code 78, without a retry loop.

Request transport uses a bounded byte-counted bridge. If the original Worker
rejects an upload before consuming it, only that connection closes after the
response. A cancelled Web body cannot destroy the raw HTTP socket before the
size-limit error is returned. Both declared-length and chunked oversized
signed requests return the original 413, and subsequent requests and shutdown
remain responsive. Fully consumed requests retain normal keepalive behavior.

Tests use one real loopback listener with synthetic encrypted shards,
retained node credentials, signed fixture claim/plan, wrong-lease rejection,
replay fences and result readback across restarts. They also exercise the
actual supervisor selecting mesh mode while a separate `BRAIN_PORT` listener
stays untouched. These prove source behavior, **not installation on the
phone, actual provider inference or live Bubbles conversation**. Private
source export, original adapter verification, old-writer fencing, controlled
host adoption and signed HTTPS execution remain required before cutover.

The owner phone is optional staging/recovery, not a required production host.
This same Node entry point may run on a verified owner-approved non-phone host
with private persistent disk and the existing model access. Repository source
and passing CI do not provide an always-on private inference service. Follow
the repository-first placement and offline-phone acceptance gates in
`work/unfinished/2110-shard-cache-checkpoint.md` before production adoption.

## Privileged private JSON-KV export

The original Worker has an **inactive-by-default** export surface at
`POST /work/migration/state-export`. It is available only when its private
operator configuration explicitly sets `BRAIN_PRIVATE_EXPORT_ENABLED=1` and
the bearer token is the original master preimage of `WRITER_OWNER_HASH`.
Device/session tokens, GitHub OIDC and five-day conversation grants do not
authorize it. The handler checks the existing origin allowlist and never
falls back to phone/session verification. No new credential is created.

This is privileged backup of the `infinity-main` object's **JSON KV**, including
private session records, phone state, encrypted credentials, leases and receipt
history. The internal handler reads all pages through one storage transaction,
using UTF-8 key ordering. It reads one value per page to avoid loading many
maximum-sized values before checking the budget, resets buffers on transaction
retry, and continues until an empty terminal page. It writes no source state,
alarm, D1 record or model request. Metadata and failures are bounded/sanitized;
private values are never printed to logs or public GitHub receipts.

The output uses the existing `infinity-brain-private-state/v1` format. Limits
are 16 MiB of serialized UTF-8, 100,000 records, JSON depth 128 and 200,000 value
nodes. Exceeding a limit refuses the export rather than truncating it. Values
must be lossless JSON trees: unsupported structured-clone types, cycles,
shared-reference aliasing within a value, sparse/extended arrays, accessors,
non-enumerable data, non-finite numbers and negative zero are refused. Larger
or typed snapshots need a separately implemented format, not silent conversion.

`brain-private-export.mjs` is the matching operator download utility. It uses
the original fixed HTTPS Worker endpoint, the existing master value from the
private `BRAIN_OWNER_TOKEN` environment, and `redirect:error`. The input is an
existing standalone private work SQLite snapshot and an existing private output
directory. It verifies that snapshot's bytes before and after the download,
validates owner/labels/counts/hash and explicit qualification headers, bounds
and fatally decodes UTF-8, writes exclusive 0600 `state.json`, then synchronizes
the private completion receipt last. Existing files are never overwritten.
Errors do not print response bodies, private paths or credentials. On failure
a partial private output may remain, without an accepted completion receipt.

```bash
node distributed-vault/brain-private-export.mjs PRIVATE_WORK.sqlite PRIVATE_DIRECTORY SOURCE_SHA
```

Do not put the master value in the command, chat, repository, workflow input,
log or artifact. This utility belongs on a verified private operator host; it
is not a public GitHub Actions task or an installed service. Its `state.json`
can be staged through the existing private importer. It does not start Brain.

**Completeness refers only to JSON KV in this one transaction.** DO SQL
tables, alarms, environment encryption secrets, in-memory operations, D1 and
other objects are excluded. Caller-supplied source SHA, snapshot ID and work
hash are labels, not deployed-version or source-D1 attestation. HTTP headers
and the separate private receipt explicitly report source authority, source
fence, common work-snapshot consistency and production verification as false,
and report `writerActivationPerformed:false`. The export neither stops the
source writer nor activates a target. A stable local hash is not a common D1/DO consistency
boundary. Original private export execution, consistent authoritative work
export, rollback, old-writer fence and in-flight reconciliation remain required.

No export is enabled, deployed or executed by a source merge. The existing
Cloudflare health gate and approved host/inference requirements still apply.
The current Durable Objects [storage API](https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/)
documents transaction-scoped KV reads and UTF-8 pagination. Tests exercise the
existing Node/SQLite harness and original Worker; they do not establish live
Cloudflare export or physical Android acceptance.
