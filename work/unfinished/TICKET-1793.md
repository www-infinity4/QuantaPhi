# TICKET-1793 · Harley-Davidson & Indian Motorcycle Quick Cards

- Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1793
- Owner request: 2026-11-07 — “Harley davidson, indian quick cards thanks”
- Repository: `www-infinity4/QuantaPhi`
- Working branch: `feat/motorcycle-harley-indian-quick-cards-1793`
- Last observed (UTC): 2026-11-07T10:34:01.915Z
- Agent/session: connected ChatGPT GitHub connector; 1 documented implementation session; no signed Bubbles lease asserted
- State: `source_staged`, 🔴 RED (release and acceptance incomplete)
- Progress: 50% estimated (official models/images identified, 2 source cards wired into Oracle/public feed and on-card selectors coded; focused tests added, but not yet run on exact head and no deployment proof)
- Sessions remaining estimate: unknown; further independent test, review and release checks required
- Linked related work: #1546 covers a separate Harley-Davidson museum/factory tour card, not motorcycle model browsing
- Cards: `harley-davidson` and `indian-motorcycle`; each has exact manufacturer-owned image URL, known 2026 models, and explicit official-page navigation
- Native surfaces: `source-quick-cards.mjs`, `quanta-card-experience.mjs` / CSS and existing Oracle swipe deck; standard Follow / Star / Collect / Share / +1 Build actions remain delegated to the existing card tools
- Test fixtures: `test/motorcycle-quick-cards.test.mjs`, updated `test/source-quick-cards.test.mjs`, CI workflow path and node suite
- Test receipts: no exact-head CI result observed yet; RED test was authored before the module, but an actual failing Node execution was not captured
- Merge / deploy / Android: no verified merge, Cloudflare deployment, browser result or physical Android acceptance
- Safety: not a brand affiliate or dealer; no fake inventory, prices or payments; externally hosted photography rights and access should be checked before production
- Independent review gate: confirm model endpoints/images/asset permission, exact-head CI, source security review, then merge only under repository approval policy
- Next single executable action: open the branch PR and inspect its exact-head automated checks; repair failures on the same ticket
