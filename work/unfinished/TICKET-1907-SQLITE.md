# #1907 · Local Brain execution persistence

- Canonical work: [Brain #1907](https://github.com/www-infinity4/QuantaPhi/issues/1907), migration coordinator [#2110](https://github.com/www-infinity4/QuantaPhi/issues/2110).
- Owner request: preserve the existing Brain, credentials and jobs; remove critical Cloudflare queue/database dependency; restore actual engineering rather than produce recovery carts.
- Source baseline: QuantaPhi `db79ac5` (main at checkout); Moltnook `1c01415` (main at checkout). Branches: `feat/brain-sqlite-runtime-1907-20261127`, companion `feat/brain-origin-1907-20261127`.
- Observation: [Moltnook 45940054349](https://github.com/www-infinity4/Moltnook/actions/runs/45940054349), execute job `140312056180`: OIDC bridge succeeds, then `BRAIN_RUNNER_CALL_FAILED` at `claim`, HTTP 503. The public sanitized response alone cannot identify the exact underlying D1 error.
- Agent: GPT Brain; source implementation and independent Pink review. No production coordinator lease was obtained: lease ID, fence, task/session ID and expiry remain null. Isolated source branches do not claim a signed production job.
- State: 🔵 `merged / production_blocked`; total progress and remaining sessions unknown. One documented source session; an inactive source milestone is not completion of the six-stage owner roadmap.

Implemented the existing Brain worker over an existing private SQLite work DB and existing portable durable-state DB; original signed OIDC, ticket selection, owner boundaries, lease fencing and result projection remain unchanged. Companion Moltnook configuration removes the hardcoded execution destination while preserving the existing default and refusing redirect/fallback. Writer remains inactive pending controlled cutover.

Regression-first RED: both new suites failed on missing implementation modules. GREEN: existing deployment entrypoint 28/28 tests, including real HTTP, claim/replay/restart, blocked-result readback, owner/security scope, private files, original-key requirement and occupied-listener preservation. Full existing vault workflow 77/77; Moltnook connection/identity/idle/context and GitHub identity suites 41/41. Independent Pink review reran both full selections and found no blocking defect for inactive source merge.

## Verified source receipts · 2026-11-27 UTC

- QuantaPhi [#2151](https://github.com/www-infinity4/QuantaPhi/pull/2151) head `3895eab141e980fe77905942c2cd4e54536adf1d`; 9/9 returned checks successful. [Vault CI 45942009382](https://github.com/www-infinity4/QuantaPhi/actions/runs/45942009382): Node 22.23.5, 77/77 tests passed.
- Moltnook [#287](https://github.com/www-infinity4/Moltnook/pull/287) head `616d6360c0b3b9e4ef3824194821a4d928bb73cd`; 5/5 returned checks successful, including [staged checks 45942014031](https://github.com/www-infinity4/Moltnook/actions/runs/45942014031).
- Published trees match independently reviewed/tested trees exactly: QuantaPhi `492776727355e548846674fd72bb91fb44d7c03a`; Moltnook `f360b1cc1779059c4807a4f8455990e08b4cec89`. Connector commit metadata differs from local commits; source trees are identical.
- Expected-head merges and GitHub merged readback confirmed: QuantaPhi `a21de52ae7802c8c80d75182aaa6109791dafd7f`, Moltnook `66679413eed73a0bbffe6be9b0e74a8e4f58c161`. QuantaPhi [post-merge vault checks 45942142800](https://github.com/www-infinity4/QuantaPhi/actions/runs/45942142800) also succeeded.
- These are source/test/merge receipts. A Pages deployment does not install the local Brain or verify Bubbles conversation. Live owner records, inference, actual job execution and Android acceptance remain unverified.
- Actual post-merge [Moltnook engineer run 45942148109](https://github.com/www-infinity4/Moltnook/actions/runs/45942148109), job `140318681298`, loaded merge `66679413eed73a0bbffe6be9b0e74a8e4f58c161`. Credential/authentication, baseline and adapter checks succeeded; at `2026-11-27T04:50:36Z` remote `claim` again returned HTTP 503 / `runner_operation_unavailable`. The replacement origin variable was empty and the existing origin remained selected. No production job claim or restored Bubbles response was verified.

Unresolved: live state export/import parity and old-writer fencing; configured original inference binding; private HTTPS reachability; integration into the existing Termux supervisor; local Bubbles conversation and detector intake; real owner-session/auth preservation; actual signed engineering PR/test/merge/deploy loop; Android/reboot verification. No production variable, DNS, grant, credential, wallet, service, subscription or device process changed.

Next executable action: verify the actual existing Termux Brain host/configuration and original inference adapter, implement consistent private state import and supervisor integration, and establish TLS/reachability and old-writer fencing before any writer activation or runner-origin change. See [runtime contracts](../../distributed-vault/SQLITE-BRAIN.md). Source merge is complete; live migration remains blocked.

## Continuation · private import implementation

Second documented source session on branch `feat/brain-private-import-1907-20261127`, baseline `f1d3edf636f3e41e16bae78e9ceefbc7f18bd8f9`. No coordinator lease, fence or task/session identity obtained; all remain null. Overall acceptance percentage and remaining sessions remain unknown. Source subsequently merged through [#2153](https://github.com/www-infinity4/QuantaPhi/pull/2153), merge `24bfbd799e901415873236924501ae842c243953`, after nine successful checks and independent review; live migration remains blocked.

The current saved A- automation and Recovery 002 source supervise read-only observation and watcher recovery. They do not supply an authenticated local Brain queue or inference adapter. This source read is not proof of the phone's currently installed processes; no device process was inspected, replaced or stopped.

Implemented `brain-private-import.mjs` for an existing private offline WORK_DB SQLite snapshot plus a complete owner-provided JSON durable-state export. Copies the entire DB without schema/value rewriting; inserts all JSON state in a transaction; verifies copies and same-owner snapshot identity before reuse; preserves originals, encrypted credentials, session expiry, repository locks, replay fences and result history. Writes/synchronizes its completion receipt last. Keeps source authority, source fence, writer and production flags unverified/off.

RED: focused import suite failed before the implementation module existed. Initial GREEN: six tests. Independent Pink found a reproducible wrong-snapshot replay issue; fixed it and added a moved-snapshot regression. Current focused suite 8/8 passes, including original encrypted credential decryption using its unchanged key and loading the imported pair into the existing inactive Brain runtime. Additional malformed-private-JSON test verifies that rejected input cannot appear in an error message. Full existing vault workflow 85/85 passed locally and independently; source review found no remaining inactive-source blocker. Exact-head GitHub CI and merge receipts are recorded on canonical #1907 as observed; this section captures the source proposal, not a live recovery receipt.

This implements local import/staging, not an authenticated remote export or a demonstrated D1/DO consistency boundary. Actual private source export, remote-writer fence, original model/supervisor integration, reachable HTTPS, owner-session routing and live Bubbles/Android engineering remain unverified. Import source merge is complete. Next live action remains verified access to the existing Termux host and its original private configuration.

## Continuation · original model binding and host supervision

Third documented source session, branch `feat/brain-host-bindings-supervisor-1907-20261127`, baseline `24bfbd799e901415873236924501ae842c243953`. Production coordinator lease/fence/task-session ID/expiry remain null. Overall progress and remaining sessions are unknown. Source merged through [#2154](https://github.com/www-infinity4/QuantaPhi/pull/2154), head `a373b105fb057f800275271d05fbae4391f2025b`, merge `f1512344b93cf0f9eb627cc9c8871a46d3a6710c`. Nine checks passed, including [vault run 45945675214](https://github.com/www-infinity4/QuantaPhi/actions/runs/45945675214), Node 22.23.5, 94/94. Independently reviewed tree `78672932db5e30e85eea3f8cc86c8e145b6a5a76`; post-merge vault run `45945778747` passed. This is source promotion, not host deployment.

Current source evidence: [QuantaPhi writer run 45943892651](https://github.com/www-infinity4/QuantaPhi/actions/runs/45943892651), job `140324082211`, still returned `runner_operation_unavailable`; [Moltnook engineer run 45942823143](https://github.com/www-infinity4/Moltnook/actions/runs/45942823143), job `140320738499`, failed `claim` HTTP 503. A read-only live `infinity-rogers/METER_DB` cache-schema query was rejected with D1 error 7500 explicitly naming the free daily row-read allowance. The expired-cache cleanup could not be validated and was not performed. A prior zero-row constant Brain probe did not establish working ticket reads/writes or recovery. Cloudflare's official [D1 FAQ](https://developers.cloudflare.com/d1/reference/faq/) distinguishes daily query exhaustion from storage exhaustion; neither is an invalid owner credential.

Implemented explicit private host binding loading for the original `WRITER_AI.run` interface, preserving model ID/arguments and original OIDC/lease checks. The enabled CLI refuses a missing adapter before opening the original databases. Independent review reproduced a checksum path-swap race; fixed by loading the captured validated entrypoint bytes through a narrow Node hook. A regression swaps the file after checking it and verifies the original bytes and sibling relative-import base.

Added an opt-in supervisor source entry point for the same fixed Node runtime and existing private environment/databases. Kernel singleton lock and a separate private SQLite launch ledger enforce three starts per rolling hour across parent restarts. Manual stop, configuration/occupied-port stops and unrelated existing servers are preserved. HTTP/auth/provider errors do not cause restart loops or credential resets.

RED: host suite failed on the absent binding module. GREEN: nine host tests, including real crash/recovery subprocesses, persisted launch cap, original session retention, occupied-listener preservation and synthetic signed claim → lease check → original model-interface invocation. Independent Pink reran the existing full vault workflow: 94/94 passed, with no remaining inactive-source blocker after the checksum fix. New host tests run through the existing deploy-test CI entrypoint.

No actual model/provider or phone configuration was selected, no service was installed and no writer/origin was activated. Actual provider inference, complete cloud export/common consistency boundary, old-writer fence, existing Termux adoption, startup-hang recovery, owner-session/conversation routes and physical Android/reboot acceptance remain open. Source promotion is verified. Existing host integration and private state cutover continue below.

## Continuation · existing mesh/Brain listener integration

Fourth documented source session, branch `feat/brain-existing-mesh-host-1907-20261127`, rebased onto `999aa47ba3e7cf538b00b7fb030823b097fa284d` to preserve the merged #2157 Android fixture correction and #2158 phone-independent placement gates. Production coordinator lease/fence/task-session ID/expiry remain null; no production job was claimed by this branch. Acceptance percentage and remaining sessions are unknown. Source merged through [#2160](https://github.com/www-infinity4/QuantaPhi/pull/2160), head `f81ee6dff810109fb0cd92165b20e44a978a53e6`, merge `61f6f346f53bc978e84d6adeaa5bc40df8318668`, reviewed/CI/merged tree `66ebfb188b3b721b72880cde0b2a1a0ad5573e02`. Nine returned head checks passed; [vault run 46048072295](https://github.com/www-infinity4/QuantaPhi/actions/runs/46048072295) verified Node 22.23.5, 100/100. Post-merge vault run `46048226477` passed. Final receipts are also on #1907/#2110. Host deployment remains unverified.

Live staging `/health` at `https://brain-stage.quantaphi.org/health` rendered `{"ok":true,"service":"infinity-mesh-local-v1"}`. Read-only tunnel metadata showed one active connection and existing loopback ingress on port 18789. This proves the encrypted storage service answers through HTTPS; it does not prove inference, original owner authentication or signed job execution. No private route was authenticated and no device shell was accessed. The known host is not a missing URL; its existing private state/model configuration and authenticated adoption remain the live dependency.

Implemented explicit `BRAIN_HOST_MODE=mesh` in the existing fixed-entrypoint supervisor and mesh runner. The original mesh listener delegates only `/runner/*` and aggregate `/local/health` to the original Brain. It does not start a second listener, expose the internal DO or treat storage tokens as runner identity. Mesh health, encrypted shards, node credentials and owner APIs retain their existing contracts. Separate existing private mesh/work/state databases are checked for schema and path/inode aliases before opening Brain; original mesh data cannot become the supervisor ledger/lock.

Regression-first RED: the new suite failed because `createConfiguredMeshHost` was absent. Tests now cover the same real HTTP listener with encrypted storage plus signed fixture claim/plan, wrong-lease rejection, auth separation, replay/receipt durability across restart, storage-only defaults, inactive writer, missing/schema/alias refusal, the original runner body contract, supervisor entrypoint selection and occupied-listener preservation. A fixture adapter is not a real inference provider. Review/test/CI totals are recorded with the immutable promoted head in the canonical issue.

Further boundary testing and independent review reproduced an unread-upload defect: a declared oversized signed request received an early response but left the raw request paused, stalling a later request/close. Fixed in the shared HTTP adapter with a byte-bounded bridge and connection disposal after early response. Both declared-length and chunked oversized signed builds now return the original 413 JSON and permit follow-up health, claim and close; the Worker body limits and authentication remain unchanged. The earlier 100-test result predates this added boundary assertion; final exact-tree test receipts are recorded separately.

No source export, old-writer fence, real adapter configuration, phone installation, process replacement, DNS/tunnel change, runner-origin change or writer activation occurred. Source review/CI/merge are verified; original private host configuration and a consistent source export/fence remain necessary before controlled live adoption. Bubbles conversation routing and actual engineering acceptance remain open.

The mesh remains optional staging/recovery under #2110's repository-first placement decision. This general Node host integration can run on a verified owner-approved non-phone host; it does not make the phone the required production server. New subprocess fixtures use the corrected bounded monotonic readiness window and stop-before-directory-removal order from #2157. Native cloud Workers AI bindings are not evidence of an existing local model adapter; its real configuration/inference still requires verification.

## Continuation · shared signed-runner inference cooldown

Fifth source session in this checkpoint, branch `fix/brain-provider-cooldown-1907-20261127`, baseline `61f6f346f53bc978e84d6adeaa5bc40df8318668`. Lease/fence/task-session identity/expiry remain null. State: source tested, review/CI/promotion pending. Overall acceptance and remaining sessions remain unknown.

Live read-only Worker metadata confirms the original `WRITER_AI` native AI binding, `CLOCK` and `WORK_DB` remain configured. A non-sensitive original-model probe to `@cf/openai/gpt-oss-120b` was rejected by the connected provider API with HTTP 429 / code 4006 and explicit daily free neuron exhaustion. No response/inference success was obtained, no new probe was submitted after that refusal, and no paid plan, model, credential or permission was changed. This is a distinct confirmed inference blocker; prior D1 read-limit evidence remains separate. It is not proof that every gateway 429 has this cause.

Source inspection found per-lease quota backoff did not stop a different eligible job from claiming and repeating the same failed inference. Regression-first tests reproduced the missing shared marker, an unintended new claim, and a claim-preparation race. The existing Brain now records a shared signed-runner cooldown atomically with its still-fenced job, checks it before model calls and ordinary lease reservations, and leaves unrelated jobs queued. Existing source-only Pink verification remains eligible under unchanged authorization/dependency rules, with saved memory instead of new vector inference during the cooldown. Caller wording, generic rate limits and replaced leases cannot create this marker.

The private SQLite regression closes/reopens the original host, verifies the same deadline and retained original lease, rejects an incorrect lease, leaves a different queued repair unchanged, and permits a real fixture-model retry only after the deadline. Expiry is not a recovery or completion receipt. Source-only review, native Brain and full vault test totals are recorded with the promoted immutable head in #1907. Other gateway/background inference paths remain outside this signed-runner guard.

Independent review also reproduced an existing result-receipt path invoking a vector model despite the new cooldown. A strengthened regression first observed two provider calls instead of one. The result handler now saves the existing pending outcome row while omitting only its exhausted inference binding during cooldown; it retains the receipt and original job/source progress. Claim-time recall and result-memory embeddings are covered; independent background indexing remains outside this change.

Actual provider recovery, private authoritative export/common consistency boundary and old-writer fence, approved non-phone inference/API host, live owner conversation, signed engineering and Android/offline-phone acceptance remain open. Next step: independent exact-source review and CI/source promotion, followed by the private export/fence and approved inference-host verification. No new cart, installation, subscription or production switch is part of this change.

## Continuation · ordinary source repairs through existing GitHub builder

2026-11-28 UTC, branch `fix/bubbles-direct-engineering-1907-20261128`,
baseline `a33425fec3ac7593f626f2b5b9f9065ff9f29bde`. One additional routing
source session under the same #1907/#2110; overall acceptance percentage and
remaining sessions unknown. Production lease/fence/task-session ID remain null.
State: source tested / live execution unverified, 🔵. Source promotion, release
and actual owner operation are separate receipts in the canonical issue.

Fresh Moltnook [run 46167576232](https://github.com/www-infinity4/Moltnook/actions/runs/46167576232),
job `141048420051`, passed existing GitHub credential connection and source
checks but failed remote `claim` HTTP503 / `runner_operation_unavailable`.
The original Termux tunnel still reports down/zero connections, and no private
Termux execution receipt was supplied. No additional live claim or model call
was triggered merely to reproduce that known outage.

Source inspection found ordinary explicit repository writes were forced into
D1 work-ticket creation, although the existing owner-authenticated
`/work/github` builder already stages pinned source through GitHub with its
original model, independent source review, repository lease and persisted
operation receipts. Bounded plain-text single-repository source repairs now
reuse that builder. It remains Cloudflare-hosted for authentication, original
Workers AI and durable receipts; this is not the full SQLite/GitHub migration.
No new server, model, credential, owner identity, permission or backend gate.

Explicit selected repositories remain authoritative. Image/card evidence,
requests over the existing 5,000-character direct limit, explicit bot-team
orders and multi-repository batches retain their existing work-ticket
contracts. In-flight/ambiguous direct work follows the original receipt; only
the pre-existing final verified-no-action overflow gate may delegate. Ordinary
chat does not put a second pending copy into the work box or clear its current
draft. Existing owner auth, visitor denial, source/PR/CI gates, queued jobs and
continuation behavior remain. Four canonical entrypoints request the new
`20261128-direct-engineering1` asset revision; draft/recording/update guards
remain intact.

Regression-first tests failed before the shared route existed. Current local
existing Bubbles tools workflow selection: 241/241; additional direct/auth/
timeout/receipt/repository/cache/voice/evidence selection: 135/135. Independent
Pink found explicit bot-team requests entering the plain route; fixed with a
retained-team regression. Real VM tests exercise actual owner frontend HTTP
requests, rejected/embedded sessions, missing responses, explicit repositories
and original payload preservation; backend/model/provider fixtures are not
live inference receipts. Independent final hashes/CI/merge/release receipts
follow in #1907. No new subscription, database deletion, secret reset, private
state export, old-writer drain, traffic/origin switch or phone installation.

Next: exact-head review/CI and eligible routine frontend merge, verify the
published asset, then a real same-conversation authenticated owner repair and
its GitHub source/PR/CI receipts. The existing ticket backlog, rich/bot-team
work, general chat transport, paid-account access and private state migration
remain separately blocked/unverified. Preserve #2161/#2162/#2164 and the
existing owner's jobs rather than treating this routing fix as full recovery.

## Continuation · direct-builder quota guard · 2026-11-28 UTC

Continues the same [#2161](https://github.com/www-infinity4/QuantaPhi/pull/2161),
original head `d1915aa6fd3af77b5707c6f3d27ef7e90217b6a1`. Merged current main
`7303c35458fd45e46a8cd58b3e49c59cd6f0bb14` into the isolated source branch,
preserving both checkpoint histories and released frontend routing. That
routing is merged through #2165 with 92 successful checks, three intentional
skips, actual Pages deployment `46169297083`, bridge deployment `46169298299`,
and public HTML readback of `20261128-direct-engineering1`. It is not an owner
job, model inference or physical Android acceptance receipt.

The original shared cooldown omitted direct GitHub inference. Direct assists
now check the same marker before reservation, and original-model calls use
the existing request-bound repository lease before and after inference. Only
an actual model quota refusal under the still-valid lease can record the
shared marker. Caller/GitHub/checkpoint text, generic rate limits and expired
or replaced leases cannot create it. Known cooldown suppresses optional model
routing; verified catalog matching and non-model metadata remain available.

A direct refusal saves a stable request receipt with `retryScheduled:false`.
Previously saved tool receipts remain intact, including a dispatch accepted
before a later model refusal. A new request during cooldown records
`mutationSubmitted:false` before any executor starts. Expiry does not replay
direct work or establish recovery. New private-SQLite tests close/reopen the
state, retain the original encrypted fixture record and marker deadline, and
permit a new fenced fixture inference only after expiry.

Local existing autopilot selection: 148/148; direct/timeout/routing and actual
SQLite runtime/host/import/listener selection: 71/71; additional owner/work/
credential/receipt boundaries: 73/73. These use synthetic provider/GitHub
fixtures; no live inference or GitHub workflow dispatch was made by tests.
Nine added direct regressions cover cross-lane cooldown, admission/replay,
non-model access, generic failures, partial submitted work, misleading
checkpoint text, optional suggestions, stale fencing and SQLite restart.

State: source tested; independent exact-source review, updated-head CI,
eligible routine source merge and guarded staging remain pending. One
continued quota session; total roadmap progress and remaining sessions are
unknown. Production coordinator lease/fence/task-session ID/expiry remain
null. No new account, subscription, model, credential, owner grant, phone
installation or production writer/origin activation. The November 27 quota
refusal is historical evidence; current inference availability is unverified.

Next executable action: independent Pink review and exact-head CI on #2161,
then verify its immutable staging/source receipt and release gates. Actual
owner job execution, original ticket claim, private authoritative export and
common writer fence, paid-account resource access, approved inference host,
and Android/offline-phone acceptance remain open.
