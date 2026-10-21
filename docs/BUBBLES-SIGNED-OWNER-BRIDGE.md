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
