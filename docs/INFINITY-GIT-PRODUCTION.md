# Infinity Git Production · Bubbles handoff contract
Status: source implementation in draft PR #1272; not a production deployment.

## Real sequence
1. Copilot — GitHub App OAuth popup, select an authorized repository, create a documented issue assigned to Copilot agent; a PR is not guaranteed.
2. Gitpal — fetch original \`Infinity Copilot:\` issues and PR body, changed files and messages. Compare intent with evidence. Bubbles' existing Gemini → Claude consultation is read-only and requires an explicit click. Story Writer AI is **not** yet a separately verified GitHub reviewer or executor.
3. Gitpin — preserve repository, PR, changed filenames, commit SHA and source links. No copied browser credentials.
4. Gitpro — post explicit improvement requests to a PR. A merge requires exact typed target, a verified independent approval, completed successful CI checks, a matching PR head SHA and GitHub server approval.
5. Gitflow — inspect source and tests for actual progression. A dispatch or an AI answer does not equal completion.
6. Gitmap — record impacted folders and relationships, with evidence.
7. Gitpub — require official deployment job receipt and exact deployed revision readback, separately from merge; no GitHub merge automatically means Cloudflare deployment.
8. Git-Stream — show actual PR activity/messages and immutable handoff receipts.
9. Gitcoin — last stage; only verified *merged* code contributes to a bounded **read-only preview**. Existing Gitcoin token rules remain intact until a revised reward ledger is explicitly designed and tested.

Other independent Git Quick Cards are git (deployment), Gitdad, Gitpal- and Clone-of-Gitpal. Do not present them as mandatory build steps. Gitpulse, Gitarch, Gitscan, Gitsync, and Gitial are described in the Gitflow family but were not found as accessible standalone repos at authoring time, so they are not fake live cards.

## Evidence and learning
A proposed cross-Git learning event has:
- source user/account and author consent (no browser tokens);
- repository full name; issue ID; PR number; exact head and merge commit SHAs;
- declared requested outcomes and links; changed filenames and bounded diffs;
- separate review, CI, merge, deployment and Cloudflare readback receipts;
- a reviewer attribution and immutable, idempotent event ID.

Never store or transfer private Copilot chat conversations automatically. An issue body is available only when GitHub returns it through the user's authorization. Reconcile it with a PR and seek clarification if they cannot be linked confidently. Infer no missing Cloudflare permissions from a GitHub account.

Gitpal's **AI audit** button uses the existing \`bubbles:ai-consult\` event with \`gemini_claude_review\` mode after explicit consent. It returns text, not tool authority. Work that Copilot cannot complete, including Cloudflare database creation, belongs to a separately owner-authorized Bubbles/Brain executable job, not a simulated UI success. Pending jobs must show an actual job receipt before being considered started.

## Gitcoin boundary
The currently implemented \`/github/copilot\` action \`merged\`:
- reads up to 60 recently closed PRs in one authorized repository;
- considers up to 10 verified merged PRs with a valid merge commit SHA;
- counts additions in eligible code files, excluding docs, packages, vendor, generated and distribution directories;
- shows evidence-only counts and clearly indicates incomplete pagination;
- mints **zero** tokens and changes **no** wallet balances.

A production Gitcoin credit engine needs a user-approved conversion formula, contributor ownership rules, line eligibility and deletion/rename handling, durable immutable per-merge receipts keyed by repository+PR+merge SHA, an idempotent ledger, dispute reversal and a recovery-safe wallet bridge. A display such as "1,232 Gits created" is only valid after actual signed wallet receipts total 1,232, not because a frontend multiplied file additions.

## Acceptance gates
Run CI (including \`test/git-production-cards.test.mjs\` and Copilot API/auth tests), independent security review, staging and Android OAuth checks for at least two isolated user accounts, an authorized GitHub PR end-to-end, an independently reviewed merge, and deploy readback. Do not merge or publish solely because source was committed.

The source changes intentionally do not expose a Copilot private-chat scraping API, directly exercise an unverified Cloudflare action, or silently auto-mint currency.
