---
issue: 1905
project: "QuantaPhi Advertising and Quick Card discovery"
state: implementing
dot: "🟡"
progress_percent: 12
progress_basis: "1/7 ticket workstreams source-hardened; restricted ad policy, Worker schema and tests staged but not yet merged or deployed; 0 verified new paid advertiser campaigns"
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "ChatGPT GitHub connector (owner-authorized isolated source branch; not Moltnook runner)"
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: fix/advertising-rights-campaign-expiry-1905-20261111
pr: 1909
merged: false
deployed: false
live_verified: false
blocker: "External advertiser licensing, source rights and signed ad deals not established; age-verifier and production restricted-ad route remain unconfigured; independent review and exact-head CI required"
next_action: "Verify final exact-head GitHub CI for PR #1909, obtain independent review, address findings and merge only if permitted; keep #1905 open for the complete advertising program"
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
