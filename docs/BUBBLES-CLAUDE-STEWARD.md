# Claude steward for Bubbles

Owner-only Claude that talks to the owner directly and can inspect Bubbles' real source.

## What it is
- `claude-card.js`: floating **Claude** button (bottom-left) with a chat panel. Loaded by `bubbles.html`; any page can add `<script defer src="/claude-card.js"></script>`.
- `POST /v1/claude/steward` on `infinity-rogers` (`workers/infinity-rogers/claude-steward.mjs`): owner Bearer verified through the existing BRAIN binding, then Claude with four tools: `search_file`, `read_file`, `propose_patch`, `file_fix_ticket`.
- Bubbles chat: say `fix yourself` or `claude, <question>`. Bubbles hands the turn to the card.

## Authority (unchanged gates)
- Read-only source access (public raw GitHub, else Brain's owner read). No push, merge or deploy.
- `propose_patch` is verified: `old_str` must occur exactly once in the live file. Nothing is applied.
- `file_fix_ticket` (fix mode only) creates a **draft** Robot Brain ticket, never `start_immediately`. The owner approves it through the existing Brain flow.
- Recent Bubbles chat sent as evidence is labelled untrusted data. The owner Bearer is never sent to Anthropic.
- Receipt always states `githubChanges:false`, `deploymentVerified:false`.

## Config
Uses the existing `ANTHROPIC_API_KEY` secret on `infinity-rogers`. Optional var `CLAUDE_STEWARD_MODEL` (default `claude-sonnet-5-5`).

## Tests
`node --test test/claude-steward.test.mjs`
