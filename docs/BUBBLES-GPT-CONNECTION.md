# Reusable GPT connection to Bubbles

Use the signed **server conversation** route for conversational acceptance tests.
Do not use the old browser-polled `submit` operation when the purpose is to talk
to Bubbles without an open owner chat.

## Route

`POST https://bubbles-cloud-browser.marvaseater.workers.dev/v1/browser/chatgpt/runner`

Authentication is the existing short-lived GitHub OIDC identity from
`www-infinity4/Moltnook/.github/workflows/bubbles-owner-message.yml` on `main`,
audience `bubbles-owner-message-bridge`. No permanent GPT key is embedded in code.
Both existing five-day grants must be active. The route cannot renew them.

Send `{"operation":"assist","text":"a non-sensitive test question","turn":0}`.
The authenticated server request stays open while Bubbles answers, with a
90-second gateway deadline. The signed runner uses a 120-second request deadline.
It does not depend on request `waitUntil`, an alarm, or an open browser. The
result is saved before returning the server job receipt. Poll using
`{"operation":"result","turn":0}`. The verified GitHub run fixes the result
namespace; another run cannot read it. Turns 0–9 are supported, each independent.
Results expire after four minutes. Retries preserve the question and expiry and
do not execute twice; a conflicting replacement returns 409.

The result includes `output`, the actual tool/status receipt and source URLs.
`state: complete` means a Bubbles response was delivered; the tool receipt still
determines whether the requested action succeeded. A model answer is not an
execution receipt. Record actual failures and partial answers.

## Instructions for future GPT sessions

1. Read this file and the current Moltnook message workflow.
2. Use the existing signed `assist`/`result` route. Do not request a replacement
   wallet, copy browser cookies, invent a bearer key, or renew owner approval.
3. Run non-sensitive synthetic conversational tests through the configured
   Moltnook workflow. A workflow dispatch is supported; if the current connector
   cannot dispatch, a reviewed change to that workflow triggers its push event.
4. Read the workflow's actual result receipt and compare the answer with every
   part of the question. Never treat accepted/working as an answer.
5. Keep test prompts and public logs free of private data. This route sends only
   its submitted question to the public Bubbles gateway and has no owner archive,
   wallet credential, physical Android control, or GitHub write authorization.
6. For owner-only work retain the existing verified owner adapters. Server chat
   connectivity does not prove APK/web sync or authorize a privileged action.

## Deployment and rollback

Stage the exact reviewed QuantaPhi commit using Moltnook's existing
`bubbles-cloud-browser-stage.yml` and its matching verifier source pin. Preserve
all existing binding identities and traffic during staging. The sole added binding
is `TOOLS`, a service connection to the existing public `bubbles-tools` gateway;
it contains no owner credential. Promote only the
verified candidate using `bubbles-approval-release.yml`, checking source pin,
equality of all existing bindings, the exact added `TOOLS` service, and production readback. Rollback promotes the recorded prior
version. Consent records remain in the existing Durable Object.

The public `/health` marker is `serverConversation: signed-server-v2`.
That marker alone is not a completed connection test. Require a real signed
`assist` followed by a `result` containing a Bubbles answer.

Source tests: `node --test test/bubbles-server-assist.test.mjs
test/bubbles-runner-bridge.test.mjs test/bubbles-chatgpt-bridge.test.mjs`.

Deployment and live acceptance must be recorded separately from passing source
tests; do not claim this route is live from the presence of this document.
