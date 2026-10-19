# Bubbles Gemini implementation review — 2026-10-19

Consultation: https://gemini.google.com/app/0b700b89e1017f42

The cloud browser was signed out. This was a fresh review using a description
of the app architecture, not a recovery of the earlier Gemini conversation.
Gemini did not inspect the repository or run the tests.

## Plan recovered through consultation

Verify a complete path: wake phrase → floating conversation → approved screen
context/audio → authenticated backend request → actual response/receipt.
Priorities are wake-only handling, capture lifecycle cleanup, adaptive speech
pauses, finite request waits, existing first-party sessions, and durable job
admission/recovery. Current source already handles wake-only opening and
adaptive pauses, so replacing those with Gemini's skeleton was unnecessary.

## Implemented iteration

The offline recognizer polls partial text every 550 ms. Previously every
nonempty partial could reset the pending turn timer, including unchanged text
repeated during silence. SpeechTurnBuffer now tracks normalized partials;
only changed text extends the timer. Final phrases, delivered turns, and
explicit cancellation reset this tracking. The existing longer waits for
unfinished speech remain unchanged.

Gemini reviewed the implementation description and suggested duplicate,
progression, and reset checks. Those checks are in SpeechTurnBufferCheck,
including 100 repeated partials and a virtual-clock delivery-deadline check.

## Rejected scripts

Do not deploy Gemini's sample backend. Its first KV example used non-atomic
read/write admission, did not store a receipt, and treated header presence as
authentication. Its second Durable Object sketch still used mock authentication
and failed to fence terminal writes against the current lease generation.
After both review rounds Gemini explicitly withdrew its production guarantees.
Existing backend contracts must be inspected rather than replaced with these
snippets. External mutations additionally need downstream idempotency and
reconciliation after ambiguous timeouts; cancelling a client wait is not proof
that server work stopped.

## Verification and next gates

- Executed Java SpeechTurnBufferCheck with Eclipse ECJ 3.38.0 and Java 17.
- Ten existing Node checks passed across adaptive voice/media, speech watchdog,
  and recommended setup.
- No full Android build or Motorola installation was performed for this patch.
- Next phone check: speak a clause, pause with an unchanged decoder partial,
  verify one response, then repeat the same command and verify it is accepted.
- Next backend check: reproduce the recorded pinned-source-window canary
  failure against the current runner; retain actual commit/test/deploy receipts.
- Capture revocation, network loss during a job, duplicate submission, and
  expired-lease recovery still need end-to-end evidence.

## Second iteration: complete-response deadlines

The 0.44.0 signed preview APK was subsequently published in the existing
GitHub release. Next, inspection found that bubblesFetch cleared its timeout
after headers arrived, before callers consumed the response body. A stalled
JSON body could therefore leave authenticated tools waiting indefinitely.

The helper now races one absolute deadline against both fetch and full body
consumption, then returns a buffered Response preserving HTTP status and
headers. It is for finite API responses, not media or event streaming. Timeout
aborts the transport and explicitly leaves server completion unverified.
The existing GitHub recovery path watches the original request ID rather than
submitting a second mutation. Updated script query keys request the new code
from the homepage and Bubbles entry pages without requiring an APK rebuild.

Gemini reviewed the implementation description in the same consultation,
highlighting finite payload scope, bodyless status codes, and the distinction
between client cancellation and server execution. Tests cover a body that
stalls after headers, subsequent request recovery, original-ID GitHub receipt
watching with exactly one submission, HTTP 401 evidence, and bodyless 204.
These are simulated transport checks, not Motorola network or runner tests.
