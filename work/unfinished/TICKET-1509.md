---
issue: 1509
project: Bubbles Search Relevance
source_requests:
  - https://x.com/YahooPingcwlz/status/2117318528823124033
state: source_tested
dot: "🟡 YELLOW"
progress_percent: 35
progress_basis: "Code and deterministic local test passed; exact-head CI, independent review, merge, deployment, real Bubbles readback unfinished"
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: ChatGPT engineering session
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
last_observed_at_utc: "2026-11-03"
repo: www-infinity4/QuantaPhi
branch: fix/bubbles-search-relevance-1509-20261103
pr: 1638
merged: false
deployed: false
live_verified: false
blocker: "Exact-head CI, independent review, current main reconciliation and production Worker readback"
next_action: "Inspect PR #1638 exact-head CI failures and clear any blockers before a safe merge"
---

# Bubbles source-based search relevance fix

Canonical ticket: https://github.com/www-infinity4/QuantaPhi/issues/1509
Source post: https://x.com/YahooPingcwlz/status/2117318528823124033
PR: https://github.com/www-infinity4/QuantaPhi/pull/1638

## Verified source work
- Lexical ranking module conservatively promotes original broker results with complete multi-term topic coverage over unrelated trending partial matches.
- Searches up to 20 authentic, source-provided candidate records, selects seven after relevance ranking; no fabricated external content.
- Existing Bubbles search-binding tests now exercise Liberty Coin, unrelated results and result number 10, with provider metadata retained.
- Local Node 22 test-driven cycle: RED missing module failure; GREEN focused pure-module tests four of four passed.

## Remaining acceptance
- GitHub exact-head CI; any failed workflow must be fixed.
- Independent code/security review; regular branch protection not bypassed.
- GitHub merge after gates, then real Cloudflare Bubbles tools Worker deployment preserving bindings and external provider secrets.
- Live search receipt and separately scoped QuantaPhi homepage/trending search reproduction.
- No wallet, identity, payment, X posting, signup or token mutations.
