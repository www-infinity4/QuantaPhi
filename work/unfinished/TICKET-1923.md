# Avatar AI · prompt handoff Quick Card — #1923

- Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1923
- Scope: **Phase 1 only** — a public, visitor-neutral suggestion Quick Card with a copyable/draggable starter prompt for their own ChatGPT account. The full five-history-thread import and continuous agent product remains a separate unverified phase on the same ticket.
- Repository / branch: `www-infinity4/QuantaPhi` / `feat/avatar-ai-prompt-card-1923-20261111` (based on main `76d0a40203f88199cd7edb6fc74251ff70a562a5`).
- Source request: owner, November 11, 2026 — users drag the Avatar AI concept prompt into their ChatGPT or copy/paste on Android to get a partial avatar immediately. QuantaPhi should explain the concept; real constant scanning and communicating is future work.
- Stage: source implemented on feature branch; **exact-head GitHub CI, independent review, eligible merge, deployment and production/Android acceptance not verified**.
- Agent/session: connected ChatGPT GitHub authoring on 2026-11-11 UTC; no claim of a signed Brain lease.
- Status: YELLOW / `review_pending` once PR is opened; no fully complete percentage assigned. Sessions spent: 1; remaining unknown.
- User-level result: original source-card pipeline (not a new homepage), reusable public `avatar-ai-core.mjs` prompt, accessible `avatar-ai-card.mjs` drag, mobile clipboard/paste/ChatGPT link, responsive Oracle-inspired CSS, a source acceptance test and updated existing card catalog tests.
- Prompt asks ChatGPT to use **its own authorized personal context** to identify up to five older threads, distinguish THEN/NOW/NEXT NUANCE, rank work, produce a permitted action plan and durable checkpoint. It does **not** send account data from QuantaPhi or falsely promise full history, continuous background execution, code merge or subscription.
- Source test evidence: local `node --test --test-name-pattern='anonymous|optional' test/avatar-ai-card.test.mjs` passed 2/2 after RED missing-module failure. It verifies the prompt logic only; full source integration and browser are **not** thereby proven. GitHub CI pending.
- Security boundaries: no user history written to public code, localStorage, network requests or wallet; no paid API, arbitrary ChatGPT session access, extra Cloudflare permission, automatic message posting, minting or charge. ChatGPT navigation is `https://chatgpt.com/` and requires user's paste/send.
- Companion dependencies: existing public ChatGPT Quick Card, `docs/CHATGPT-OFFICIAL-SITE-VIEWER.md`, `docs/BUBBLES-GPT-CONNECTION.md`, `docs/BUBBLES-OWNER-WORK-BRIDGE.md`; full product source reconstruction remains on #1923, #1921 and #1918.

## Next single executable action
Check the PR's exact-head CI, especially `test/avatar-ai-card.test.mjs`, `test/source-quick-cards.test.mjs` and the existing Oracle/mobile tests; fix failures on this same branch, independently review all privacy/brand and card-boundary changes, then decide merge eligibility. Only after merge/deploy can Black record live Android 360/393 and drag/clipboard acceptance. Continue the full historical-thread import and signed agent bridge under #1923 without duplicating the ticket.
