# Timed‑Job Controls for Bubbles

## Description
Create a work ticket to implement timed‑job controls for Bubbles. The user needs alarm‑like automation for channel updates without changing the phone alarm itself.

## Owner Request
Create a work ticket to implement the timed‑job controls for Bubbles in www‑infinity4/QuantaPhi. The user needs alarm‑like automation for channel updates without changing the phone alarm itself. Inspect the existing TV‑database schedule API used by HBO channel‑reader.js. Build the smallest functioning owner‑authorized timed‑job path: choose a permitted catalog item by recorded numeric selection, persist channel/date/slot idempotency and actual receipts, retry transient failures with backoff, and handle America/Chicago DST explicitly. Yellow reads actual source; Blue identifies required services and dependencies; Green implements; Purple reviews; Pink tests duplicate triggers, restarts, DST and channel readback. Do not schedule uncontrolled code edits or claim a channel updated without an observed schedule receipt. If backend deployment is unavailable, retain the blocker.

## Acceptance
- A permitted catalog item can be selected by numeric ID.
- Channel, date, and slot information are persisted idempotently.
- Execution receipts are recorded.
- Transient failures are retried with exponential back‑off.
- America/Chicago DST transitions are handled correctly.
- No code changes are made to the phone alarm.

## Design
The implementation will later use the TV‑database schedule API (as used by `HBO/channel-reader.js`) to fetch schedule data. This ticket scopes the work; actual code will be added in a subsequent PR.

## Dependencies
None beyond the existing repository services.

## Review
✅ Approved by Purple‑Pearl
