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
- Color: 🔴 RED — source patch ready for test, no authenticated lease record claimed
- State: source_implemented_pending_verification (not merged or live)
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
- Focused Node test **not yet run** in this work session; do not claim green.
- Exact-head CI, mergeability, independent source/security review and Android/browser testing **not verified**.
- Production deployment, Bubbles tool connection of outside plugins, private-owner plugin migration and physical Android acceptance **not verified**.
- ChatGPT-private plugin access cannot be transferred by reusing metadata: provider-by-provider authorization and executable Bubbles adapters are required.

## Next executable action
Run `node --test test/bubbles-ai-specialists.test.mjs` on exact head, review accessibility and composer preservation; then check exact-head PR CI and address failures on #2042 before release.
