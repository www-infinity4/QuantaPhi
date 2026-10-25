# Bubbles drives the latest eight ChatGPT conversations

The owner starts this flow with `*` in Bubbles, the continuation button, or
“Bubbles, continue unfinished ChatGPT conversations.” Bubbles operates ChatGPT;
this command does not dispatch Bubbles' internal repository builder.

## Account and browser

The expected Google account comes from the private `CHATGPT_LOGIN_EMAIL` Worker
secret. The identifier is returned only by the existing owner-authenticated
`POST /v1/browser/chatgpt/account` endpoint, with no-store responses. Passwords,
MFA, CAPTCHA and unexpected consent stay in the owner's live sign-in page.

Bubbles reuses the current approved Browser Run session. A scoped server job
keeps that session active after the Bubbles page or Android WebView closes.
The Durable Object retains its session/target references and reconnects after
object eviction. Google cookies remain inside Browser Run; they are not exported
into checkpoints. A Browser Run rollout, crash or explicit close can destroy the
profile. Such a loss pauses the job rather than silently creating a new signed-out
browser. An explicit owner restart may create a replacement after a confirmed
ended-session response. General transport failures preserve the existing session.

## Standing authorization

Every owner command uses the existing Brain owner verifier. Starting also proves
ownership of the specific browser session. The resulting server job has exactly
one capability: inspect the selected history and submit literal `*` to at most
eight pinned conversations. Its deadline is the earlier of the two existing
five-day grants. Each alarm and send guard rechecks those grants and the current
job ID. Stop and either revocation cancel the alarm. No grant is silently enabled,
renewed, or widened into general GitHub, wallet or browser control. No owner
bearer/proof is retained by the background job.

## Durable loop and receipts

1. Use fixed sign-in/account steps and require the configured email to be observed
   in ChatGPT's account menu. A missing or different account pauses for owner input.
2. Pin the first eight unique valid conversation URLs from the visible history
   sidebar. Missing sidebar means no selection. Links pasted into a transcript
   cannot become history. Older history remains available to ChatGPT normally.
3. Reuse or create one tab per selected conversation. One alarm inspects one tab
   every 15 seconds, preserving active replies and keeping Chrome available.
4. Send only `*` for explicit unfinished work in a completed assistant turn.
   Preserve textarea/contenteditable drafts, active generation, unanswered owner
   turns, and prompts requiring owner details.
5. Recheck exact conversation URL, expected message count and a per-editor claim
   synchronously at Prepare and Send. Verify a new user star in that same chat;
   a click or a fast assistant reply alone is insufficient.
6. Persist the sending phase before external I/O. An alarm retry after an uncertain
   send must pause, never resend. Use hashes and message counts for duplicate,
   unchanged-answer, completed-reply stability and two-minute cooldown guards.
7. Restore a fresh owner-only browser view/proof when Bubbles reopens. Status
   summaries contain counts and fixed phase/error codes, without chat URLs,
   titles, messages or live-view credentials. Durable checkpoints contain only
   the necessary private session/tab/conversation references, hashes and counters.

ChatGPT answers never prove a repository commit, passing CI, deployment, APK
installation, or completed work. Those require the relevant executor receipts.

## First-party preview and release

The existing browser Worker can serve an isolated preview under
`/bubbles-continuity-preview/bubbles.html` on QuantaPhi. Build-time
`CONTINUITY_PREVIEW_SOURCE_SHA` pins all Bubbles source to one reviewed Git commit.
The preview shares QuantaPhi's existing owner-authentication adapters and storage;
query parameters cannot choose a source revision. Its Worker route must match only
`quantaphi.org/bubbles-continuity-preview/*`, leaving the public homepage and main
Bubbles source unchanged during live acceptance.

Stage through Moltnook's existing browser staging workflow with matching source
pins and compile-time preview define. Require source checks, independent review,
unchanged production traffic during version upload, and preserved binding/secret
identities. Promote the verified backend candidate using the existing release
workflow; verify health, preview source header, and unsigned-owner rejection.

The main frontend PR stays draft until the real owner Google account, sidebar,
one star and new reply, repeat protection, Stop/restart, and reopened-session
behavior have been verified in the preview. Android installation remains separate.
Do not infer production execution from source tests or a published preview.
