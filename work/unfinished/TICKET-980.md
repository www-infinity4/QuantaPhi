---
issue: 980
project: "ChatGPT ↔ QuantaPhi Bubbles integration, official partner sign-in and public MCP drafts"
source_requests:
  - https://github.com/www-infinity4/QuantaPhi/issues/980
  - https://github.com/www-infinity4/QuantaPhi/issues/872
state: implementing
dot: "🔴"
progress_percent: 12
progress_basis: "Only public read-only MCP and no-auto-publish GPT draft handoff are staged. Partner login, user plan access, authenticated tools, release and live checks are unverified."
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "ChatGPT Green source preparation, no authenticated Robot Brain lease"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: feat/chatgpt-public-card-mcp-980-20261107
head_sha: null
pr: 1836
tests:
  - "test/chatgpt-public-quick-card-mcp.test.mjs (CI pending)"
  - "test/chatgpt-card-draft.browser.spec.mjs (CI pending)"
merged: false
deployed: false
live_verified: false
blocker: "Exact-head CI/independent review plus OpenAI commercial website OAuth partner client and user-consented plan usage are not verified."
next_action: "Read exact-head PR #1836 Bubbles MCP and Android Playwright CI; repair any failures without changing the ticket."
---

# Ticket #980 · ChatGPT ⇄ QuantaPhi website and Bubbles

## 2026-11-07 CT · direct owner request and source milestone

The owner wants visitors to sign into QuantaPhi with ChatGPT and use real GPT intelligence in their own on-site Quick Cards/Bubbles chat, not link-only widgets that send visitors off the site or falsely claim ChatGPT was connected. OpenAI's commercial website client requires selected-partner approval; documented official request: https://openai.com/form/sign-in-with-chatgpt-interest/ . No commercial client or delegated plan consent was read/issued.

Already verified original source: Cloudflare GPT-OSS 120B Bubbles chat, private MCP bearer-gated readers, native Android-only ChatGPT sign-in, original Quick Card publisher and existing owner Robot Brain adapter. None of these independently grants ChatGPT website authentication.

PR [#1836](https://github.com/www-infinity4/QuantaPhi/pull/1836) adds:
1. Public, noauth, zero-database/no-model-cost `/mcp/public-cards` to existing Bubbles Worker. Only two fixed safe tools: actual builder directory and validated original Quick Card draft. Original private `/mcp` remains unchanged.
2. Shared data-only `quick-card-gpt-draft.mjs`: validated site URL and fields, UTF-8 encoded URL fragment; malicious schemes, local URLs, credentials, unknown kind and invalid payload fail closed.
3. Original `quick-card-builder.js` imports the helper, prefills fields, clears the fragment and keeps publish an explicit user decision.
4. MCP security/contract and Android 360px Playwright tests added to existing CI; full results not yet observed.
5. `docs/CHATGPT-BUBBLES-BIDIRECTIONAL-INTEGRATION.md` provides official client approval, OAuth 2.0/OIDC identity, separate plan-usage permission, ChatGPT plugin OAuth 2.1, Bubbles/Cloudflare D1/user isolation and release gates.

**Not done:** ChatGPT website sign-in, customer model plan usage, account-scoped plugin actions, permanent GPT-powered Bubbles, financial/owner delegation, Cloudflare deployment or live site acceptance. All wallet balances untouched.

## Next verified action
Inspect full exact-head CI for PR #1836, then fix the first genuine regression and rerun, use independent review and permitted merge/release with live `/mcp/public-cards` readback. Keep website login blocked until actual partner client and real consent. No dead sign-in card should be displayed.
