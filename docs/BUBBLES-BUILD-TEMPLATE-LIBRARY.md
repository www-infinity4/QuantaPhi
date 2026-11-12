# Bubbles reusable Build Library — issue #1662

**Scope:** Source templates, not permission to edit, import, charge or deploy. A matched template is not a completed database.

## Flow
1. Bubbles recognizes a normal request such as "Build a database of all baseball teams" or "Reuse our site traffic counter".
2. The local template registry (bubbles-build-templates.mjs) chooses existing source paths, reusable UI/data patterns, guardrails and acceptance tests. The exposed build packet has state=plan_only, sourceReadVerified=false, writeAuthorized=false and deployed=false.
3. A real build must verify repository HEAD, read each selected GitHub file pinned to that SHA with existing authorized adapters, inspect original code, then plan the smallest patch and tests. A source path is not proof of a read or a completed task.
4. Actual source edit, tests, commit, PR review, Cloudflare deployment and mobile readback are independent receipts. No permission, wallet, provider or identity shortcut is introduced.

**Termux / Node (no npm, no paid APIs):**
    node scripts/bubbles-build-template-plan.mjs "Build a database of all the restaurants in USA"
    node scripts/bubbles-build-template-plan.mjs "Create a database of baseball teams"
    node scripts/bubbles-build-template-plan.mjs "Reuse the site traffic counter on another page"
    node --test test/bubbles-build-templates.test.mjs

## Existing templates and provenance
| Template | Reused sources | Data gate |
| --- | --- | --- |
| Restaurants | workers/restaurant-directory.js, data/restaurants/city-manifest.json | Existing Overture snapshot validator + D1; city queue is NOT nationwide coverage |
| Businesses | workers/business-directory.js, business-directory-card.mjs | D1 records + named sources; queued cities are not imported businesses |
| Baseball teams | sports-card-data.mjs, verified-brand-sports-catalog.mjs | Existing MLB game/scoreboard adapter is not a complete team roster database; verify provider and rights |
| Quick Card | quanta-card-actions.mjs, quick-card-preview.mjs | Real image rights and first-party working controls |
| Radio | quick-infinity-radio.js, radio-clubhouse.js | Actual licensed playback and navigation/track failure testing |
| Traffic | site-traffic.js, docs/SITE-TRAFFIC.md | Existing cumulative D1 ledger; provider refresh needs Worker Analytics secret and deployment |
| Button | quanta-card-actions.mjs, bubbles-action-driver.mjs | Click state and accessible controls; server effects require typed authorization/receipts |

## Directory schema rules
Reuse the existing D1 tables for established restaurants and business directories. For new categories, specify stable provider ID, name, jurisdiction, category/league, source_name, source_url, checked timestamp, rights, deduplication and idempotent importer. Separate data coverage from job queue counts. Never fabricate restaurants, baseball teams, businesses, live opening hours, ads, prices or images. Team identity is separate from game results and time-sensitive rosters.

## Production verification
Node tests verify plan classification and negative prompts only. Before claiming Bubbles integrated, test its real signed-in source-read flow; before claiming a new directory, inspect the actual D1 imported rows and live UI; before claiming radio continuity, verify source media and actual Android navigation; before claiming fresh traffic, check refreshStatus and timestamp. Use exact-head CI, review, merge, deployment and phone readback receipts. This file does not prove any of them.

Related: docs/UNIVERSAL-QUICK-CARD-CONTRACT.md, docs/NATIONAL-BUSINESS-DIRECTORY.md, docs/SITE-TRAFFIC.md, issue #1321 and issue #1659.
