# Zeus 6.2 — Session history color dots (October 29, 2026)

## Objective
Add a private, accessible session progress panel to Infinity Coliseum Zeus 6.2, using red/green/blue/yellow/orange dots. Sessions and work items carry evidence, not merely a decorative status. The design also describes a possible OpenAI product feature for conversation history, but **QuantaPhi cannot modify ChatGPT's native chat-history sidebar**.

## Two independent color systems
The [canonical Infinity Color State Machine](https://github.com/www-infinity4/INFINITY/tree/main/docs/color-state-machine) uses colored **robot operation** codes (red reroute, green engineering, orange CEO decision, etc.). Keep those contracts unchanged. This feature uses colors only as **session history states**, in a separate field.

| Session dot | Meaning | Transition |
|---|---|---|
| Red | Unfinished, outstanding ordinary work | Record evidence, or carry work forward |
| Green | All work items have a user-recorded outcome | Begin the next numbered session in the same project thread |
| Blue | Unfinished import or AI-answer task | Supply and record an outcome/import receipt |
| Yellow | Exact source extraction needs routing | Copy the exact text with its source into a focused thread, creating a blue import task |
| Orange | This local thread is marked full | Preserve original history, generate handoff, copy any unfinished items to a continuation thread |

Yellow preserves exact source text as entered; it is never AI-summarized or modified during handoff. New continuations preserve task description, origin and the old thread ID. Orange is manually set for a continuation or reached at the 12-session **local demo** limit. It is **not** a measurement of a third-party AI's context window.

### What ships
- Self-contained, device-local session-status panel inside /coliseum/index.html.
- Per-thread history with numbered sessions, a history status dot and action items.
- Evidence entry required before a task can be marked done. Green requires all tasks to be marked done with receipts, not just a button press.
- Blue for pending import/answer; yellow for exact source extraction, with a one-click focused thread and the original text preserved.
- On green, a next-session button keeps existing completed sessions green.
- Orange continuation copies unfinished items to a new private local thread without rewriting the original.
- Owner-selectable plain-text handoff for use in another permitted chat session.
- Accessible dot names and labels, with color never used as the only indicator.
- Tests under test/zeus-session-history.test.mjs.

### Truth and privacy boundaries
The UI labels outcomes as **user-entered**, not independently verified. There is no fake AI thinking feed. The status line reflects actual in-browser user actions; it does not expose chain-of-thought, execute robots, or autonomously finish jobs.

Browser localStorage is not an authorized cross-device storage system. The feature does not access ChatGPT conversation history, automatically create ChatGPT threads, scrape accounts, import conversation messages from providers or publish stored text. Existing Cloudflare wallet, shared Coliseum rooms, connected Bubbles assistant and beta permissions are untouched.

A future supported account-connected implementation would require explicit user consent; provider-authorized history access; private server-side storage; reversible and auditable session-to-task mapping; validated receipts from destination systems; API models/provider identification; provenance-preserving extracts; and tests for concurrency, privacy, export/deletion and scope handling. No public owner chat content should be committed into source control.

### OpenAI product suggestion
The same five-dot legend can be proposed as a **user-visible task/workflow layer** next to conversation titles, with visual states updated only when supported evidence or user action confirms the event. Do not imply ChatGPT's hidden reasoning is available, or that a model really ran work when it did not.

## Verification and release
1. Run node --test test/zeus-session-history.test.mjs
2. Confirm color precedence (yellow before blue before red, green only after all outcomes).
3. Test Android/mobile layout and storage-denied fallback; handoff text must remain selectable.
4. Review PR CI and site deployment. Source control changes do not equal live publication.
