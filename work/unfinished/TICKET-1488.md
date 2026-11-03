---
issue: 1488
project: "Fragrance Quick Cards and Santa's Helper Christmas catalog"
source_requests:
  - https://github.com/www-infinity4/QuantaPhi/issues/1488
  - https://github.com/www-infinity4/QuantaPhi/issues/1333
state: implementing
dot: "🟡"
progress_percent: 15
progress_basis: "One source-linked fragrance discovery Quick Card and four complementary Santa gift cards; zero verified SKU/price feeds, zero production deployments"
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "ChatGPT source implementation, no coordinator lease"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
last_observed_at_utc: "2026-11-03T18:25:00Z"
repo: www-infinity4/QuantaPhi
branch: feat/santas-helper-carousel-1333-20261103
head_sha: null
pr: https://github.com/www-infinity4/QuantaPhi/pull/1623
tests:
  - "Dedicated Santa Node CI passed at 797a2e5cb0bf6202cb08a626aa49d553bba36693: https://github.com/www-infinity4/QuantaPhi/actions/runs/41692986072"
  - "Browser/mobile CI added and review pending on newest head"
merged: false
deployed: false
live_verified: false
blocker: "Stacked PR #1485 department selector remains draft/unmerged; no authorized product catalog feed, image licensing or live SKU quotes"
next_action: "Verify exact-head #1623 browser CI, then independently review #1485 and mobile UX before merge"
---

# Ticket 1488 — source implementation handoff

## Implemented in PR #1623
- Santa's Helper entry in the existing Oracle **Show carousel** dropdown, isolated as `santas-helper`. No duplicate viewer and no restricted items in holiday department.
- Five genuine interactive first-party cards: welcome, fragrance, fashion, hobbies and keepsakes. Original Santa/Christmas illustrated hero SVG for every card.
- Free-text gifting prompt, bounded/consented recipient and budget interpretation, source-only merchant discovery, local shortlist and manual copy.
- Optional photo is browser-only preview and removal, not AI analysis or personal image storage.
- No merchant-sponsored ad, SKU, availability, price, purchase, Bubbles AI call or Cloudflare D1 data has been produced in this source milestone.

## Remaining gates
- Exact-head CI and Android 320/360/393/430px browser acceptance, independent review, merge of parent #1485 and stacked #1623, PWA/Cloudflare deployment, actual product listing feed with rights and timestamp readback, verified authorized checkout and receipts if developed.
- Preserve issue #1333 gift-agent logic as separate work from fragrance SKU imports; do not call the local suggestion form a connected AI agent.
