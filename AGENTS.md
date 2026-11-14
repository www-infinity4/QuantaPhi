## Required GPT Builder execution instructions

Before any Bubbles, Moltnook, coupon wallet, Quick Card, or Continuity Builder job, read [docs/BUBBLES-GPT-BUILDER-ROUTING.md](docs/BUBBLES-GPT-BUILDER-ROUTING.md) and the owner’s existing issue/PR. This is an actual work order, not permission to stop after a reader report. Route by need: full-context Red reads unknowns; Orange decides real ambiguities; Blue imports only validated data; Green writes/test/repairs; Pink independently checks; GPT Purple arbitrates; Black verifies release evidence. Known scoped repairs begin with Green. Use the existing signed owner executor and same work ticket, not a newly invented agent token or a duplicate issue. Apply established owner preferences without repeatedly asking. Record actual commit, tests, PR, merge, deployment, and Android receipts separately.

# Bubbles connection

For Bubbles conversational testing, read `docs/BUBBLES-GPT-CONNECTION.md` first.
Use Moltnook's existing `bubbles-owner-message.yml` signed server `assist`/`result`
route. Do not substitute the old browser-polled `submit` route or request a new
wallet/token merely because an owner chat is closed. Respect the existing
five-day approval and revocation; this route cannot renew it.

Use non-sensitive synthetic prompts in the public workflow. Inspect the actual
returned answer and tool receipt. Accepted/working is not completed execution.
This conversation route does not establish phone control, owner archive access,
GitHub write authorization or APK-to-website synchronization. Keep those checks
on their existing authenticated adapters.

## Mandatory unfinished work tracking

Before creating or editing code, read [`work/unfinished/README.md`](work/unfinished/README.md)
and [`work/unfinished/INDEX.md`](work/unfinished/INDEX.md), search existing GitHub
issues and PRs, and reuse a matching ticket. Every unfinished build must have a
numbered issue, a durable per-session checkpoint, evidence-backed dot color,
progress estimate, sessions spent/remaining estimate, blocker and next action.
Update the ticket after every work session. Do not erase unfinished work or
close a ticket merely because CI passed; completion requires actual acceptance.
