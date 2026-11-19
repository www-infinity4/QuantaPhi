---
issue: 1905
project: "QuantaPhi Advertising and Quick Card discovery"
state: implementing
dot: "🟡"
progress_percent: 25
progress_basis: "2/7 estimated workstreams source-hardened (restricted media rights and nonpartisan political ad exclusion); no proof of production filter, live ad campaign or Google AdSense category setting"
sessions_spent: 2
sessions_remaining_estimate: unknown
agent: "ChatGPT GitHub connector (owner-authorized isolated source branch; not Moltnook runner)"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: fix/no-political-ads-1905-20261119
pr: 1982
merged: false
deployed: false
live_verified: false
blocker: "PR #1982 independent review and exact-head CI pending; Cloudflare/Android release unverified; Google AdSense Politics blocking is an external account setting, not a source-control change"
next_action: "Check exact-head green CI and non-author review for PR #1982, then guarded merge; confirm Google AdSense Politics category blocked and verify Cloudflare/Android production separately"
---
# Work Order 003 · Advertising and Quick Cards

Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1905

## 2026-11-11 UTC · direct authorized source repair, no runner lease
- Read AGENTS.md, Bubbles GPT builder routing, unfinished index and existing work. Scoped independent restricted ad gate to avoid colliding with #1904's homepage and #1902.
- PR https://github.com/www-infinity4/QuantaPhi/pull/1909 modifies EXISTING `restricted-ad-policy.mjs` and `workers/restricted-ads/index.mjs`; no replacement homepage, paid ads, wallet or identity writes.
- RED: test-only commit `9cebaf28e91c3ec6df632f3f0292f57fdb2bdaf8` failed restricted card workflow https://github.com/www-infinity4/QuantaPhi/actions/runs/42972666355 as intended (missing image rights and flight-window enforcement).
- GREEN at interim head `cb1a823f3eee1ee14aa4daf485eb635479b7c64b`: restricted card policy workflow https://github.com/www-infinity4/QuantaPhi/actions/runs/42972737901 passed. Worker workflow https://github.com/www-infinity4/QuantaPhi/actions/runs/42972738117 found two fixture failures because the source policy was strengthened before the D1 adapter and test fixtures were synchronized. This failure is NOT waived.
- Continued Worker source and fixtures, a forward-only D1 migration `002-reviewed-creative-flight.sql` and SQLite CI test; future old records remain in D1 but cannot run without newly reviewed rights expiry, agreement and campaign window evidence. Migration is source-only; no remote database was modified.
- Existing restricted-ads backend README documents zero approved live ads and no configured trusted age verifier. This repair must NOT invent license IDs, creative, advertiser contracts, age-verifier bindings or jurisdiction permissions.
- Separate dependencies: PR #1902 owns the Oracle category carousel and builder data flow; PRs #1883/#1806 own preference and Follow issues. Do not merge their overlapping code blindly. Advertising source intake and independent approvals remain outstanding.
- No signed Moltnook executor lease, 21+ identity vendor, independent approval, production route, browser or Android acceptance was claimed. No Quants, Star Coins, GITs or Bubble Bits issued.

## Next source release gate
1. Inspect exact head and dedicated CI after Worker/schema test changes; repair failures, no bypasses.
2. Request independent reviewer for license/provenance, D1 forward migration and the original visual/runtime constraints.
3. Merge reviewed, eligible PR with pinned head SHA. Keep #1905 OPEN until the entire advertisement and Quick Card system is accepted on real desktop/Android production.

## 2026-11-19 UTC · owner-directed all-political-ad removal
- Owner requested removal of Zach Nunn and all political advertisements, regardless of affiliation, from QuantaPhi public carousels, auto-discovery and ad feeds. Kept this request on existing advertising issue #1905 and existing source-card catalog issue #1076; no duplicate issue.
- Created isolated source PR https://github.com/www-infinity4/QuantaPhi/pull/1982 ; scope: political creative exclusion in `quanta-context-placement.mjs`, all-tab `quanta-feed-rank.mjs`, ShopPhi companion normalization, and removal of the Zach Nunn/Mariannette Miller-Meeks cards in both auto-catalogs. News editorial and neutral public services remain; no wallet, identity, payments or unrelated cards edited.
- RED reproduction: https://github.com/www-infinity4/QuantaPhi/actions/runs/44555819720 failed on test-only head `5df5881f181e954b57dc9870690f6bdc25a73d0b` as expected. After source implementation, Oracle workflow https://github.com/www-infinity4/QuantaPhi/actions/runs/44556403817 passed; TinyFish https://github.com/www-infinity4/QuantaPhi/actions/runs/44556238416 initially failed due to hard-coded catalog count, corrected without restoring removed political cards. Fresh exact-head CI and independent review still required.
- Google AdSense's separate publisher ad auction is included on `index.html` and has its own Politics sensitive-category blocking control in AdSense Brand safety. No AdSense admin action, account change, paid ad placement, Cloudflare deployment or Android/browser acceptance is claimed from this source PR.
- Previous advertising rights PR #1909 was merged on 2026-11-18; this is a separate bounded follow-up under issue #1905. Last gate is non-author review, exact-head CI, owner-permitted merge, production deployment/readback and ad account category verification.
