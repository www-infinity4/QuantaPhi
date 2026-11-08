# Claude steward for Bubbles

Owner-only Claude that talks to the owner directly and can inspect Bubbles' real source.

## What it is
- **Primary chat:** choose **Bubbles** (default) or **Claude** from the existing model picker beside the Bubbles composer; `bubbles.html`, `bubbles-chrome.html`, `bubbles/index.html`, and `index.html` all load `claude-card.js`. Selecting Claude routes the message to the owner-verified steward and keeps the response in the existing Bubbles thread. The separate floating Claude card remains optional, for inspecting proposals and copying reviewed Termux patch scripts.
- `POST /v1/claude/steward` on `infinity-rogers` (`workers/infinity-rogers/claude-steward.mjs`): owner Bearer verified through the existing BRAIN binding, then Claude with four tools: `search_file`, `read_file`, `propose_patch`, `file_fix_ticket`.
- Bubbles chat: with **Claude selected**, type `Fix Bubbles`, `Fix yourself`, or an ordinary Claude message. With Bubbles selected, legacy explicit `fix yourself` or `claude, <question>` commands remain available. Repair mode proposes source patches/tickets; it does not apply, publish, or deploy them.

## Authority (unchanged gates)
- Read-only source access (public raw GitHub, else Brain's owner read). No push, merge or deploy.
- `propose_patch` is verified: `old_str` must occur exactly once in the live file. Nothing is applied.
- `file_fix_ticket` (fix mode only) creates a **draft** Robot Brain ticket, never `start_immediately`. **There is no generic `/work/tickets/approve` action for drafts**; that route only approves a blocked UI-decision job. To make a draft runnable the verified owner must review an explicit repository-scoped `color_jobs` plan with `TASK-N` IDs, instructions, dependencies, and acceptance criteria, then POST `/work/tickets/update` with `{id,status:'ready',context:{kind:'robot-directions',color_jobs:[...]},storyboard}`. Brain validates job structure, updates the owner-partitioned D1 ticket, and separately asks the runner to pick eligible work. Runner execution, GitHub commit, merge and deployment must each have their own receipts. The Claude card currently prepares proposals; it does not do this plan review/promotion automatically.
- Recent Bubbles chat sent as evidence is labelled untrusted data. The owner Bearer is never sent to Anthropic.
- Receipt always states `githubChanges:false`, `deploymentVerified:false`.

## Config
Uses the existing `ANTHROPIC_API_KEY` secret on `infinity-rogers`. Optional var `CLAUDE_STEWARD_MODEL` (default `claude-sonnet-5-5`).

## Tests
`node --test test/claude-steward.test.mjs test/bubbles-claude-model-choice.test.mjs` (the guarded CI also runs the wider Bubbles regression suite)

## Deployment prerequisites and patch export safety
- The guarded `deploy-gemini-card.yml` checks both encrypted Anthropic and Gemini secret **bindings**, the `BRAIN` service binding, runs `test/claude-steward.test.mjs` and a Wrangler dry-run before production promotion. These checks do not prove secret **validity** or authenticated provider responses; verify those with a separate owner-authorized synthetic live test.
- The exported Termux script requires a clean checkout, creates a new branch, replaces uniquely matching local source text, stages only proposed paths, uses the ordinary GitHub remote URL and `gh auth setup-git` for credential handling. It does not store a token in a Git remote URL. Always review a patch before applying.
- Current Brain `ownerTickets` saves `source_app` using its fixed `QuantaPhi Robot Brain` label, even when the steward sends `Claude Steward`. The ticket's context marks `proposed_by:claude-steward`, but source-app attribution should not be claimed as verified until separately supported.

## Verified staging vs live deployment (2026-11-08)

- PR #1856 exact code head `fe6dbdd06cbe2b05b1def31963447ba5f88ee6f6` passed all 88 guarded Node tests with zero failures and a Wrangler dry-run; overall GitHub checks: 85 success, 4 skipped, none failed.
- Copilot highlighted 13 inline review findings; source fixes were committed and threads resolved. The review state is still COMMENTED, not an independent APPROVED security review.
- Cloudflare's currently deployed `infinity-rogers` version dates to 2026-11-06, before this Claude code. The encrypted secret and service bindings are present but **the feature is not verified live**.
- No merge or deployment may be inferred from green CI. Obtain independent approval, use the repo's guarded release, verify the actual Worker version, then perform a non-sensitive owner-authenticated chat and Android acceptance test.
