# Native QuantaPhi projects — first executable slice

The ledger routes authenticated, active wallet owners to private D1-backed
project storage. GitHub is not used by project creation, revision, retrieval or
export. These are versioned source projects, not a Git protocol server.

## API

All requests use the ledger's existing device bearer and origin validation.
Owner identity comes from IDENTITY_DB, never a request field. Responses are
JSON with Cache-Control: no-store. The normal wallet-active check still applies.

| Method | Path | Input or result |
| --- | --- | --- |
| POST | /v1/projects | title and requestId; returns persisted project |
| GET | /v1/projects | authenticated owner's projects |
| POST | /v1/projects/:id/revisions | requestId, expectedHead (null initially), files object mapping relative path to UTF-8 source |
| GET | /v1/projects/:id | current project and verified revision contents |
| GET | /v1/projects/:id?revision=:revision | specific immutable historical revision |
| GET | /v1/projects/:id/export | portable quantaphi-project-v1 JSON |

requestId is an 8–80 character ASCII identifier. Retries with the same content
return the same project/revision. Reusing a key for different content returns
409. Revision writes atomically compare the expected parent; stale writes do
not advance the head or retain an orphan revision. Export verifies the source
hash before returning files. No source is executed or published by these routes.

Limits: 20 projects per owner, 100 revisions per project, 32 files and 64 KiB
UTF-8 source per revision, 100,000 request-body bytes. Revisions store complete
snapshots in separate native tables; existing wallet tables and balances are
not replaced. Future large-blob storage can use a typed object-storage adapter.

## Acceptance and remaining integration

Run node --test test/native-projects.test.mjs test/search-commit.test.cjs
test/wallet-assets.test.cjs. Tests use actual SQLite transactions and exercise
the ledger authentication route, owner separation, retry conflicts, stale heads,
rollback, limits and corruption detection, alongside existing wallet behavior.

The native API is wired in source. Live Worker deployment, owner browser client,
Bubbles tools, isolated preview/publishing, object storage and rollback-to-release
are separate remaining work. No Cloudflare bindings or configuration are changed
by this patch. Local SQL tests are not a live D1 deployment receipt.
