# #1907 · Local Brain execution persistence

- Canonical work: [Brain #1907](https://github.com/www-infinity4/QuantaPhi/issues/1907), migration coordinator [#2110](https://github.com/www-infinity4/QuantaPhi/issues/2110).
- Owner request: preserve the existing Brain, credentials and jobs; remove critical Cloudflare queue/database dependency; restore actual engineering rather than produce recovery carts.
- Source baseline: QuantaPhi `db79ac5` (main at checkout); Moltnook `1c01415` (main at checkout). Branches: `feat/brain-sqlite-runtime-1907-20261127`, companion `feat/brain-origin-1907-20261127`.
- Observation: [Moltnook 45940054349](https://github.com/www-infinity4/Moltnook/actions/runs/45940054349), execute job `140312056180`: OIDC bridge succeeds, then `BRAIN_RUNNER_CALL_FAILED` at `claim`, HTTP 503. The public sanitized response alone cannot identify the exact underlying D1 error.
- Agent: GPT Brain; source implementation and independent Pink review. No production coordinator lease was obtained: lease ID, fence, task/session ID and expiry remain null. Isolated source branches do not claim a signed production job.
- State: 🟡 `source_tested / review_pending`; total progress and remaining sessions unknown. One documented source session; a local milestone is not completion of the six-stage owner roadmap.

Implemented the existing Brain worker over an existing private SQLite work DB and existing portable durable-state DB; original signed OIDC, ticket selection, owner boundaries, lease fencing and result projection remain unchanged. Companion Moltnook configuration removes the hardcoded execution destination while preserving the existing default and refusing redirect/fallback. Writer remains inactive pending controlled cutover.

Regression-first RED: both new suites failed on missing implementation modules. GREEN: existing deployment entrypoint 28/28 tests, including real HTTP, claim/replay/restart, blocked-result readback, owner/security scope, private files, original-key requirement and occupied-listener preservation. Moltnook connection/identity/idle/context suites 30/30. Later exact-head CI and source review receipts belong on #1907 when actually observed.

Unresolved: live state export/import parity and old-writer fencing; configured original inference binding; private HTTPS reachability; integration into the existing Termux supervisor; local Bubbles conversation and detector intake; real owner-session/auth preservation; actual signed engineering PR/test/merge/deploy loop; Android/reboot verification. No production variable, DNS, grant, credential, wallet, service, subscription or device process changed.

Next executable action: complete independent source review, exact-head CI and permitted inactive-source merges; then verify the actual host/configuration and private state migration before any writer activation or runner-origin change. See [runtime contracts](../../distributed-vault/SQLITE-BRAIN.md).
