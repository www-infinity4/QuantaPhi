---
issue: 2041
project: "Bubbles AI Hub · 128 named specialist buttons"
state: source_tested_review_pending
dot: "🟡"
progress_percent: 40
progress_basis: "Catalog, source UI and exact-head focused Bubbles test passed at 17cfed9923be788b136b9cb81cc7d97fe28564a2; full PR checks and independent live/Android acceptance remain incomplete (2/5 scoped milestones accepted)."
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: GPT
lease_id: null
fence: null
lease_expires_at: null
task_session_id: null
repo: www-infinity4/QuantaPhi
branch: feat/bubbles-128-ai-buttons-2041
merged: false
deployed: false
live_verified: false
blocker: "Exact-head CI must rerun after checkpoint repair; independent review, live deployment, and physical Android acceptance not yet observed."
next_action: "Inspect all PR #2042 checks on the new exact head, resolve failures without unsafe credential changes, then review mobile composer behavior."
---
# TICKET-2041 — Bubbles AI Hub · 128 specialist buttons

- Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/2041
- Source PR: https://github.com/www-infinity4/QuantaPhi/pull/2042 (draft)
- Related merged reference catalog: https://github.com/www-infinity4/QuantaPhi/pull/886
- Related unmerged 56 public plugin cards: https://github.com/www-infinity4/QuantaPhi/pull/1285
- Owner request observed: 2026-11-21 (100+ real AI buttons named for plugin/workflow specialties; existing Bubbles chat)
- Repository: www-infinity4/QuantaPhi
- Base at intake: main 0e96538f4c1054c797bd1ee363eab5855a1c4b2d
- Branch: feat/bubbles-128-ai-buttons-2041
- Last source commit observed: 5c61f98edb0b1653739c74ef16e970bf54612f9c
- Color: 🟡 YELLOW — source tests passed, waiting for complete CI and review; no authenticated lease record claimed
- State: source_tested_review_pending (not merged or live)
- Estimated progress: 40% (2/5 tracks: registry and implementation; pending tests/review, guarded merge, browser/Android/live verification)
- Sessions spent: 1 documented
- Sessions remaining estimate: unknown (depends on CI, review, production permissions)
- Current operator: GPT Green source engineering; no independently running child bot claimed
- Lease ID / fence / expiry: not assigned, not claimed

## Actual source changes
- Test-first specification `test/bubbles-ai-specialists.test.mjs` was committed before production source
- `bubbles-ai-plugin-sources.json` snapshots only 56 public, attributed navigation metadata entries from PR #1285; no private plugin archive, credentials or account token
- `bubbles-ai-specialists.mjs`: maps 56 provider sources + 64 reference skills + 8 Bubbles capability records = 128 named profiles, search/filter, safe composer-draft handoff
- `bubbles-ai-specialists.css`: mobile-first buttons with 48px/62px controls and visible focus states
- `bubbles.html`: includes hub and assets beside existing composer

## Proof and blockers
- GitHub commits observed; the draft PR opened successfully: #2042.
- Focused Node test and main Bubbles unified workflow passed at exact head 17cfed9923be788b136b9cb81cc7d97fe28564a2, GitHub run https://github.com/www-infinity4/QuantaPhi/actions/runs/44901019032. This earlier head does not prove a later source revision.
- Mergeability observed true at 17cfed9; mandatory checkpoint front matter failure diagnosed and repaired in this revision. All checks on the NEW exact head, independent source/security review and Android/browser testing remain pending.
- Production deployment, Bubbles tool connection of outside plugins, private-owner plugin migration and physical Android acceptance **not verified**.
- ChatGPT-private plugin access cannot be transferred by reusing metadata: provider-by-provider authorization and executable Bubbles adapters are required.

## Next executable action
Inspect CI results for the new exact head after YAML front matter correction, review accessibility and composer preservation, fix any failures, then complete review/guarded release gates.
