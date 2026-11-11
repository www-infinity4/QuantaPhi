# Universal automation — verified-pattern handbook (QuantaPhi #1913, #1912)

Canonical jobs: [#1913](https://github.com/www-infinity4/QuantaPhi/issues/1913), [#1912](https://github.com/www-infinity4/QuantaPhi/issues/1912); parent [#1908](https://github.com/www-infinity4/QuantaPhi/issues/1908). No separate paid runtime or unreviewed fork code is installed.

## Existing engine, not a parallel automation service

- Entry: QuantaPhi Bubbles signed owner workflow, owner-scoped Brain intake and Moltnook `agents/repository-engine/runner.mjs`.
- Control: canonical issue and dedupe key → signed job claim and lease → pinned source → source patch on isolated branch → tests → independent Pink review → Purple decision → GitHub guarded merge → separately authorized deployment and browser receipt.
- Durable source and lease checkpoints belong to the existing Brain coordinator, GitHub issues, PRs and `work/unfinished`. A recipe descriptor is *not* a persisted job, a scheduler or an approval.
- Observed event names should carry ticket, repo, exact head, run ID, step, time, result and blocker. Never synthesize a successful action event.
- Existing color roles remain the only orchestration roles; reading source or showing an AI response is not execution.

## Available source implementation

- `quanta-feed-search-assist.mjs`: deterministic suggestions from `ALL_FEED_CARDS`; only explicit source URLs using HTTPS or safe internal paths. No off-site query, hidden tracking, account reads, autofill into third-party forms, or automatic submit.
- `quanta-feed.mjs` and `quanta-feed.css`: original Oracle/Quick Card feed; the search region appears when a visitor types at least two characters. Tapping a suggestion fills *only* the feed's own search; choosing Original source opens the validated destination after a separate tap. Escape closes suggestions. The source card, wallets and ranking remain intact.
- Moltnook `agents/repository-engine/automation-recipes.mjs` and `color-task-routing.mjs`: seven typed recipe descriptors and safe advisory routing in the existing engine; no authorization or persistency is granted by a descriptor.

## Seven reusable recipes

| Domain | Trigger examples | Source and action | Required boundary |
| --- | --- | --- | --- |
| GitHub | issue event, schedule, manual | existing issue → dedupe → claim → patch → exact-head CI → review | signed writer/lease, reviewer, branch policy |
| Quick Cards | owner manual / catalog event | verify official page and rights → draft → Android test | source license, independent review, approval to publish |
| Creative production | brief/event | generate draft from owner brief → verify content rights | no paid model call or public publishing without authorization |
| Media | schedule/event/manual | check media license → dedupe episode/stream → queue source-backed candidate | no unlicensed stream or automatic public posting |
| Product development | catalog event/manual | official product detail → stock, price and rights freshness → reviewed card | no checkout, order or merchant-account change |
| Public research | scheduled official-source poll/manual | compare provenance and dates → cited draft | no account scraping or invented fresh claims |
| Owner routine | scheduled/webhook/manual | confirm user scope → resume checkpoint → draft authorized action | no sending messages, filling sensitive forms, changing settings or spending without per-action consent |

Every trigger maps to a stable owner-scoped job identity; a new poll must not duplicate a completed effect. At-least-once delivery demands idempotency (same issue/action key, immutable source SHA, readback). Use a bounded three-attempt retry policy **only for safe idempotent steps**; backoff and mark blocked on expired leases, permanent authorization failures, conflicting writes or exhausted attempts. Do not replay a purchase, message or wallet debit on retry. The existing coordinator must store checkpoint, lease fence, last attempted stage and next retry before any real durable continuation is claimed.

## Official pattern references

- [Microsoft Agent Framework orchestrations](https://learn.microsoft.com/en-us/agent-framework/workflows/orchestrations/): use sequential stages and independent roles; parallelize independent reads, not conflicting writes.
- [Microsoft checkpoints](https://learn.microsoft.com/en-us/agent-framework/workflows/checkpoints/): persist executor state and pending requests, stable executor names and resume from the same checkpoint. No Microsoft runtime added to QuantaPhi.
- [Microsoft human-in-the-loop](https://learn.microsoft.com/en-us/agent-framework/workflows/human-in-the-loop): use explicit tool approval/request-response before external effects, while preserving the existing Bubbles consent mechanism.
- [n8n error handling](https://docs.n8n.io/flow-logic/error-handling/): route failed executions to a shared, factual failure receipt rather than resetting a ticket.
- [n8n retry execution](https://docs.n8n.io/build/understand-workflows/understand-executions/view-all-executions): retry from saved execution and check already-completed side effects before replaying.
- [n8n queue mode](https://docs.n8n.io/deploy/host-n8n/configure-n8n/scaling/enable-queue-mode): separate intake from workers; continue to use the existing Brain lease mechanism, not an unconfigured Redis/n8n service.

## Fork/source audit — pinned, no code import

1. `www-infinity4/AI3`, observed head `83c286c3f9d564ac5575c6747ce28000cbce4122`; README explicitly directs readers to `microsoft/ai`; top-level LICENSE is **MIT** (Microsoft). An extensive `.gitmodules` links many Azure Machine Learning, Python notebooks, Kubernetes, Databricks and other Microsoft/Azure examples. This is a samples/architecture aggregation, **not** Microsoft Agent Framework. Individual submodule licenses, security posture and compatibility remain unreviewed. No executable import.
2. `www-infinity4/ai`, observed head `70e45d5878494be4b66e325187f865951025059e`; top-level package metadata names upstream `https://github.com/vercel/ai`, the Vercel AI SDK; top-level LICENSE is **Apache-2.0**. Workspace declares `pnpm@12.14.0`, Node `^22.13.0 || ^24.0.0 || ^26.0.0`, Turbo, TypeScript 6, Vitest and many provider and example packages. There is no single verified deployed SDK version from the root private workspace package. The broad dependency tree, adapters and paid-provider paths require separate security/license review. No dependency added.

These upstream identities are supported by pinned README/package metadata; original fork-parent ancestry and full recursive dependency provenance were **not** independently verified by fork metadata, so they must not be treated as a completed supply-chain audit.

## Current acceptance and remaining work

Source-level catalog suggestion tests, URL guard, no-auto-submit, scoped Android CSS and signed-recipe policy are covered in PR checks. Real remote search answers and optional *sensitive* autofill are intentionally not connected; future implementation requires authenticated provider, explicit field-level permission and negative-path tests. Durable trigger creation, cloud persisted recipe checkpoints, actual per-domain action invocation, browser Android device proof, independent GitHub reviews and production deployment are separate acceptance gates with their own receipts. Do not claim they are live simply because this handbook and source exist.
