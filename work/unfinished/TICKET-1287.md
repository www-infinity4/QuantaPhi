---
issue: 1287
project: Infinity Open Browser Bridge
source_requests:
  - "Owner request Oct 31: free, original self-hosted browser alternative after TinyFish credits exhausted"
state: review_pending
dot: "🟡"
progress_percent: unknown
progress_basis: "Milestone 1 policy and navigation scaffold only; browser/session/owner authorization/real deployment acceptance unverified"
sessions_spent: 3
sessions_remaining_estimate: unknown
agent: "Continuity Builder source engineering"
lease_id: null
lease_expires_at: null
last_observed_at_utc: "2026-10-31T08:31:00Z"
repo: www-infinity4/QuantaPhi
branch: feat/open-browser-bridge-20261031
head_sha: "e2c9d22903583380907c29b33b0fbbf73cb40a69"
pr: 1286
tests:
  - "Node v22 local policy regression: test-first 2/3 (alternate-port bypass reproduced), fixed 3/3 pass; node --check policy.mjs pass"
ci:
  - "Exact source head e2c9d229: 4/4 returned GitHub Actions workflows successful, including dedicated Infinity Open Browser Bridge policy"
merged: false
deployed: false
live_verified: false
blocker: "Independent review and real browser/session security acceptance required; DNS rebinding and private DNS resolution remain outside the current hostname-only policy"
next_action: "Obtain independent security review of PR #1286 network/credential isolation; implement DNS and browser sandbox before deployment"
---

## Bounded source receipt (2026-10-31)

- Existing original Playwright starter [PR #1286](https://github.com/www-infinity4/QuantaPhi/pull/1286) reused; no TinyFish proprietary source, wallet secrets, browser cookies or provider sessions copied.
- Reproduced that an allowlisted HTTPS host with an arbitrary alternate port (e.g. :8443) passed the original host-only check. Local red test: 2 pass, 1 fail. Fixed with default HTTPS origin port requirement and corrected trailing-dot normalization; local green: 3 pass, 0 fail.
- Added dedicated no-credential Node 22 Actions workflow and explicit syntax checks. Exact source head `e2c9d229` passed 4/4 returned GitHub workflows, including the new policy workflow. PR #1286 moved from draft to ready-for-review, with **0 submitted reviews**. No actual Chromium/website acceptance yet; not merged/deployed.
- Coordinator observed 0 authenticated consumer runners, owner presence unknown, Work lease unclaimed. Did not touch shared Work/browser, send a ChatGPT '*', post on X or authorize external accounts.
- **Security caveat:** a hostname allowlist is not a DNS/IP network sandbox. Before any public multi-tenant deployment, enforce network isolation, DNS resolution/pinning protections, per-user consent and signed receipts; do not claim complete SSRF protection.

## Release gates

1. Exact-head CI and independent source/security review.
2. Owner-authenticated, per-user scoped job/lease with explicit user action approval, no credential export.
3. Browser sandbox, DNS/private-address protection and no cross-tenant sessions.
4. End-to-end signed receipts, phone/mobile acceptance and verified deployment.
5. Provider-specific automation restrictions and official APIs (X posting separate).

Index synchronization: main lacks `work/unfinished/INDEX.md`; it exists in still-draft PR #1276. Do not overwrite that active branch. Add this ticket to the index after #1276 is reviewed/merged or during a conflict-free reconciliation.
