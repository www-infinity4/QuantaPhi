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

Unresolved: live state export/import parity and old-writer fencing; configured original inference binding; private HTTPS reachability; integration into the existing Termux supervisor; local Bubbles conversation and detector intake; real owner-session/auth preservation; actual signed engineering PR/test/merge/deploy loop; Android/reboot verification. No production variable, DNS, grant, credential, wallet, service, subscription or device process changed.

Next executable action: verify the actual existing Termux Brain host/configuration and original inference adapter, implement consistent private state import and supervisor integration, and establish TLS/reachability and old-writer fencing before any writer activation or runner-origin change. See [runtime contracts](../../distributed-vault/SQLITE-BRAIN.md). Source merge is complete; live migration remains blocked.
