---
issue: 1315
project: "QuantaPhi Quant feed/ads and privacy"
source_requests:
  - https://github.com/www-infinity4/QuantaPhi/issues/1315
state: implementing
dot: "🔴"
progress_percent: 15
progress_basis: "Issue scoped, no independently accepted product, partner grant, payout or email send; Explainable in-app ranking, sponsor disclosure, consented metrics and zero unrelated wallet mutation"
sessions_spent: 2
sessions_remaining_estimate: unknown
agent: "ChatGPT issue scoping, no coordinator lease"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: docs/partner-funding-outreach-tickets-1312-1317
head_sha: null
pr: 1738
tests: []
merged: false
deployed: false
live_verified: false
blocker: "External provider qualification and/or account-specific delegated permissions not yet verified"
next_action: "Run exact-head CI on PR #1738, resolve merge conflicts without overwriting main, inspect editorial photo rights, then review mobile/Public/Following acceptance"
---

# TICKET-1315: QuantaPhi Quant feed/ads and privacy

## November 7, 2026 session · OTC essentials batch
- Continued the existing Power Chain Follow PR #1738 on its existing branch. Created a reviewed, editorial four-product pilot: Blue Star 2 oz, Campho-Phenique, Aveeno Anti-Itch, and Sarna Original, with original retailer URLs and source-hosted photographs.
- Built a deterministic 120-card-per-batch validator: unique IDs, source HTTPS, source-photo HTTPS, explicit review state, staleness expiry, no price/stock/trending/sponsor invention.
- Reused Oracle Public / Following and shared Follow, Star, Collect, Share, +1 Build actions; added explicit opt-in Skin relief Power Chain, while disabling behavioral personalization on health cards.
- Local RED: test module missing; GREEN: five Node tests passed on candidate contents (prior to GitHub writing). Exact-head GitHub CI, the responsive in-site browser, licensed photo rights for commercial advertisements, PR merge and production deployment have **not** been verified.
- Estimated 15% of full #1315 acceptance, not release complete. No coordinator lease was obtained; no payment, wallet, purchase, signup, or commercial placement authorized.

# TICKET-1315: QuantaPhi Quant feed/ads and privacy

Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1315

Status: scoped RED; no accepted external commercial partnership, connected provider account, site-side product or email send is claimed. This is one documented planning session, not an execution lease.

## First verified requirement
Inspect QuantaPhi first-party feed ranking, source attribution, ad controls and wallet isolation.

## Completion definition
Explainable in-app ranking, sponsor disclosure, consented metrics and zero unrelated wallet mutation.

## Dependencies and security
- Official partnership grants and ownership proof are external decisions.
- No blanket administrator rights to X, Facebook, ChatGPT or provider customer accounts.
- No passwords, private customer data, credentials, email harvest or platform bypass.
- Auth scopes must be least privilege, per business and revocable.
- Do not edit QuantaPhi wallet or Cloudflare identity bindings.
- Source PR, exact-head tests and independent acceptance must precede any completion claim.
- Send messages only after verified contacts and owner-approved recipient batch, with delivery receipts.

## Session receipt
GitHub issue created during the owner-request scoping session; checkpoint staged in a documentation-only branch. No real implementation, provider consent, commercial payout or outside send has occurred.

## November 6 CT · Power Chain follows

- Scope is the existing Oracle homepage Following feed. A visitor can enable a chain for a ready source card with a reviewed denim, coin collecting or social media topic. Closely related cards appear in the existing viewer with the originating follow shown.
- Direct follows, chain selections and individual unfollows persist on this device. The catalog supplies derived matches on demand. Next prefers another topic, then another publisher, among the unseen cards in the round.
- Source work is on `codex/power-chain-follow`. Focused tests include 1,250 synthetic eligible matches and real catalog records for the three supported topics. Android-width browser coverage runs in the interactive-card CI workflow.
- Slice state is 🟡 source tested. The matcher and carousel are implemented. Browser CI, reviewed merge and production readback are pending. One session documented for this slice, with one or two estimated remaining. No coordinator lease is recorded.
- Next action is to verify the browser result at the pull request head.
