# Claude steward for Bubbles

Owner-only Claude that talks to the owner directly and can inspect Bubbles' real source.

## What it is
- `claude-card.js`: floating **Claude** button (bottom-left) with a chat panel. Loaded by `bubbles.html`; any page can add `<script defer src="/claude-card.js"></script>`.
- `POST /v1/claude/steward` on `infinity-rogers` (`workers/infinity-rogers/claude-steward.mjs`): owner Bearer verified through the existing BRAIN binding, then Claude with four tools: `search_file`, `read_file`, `propose_patch`, `file_fix_ticket`.
- Bubbles chat: say `fix yourself` or `claude, <question>`. Bubbles hands the turn to the card.

## Authority (unchanged gates)
- Read-only source access (public raw GitHub, else Brain's owner read). No push, merge or deploy.
- `propose_patch` is verified: `old_str` must occur exactly once in the live file. Nothing is applied.
- `file_fix_ticket` (fix mode only) creates a **draft** Robot Brain ticket, never `start_immediately`. **There is no generic `/work/tickets/approve` action for drafts**; that route only approves a blocked UI-decision job. To make a draft runnable the verified owner must review an explicit repository-scoped `color_jobs` plan with `TASK-N` IDs, instructions, dependencies, and acceptance criteria, then POST `/work/tickets/update` with `{id,status:'ready',context:{kind:'robot-directions',color_jobs:[...]},storyboard}`. Brain validates job structure, updates the owner-partitioned D1 ticket, and separately asks the runner to pick eligible work. Runner execution, GitHub commit, merge and deployment must each have their own receipts. The Claude card currently prepares proposals; it does not do this plan review/promotion automatically.
- Recent Bubbles chat sent as evidence is labelled untrusted data. The owner Bearer is never sent to Anthropic.
- Receipt always states `githubChanges:false`, `deploymentVerified:false`.

## Config
Uses the existing `ANTHROPIC_API_KEY` secret on `infinity-rogers`. Optional var `CLAUDE_STEWARD_MODEL` (default `claude-sonnet-5-5`).

## Tests
`node --test test/claude-steward.test.mjs`

## Deployment prerequisites and patch export safety
- The guarded `deploy-gemini-card.yml` checks both encrypted Anthropic and Gemini secret **bindings**, the `BRAIN` service binding, runs `test/claude-steward.test.mjs` and a Wrangler dry-run before production promotion. These checks do not prove secret **validity** or authenticated provider responses; verify those with a separate owner-authorized synthetic live test.
- The exported Termux script requires a clean checkout, creates a new branch, replaces uniquely matching local source text, stages only proposed paths, uses the ordinary GitHub remote URL and `gh auth setup-git` for credential handling. It does not store a token in a Git remote URL. Always review a patch before applying.
- Current Brain `ownerTickets` saves `source_app` using its fixed `QuantaPhi Robot Brain` label, even when the steward sends `Claude Steward`. The ticket's context marks `proposed_by:claude-steward`, but source-app attribution should not be claimed as verified until separately supported.
