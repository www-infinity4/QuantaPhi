# Bubbles owner bridge: verified connection and batch acceptance

## Use this route in subsequent sessions

The working transport is the existing Moltnook runner, not a new Chrome wallet login.
QuantaPhi PR #806 added `workers/bubbles-cloud-browser/runner-bridge.mjs` and the
server-only `POST /v1/browser/chatgpt/runner` route. Moltnook's
`.github/workflows/bubbles-owner-message.yml` obtains GitHub OIDC with audience
`bubbles-owner-message-bridge`. The Worker checks the exact repository ID,
workflow path, main ref, event and short lifetime before touching the queue.

Both existing owner-issued five-day approvals must still be active. This route
cannot enable permission, create an owner session, mint a wallet or return a
credential. No password belongs in source, chat, APK resources or workflow logs.

Messages go through the Worker's native `BRIDGE_DB` binding into
`bubbles_chatgpt_bridge` in `rogers-consensus`. The owner-authenticated Bubbles
page processes them and records the answer. The signed runner can read only
its own processing status; private reply text is not published in GitHub logs.
The queue ID is fixed by the authenticated GitHub run. A retry cannot replace
the message or extend its four-minute expiry. A fresh test needs a new run,
not a rerun of an expired message.

## Evidence and exact limits

- QuantaPhi #805 repaired combined consent and late owner restoration.
- QuantaPhi #806 added signed server transport; 26 staging tests passed.
- Moltnook run `39524866024` deployed version
  `91953222-9f57-4b45-81f5-16108485fcbe` at 100%, preserving bindings.
- Moltnook run `39524926946` accepted a real message under both active grants.
  It remained queued for the entire observation period. This proves transport
  and approval checks, **not a completed two-way conversation**.
- The Cloudflare connector failed even on constant JavaScript with no API call.
  Moltnook's existing deployment credential worked for Workers but D1 REST
  returned 403. The signed route uses the native binding and avoids that D1
  REST permission requirement. Do not keep retrying an unrelated dashboard login.
- The old page skipped polling whenever `document.hidden`. The background
  polling repair removes that check while retaining authentication, consent,
  single-flight execution and explicit revocation. Browser/OS suspension or
  closing the app can still stop processing; background runtime is not guaranteed.

## Batch acceptance: source tests are not phone receipts

| Area | Natural request or check | Required evidence |
| --- | --- | --- |
| Bridge | Acknowledge this connection check without running jobs | Accepted message followed by completed owner-chat receipt |
| Weather | What's the weather in Albia, Iowa? Then compare Lovilia and Ottumwa | Matching locations, provider time and real tool receipts |
| Search | Search for the latest discoveries in hydrogen energy | Actual search sources, dates and an answer tied to evidence |
| GitHub read | Read the QuantaPhi README and explain its current setup | Exact repository, file ref and read receipt |
| GitHub write | Add a small diagnostic README in the authorized Test Ground repository | Verified owner identity, commit SHA and independent readback |
| Website | Build a simple Test Ground AI page with Oracle styling | Source, tests, deployment receipt and rendered page |
| History | Import a small synthetic ZIP with two conversations, then reopen each | Separate identities, preserved messages, repeat-import deduplication |
| Shared session | Open the same test conversation in APK and website | Same server conversation and owner partition; no replacement wallet |
| Recording | Start/stop, immediate stop, repeated stop, background stop | Real Android output file and no crash; source tests alone are insufficient |
| Voice | Select an installed voice, interrupt speech, keep listening | Actual phone playback and microphone continuity |

PRs #786 (semantic tools) and #788 (ZIP/history) were drafts with conflicts when
reviewed. Inspect and resolve them against current main before integrating;
do not claim those unmerged changes are live. Never use a real private archive
as a test fixture or publish personal chat contents in repository receipts.

## Continue a rollout

1. Read this file and the current workflow before choosing a connection method.
2. Verify deployment source and existing approvals; never infer owner access
   from a local flag or a successful queue insert.
3. Send a harmless message first. If it stays queued, investigate the Bubbles
   consumer, page lifecycle and owner verification instead of minting more tokens.
4. Run focused regressions, then the planned cross-feature batch after changes.
   Preserve test counts and real failures; don't fabricate phone validation.
5. Consult Gemini on relevant source/design evidence. Review its suggestions
   against actual code; model agreement is not an execution receipt.
6. Stage and promote through Moltnook's existing credential with exact source
   pins and binding equality checks. Keep private data and credentials out of logs.


## Verified rollout receipt — 2026-10-21 UTC

- QuantaPhi PR808 merged as3a5b67b636365bb9f77bdab48d95ed38ab354a97 after30 successful PR checks. Local broad Bubbles/owner suite:585 passed,0 failed. Background mount tests cover hidden approved dispatch/completion, revoked approval, missing owner proof, and single-flight overlapping ticks.
- Pages run39526457438 succeeded. Canonical Bubbles HTML was separately verified serving `bubbles-ai.js?v=20261020-background-bridge1` after raw-origin propagation; successful Pages status alone was insufficient. Versioned chat JS imports the matching new browser module.
- Live probe39526551991 was accepted then blocked; do not describe it as successful. Diagnostic source PR809 merged asfd3c9d390dc89888f571e6d011f22c4e77f72584 after12 successful checks. It returns only allowlisted failure categories for its own run, never private reply text or arbitrary errors.
- Initial diagnostic staging39526939672 uploaded at0% but correctly failed provenance because the staging verifier retained the previous source pin. PR116 aligned the verifier; repeat staging39527049477 passed27 tests and all binding/unchanged-traffic checks.
- Release39527169009 verified candidate`ca919853-d49e-4933-ae74-31736b30e334` at100% with identical bindings and sourcefd3c9d3.
- **Live signed Bubbles acknowledgement succeeded:** Moltnook run39527225018, job118984615025. Accepted/queued01:25:30UTC, working01:25:39UTC, complete01:25:47UTC. The private reply remains in owner chat. This proves the approved message round trip, not hardware access or arbitrary job execution.

### Live UI acceptance findings

These checks used a separate cloud browser without a verified owner wallet; they do not certify APK/web owner-history synchronization.

- Individual Albia, Lovilia and Ottumwa Iowa weather prompts returned town-specific conditions, observation timestamps and`weather.current · complete` receipts.
- Hydrogen web search returned source excerpts, clickable publisher URLs and`web.search · complete`. This does not prove full publisher pages were read.
- **Open defect:** “What is the current weather in Albia, Lovilia, and Ottumwa, Iowa? Include the observation time and source for each. Tell me if you cannot verify a location.” returned only Albia. Do not mark multi-location acceptance complete. Reproduce and repair the shared-state list/trailing-sentence parser; require an explicit result or failure per requested town.
- **Open defect:** “Read https://quantaphi.org/bubbles.html and tell me what account connection requirements it actually states. Use the page content and say if you cannot fetch it.” entered the public GitHub-file route and returned`github_file_read_failed`. A public webpage URL ending in.html must not be misclassified as a repository file. A real website-read receipt remains required before claiming page content was fetched.
- Physical Android screen-recording lifecycle, microphone/voice, installed APK version, cross-device history and private ZIP import remain unverified. Draft conflicting PRs786/788 are not release evidence.
