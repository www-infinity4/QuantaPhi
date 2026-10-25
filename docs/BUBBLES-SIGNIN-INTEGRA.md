# Required Bubbles sign-in and Integra

First-party Bubbles opens after two server-verified account authorizations:
GitHub first, Cloudflare second. The full-page and floating-chat gates use the
same transport and status contract. Their sign-in buttons disappear after both
checks pass. Independent embedded visitor specialists remain separate public
assistants and do not receive owner executors.

The current QuantaPhi wallet/device session partitions connections. A missing
session requires recovery of the existing account, never automatic creation of
a replacement wallet. GitHub identity does not establish repository installation
write permissions. Each executor must independently authorize its operation.
The status response explicitly says `enforced: false`: it describes application
entry, not a new authorization boundary on the public model gateway.

Integra's first implemented responsibility is a deterministic, read-only
connection integrity check. It checks provider configuration, authenticated
wallet partition, encrypted credential integrity, expiration and approved scopes.
A missing credential, failed refresh, partial grant or missing registered scope
blocks readiness. It does not renew consent, deploy, create repositories, transfer
money, or certify the security of the entire application.

OAuth uses server-held PKCE and one-use state bound to the initiating wallet AND
device session. Tokens stay in the existing encrypted Durable Object vault. The
current transport is independent of the historical edge-pinned
`bubbles-connections.mjs`. It rejects authorization URLs whose exact provider,
endpoint or callback differs from the registered current application. Cancellation
restores retry, including closing a popup while `/start` is still pending.

Registered callbacks remain:

- `https://quantaphi.org/api/bubbles/connections/github/callback`
- `https://quantaphi.org/api/bubbles/connections/cloudflare/callback`

A return page removes the query before loading further code. With an opener,
it posts only to fixed QuantaPhi origins and the initiating window exchanges the
code. Without an opener it reuses only the browser's existing session; the server
still verifies the original session and one-use state. A successful exchange
returns to `https://quantaphi.org/bubbles.html`, where both connections are checked
again. No caller-controlled `return_to` URL is accepted. A different browser or
missing session cannot complete consent and is not marked connected.

## Current external blockers, observed 2026-10-25

The connected Cloudflare plugin can inspect Workers settings. The production
`bubbles-connections` Worker has the GitHub client secrets and existing vault,
wallet and StarQuest bindings, but no Cloudflare client ID, secret or registered
scope allowlist. Those must come from the separate Bubbles OAuth application.
The plugin's own authorization cannot be reused as that application's credential.

Cloudflare's OAuth-client API returned HTTP 403, stating no OAuth scope covers
that endpoint and an API token with OAuth Client Read is required. The dashboard
in this browser is at its sign-in screen. The reported disabled Continue button
in the client registration form has therefore not been reproduced or repaired.
No new API token, OAuth grant, scope expansion, or connector replacement is
performed by this change.

ChatGPT's old Cloudflare API connector and current Cloudflare connector are
separate platform connections. Repository code can fix Bubbles' own return flow;
it cannot change a ChatGPT connector's platform-owned callback registration.

## Verification and rollout

Node tests cover consent, session isolation, encryption, refresh, state replay,
callback validation, exact destinations and Integra. Chromium tests use synthetic
accounts with real source modules, callback HTML and the full Bubbles page. They
exercise both sign-ins in order, hidden buttons after verification, cancellation,
no-opener return, revoked/failed checks, module-load failure, locked microphone
entry and Android-view markup. They do not establish a real provider login or a
physical Motorola microphone/overlay test.

Worker health advertises `github-cloudflare-required-v1` and `integra-v1` only
with this source. Staging and live release receipts must be recorded separately
from passing tests. Preserve the existing Durable Object namespace, vault keyring,
wallet and ledger bindings. Never deploy repository defaults over production
bindings or claim Cloudflare sign-in works without registering and testing its
actual client.
