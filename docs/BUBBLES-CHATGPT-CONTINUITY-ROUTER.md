# Bubbles drives the latest eight ChatGPT conversations

The owner starts this flow with `*` in Bubbles, the continuation button, or
“Bubbles, continue unfinished ChatGPT conversations.” Bubbles operates ChatGPT;
this command does not dispatch Bubbles' internal repository builder.

## Account and browser

The expected Google account comes from the private `CHATGPT_LOGIN_EMAIL` Worker
secret. The identifier is returned only by the existing owner-authenticated
`POST /v1/browser/chatgpt/account` endpoint, with no-store responses. Do not put
its value in the public repository, test fixtures, or workflow output.

Bubbles reuses an available ChatGPT tab in its current approved Chrome session.
Fixed DOM actions can click the OpenAI Google sign-in button, choose the exact
configured Google account, or enter that email on accounts.google.com. Passwords,
MFA, CAPTCHAs, unexpected permissions, and an unverifiable or different account
require the owner in the live browser. No password, cookie, token, or hidden
provider state is read or exported. The exact email must be observed in the
ChatGPT account menu before the history loop starts.

Cloudflare Browser Run currently provides a **temporary Chrome session**, not a
persistent profile inherited from the owner's phone or desktop browser. A new
session can require another interactive Google login. This implementation does
not claim persistent sign-in or execution after the Bubbles page is closed.

## Continuation loop

1. Require the existing owner verifier and both active five-day grants. Every
   browser action rechecks them on the server. The generic tools gateway cannot
   bypass the ChatGPT grant; no grant is silently enabled or extended.
2. Read visible sidebar conversation links and pin the first eight unique valid
   conversation URLs. The same set is revisited so the bot's own messages cannot
   reorder the sidebar into duplicate work. Older history is not an archive API.
3. Reuse or create a separate tab for each conversation, keeping active replies
   mounted. Inspect each tab serially, then revisit the same eight every minute.
4. Send only `*` for explicit unfinished work in a completed assistant turn.
   Preserve drafts and wait for active generation or unanswered user requests.
   Questions requiring owner information remain blocked for owner input.
5. Recheck the exact conversation and expected message count at send time; claim
   the composer atomically, insert only `*`, and require exactly that text at
   Send. A new user turn at or after the previous message count must contain the
   star in the exact same conversation. Fast assistant replies are supported.
6. Require a new completed assistant turn observed twice before a later nudge.
   Enforce a two-minute per-chat cooldown; unchanged replies, uncertain sends,
   revoked approval, and transport failures cannot cause blind retries. Stop
   cancels pending waits and prevents the next send.

All conversation checkpoints and tab references remain in memory. They are not
persisted into browser storage, public workflow logs, or the private bridge queue.
Cross-device dedupe and a persistent background browser remain separate work.

## Evidence and release

Local source verification covers 126 tests for sign-in/account isolation, real
CDP request/receipt handling, the loop, drafts, active generation, changed turns,
fast replies, cooldowns, stop, consent expiry/revocation, and existing bridge,
conversation, and Brain behavior. These tests use controlled fixtures.

No live signed-in ChatGPT submission or new reply has been observed for this
feature. Before production promotion, verify the real Google account menu and
sidebar, a single eligible star, new reply, repeat protection, stop, deployed
source/bindings, and Android separately. Keep the PR draft until those live gates
pass. A ChatGPT answer is never independent proof of a repository commit, passing
CI, deployment, APK installation, or completed work.
