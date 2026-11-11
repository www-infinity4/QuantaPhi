---
issue: 961
project: "NES and SNES original Oracle Quick Card"
state: review_pending
dot: "🟡"
progress_percent: 43
progress_basis: "Estimate 3 of 7 acceptance milestones: source discovery, implemented original card and focused CI; review, merge, live readback and Android physical acceptance pending"
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "ChatGPT · source implementation; independent reviewer not yet assigned"
lease_id: null
fence: null
lease_expires_at: null
task_session_id: null
repo: www-infinity4/QuantaPhi
branch: feature/nes-snes-oracle-card-961-20261109
pr: "https://github.com/www-infinity4/QuantaPhi/pull/1894"
merged: false
deployed: false
live_verified: false
blocker: "Final exact-head CI and independent source review are required before merge; real Android playback and Cloudflare deployment are unverified"
next_action: "Obtain independent source review for PR #1894 and verify passing exact-head checks before guarded merge"
---

# TICKET-961 · NES/SNES original Oracle Quick Card integration

- Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/961 (existing staged game-release program)
- Source request: 2026-11-09 owner requested moving already built NES/SNES emulator into a separate file, starting its QuantaPhi Quick Card and merging a safe integration instead of the unrelated Claude steward branch
- Source provenance: TV-Database #102 (merged NES/SNES EmulatorJS Game Deck), Emulation-Station #5 (merged local-ROM fix)
- Repository: www-infinity4/QuantaPhi
- Branch: feature/nes-snes-oracle-card-961-20261109
- PR: https://github.com/www-infinity4/QuantaPhi/pull/1894
- Current state (2026-11-09 UTC): source_implemented / review_pending
- Progress estimate: 3 of 7 acceptance milestones complete (existing source located, original card implemented, focused CI successful); independent code review, guarded merge, Cloudflare website readback, and Android real-ROM acceptance remain separately unverified
- Documented sessions: 1. Remaining sessions: unknown; do not infer a date or percentage from runner iterations
- Source/CI receipt: focused workflow https://github.com/www-infinity4/QuantaPhi/actions/runs/42592967886 passed on head 560e0f724f12235125656fbfc3c18cd1871cc852 before checkpoint edits; rerun/check the final exact head
- Review: no independent GitHub review recorded when last checked
- Merge: not verified. Deployment: not verified. Browser acceptance: not verified. Android real-device acceptance: not verified
- Lease: no authenticated Brain/Green lease claimed by this direct GitHub source edit

## Bounded changes

1. Added an original NES/SNES Quick Card and original SVG artwork to the existing Oracle carousel; no duplicate homepage shelf
2. Added a separate NES/SNES player that loads an EmulatorJS core only after a device-local .nes/.sfc/.smc selection and user action
3. Kept permitted local file selection inside the player document to avoid cross-document blob URL failures
4. Added responsive CSS and source tests with no wallet or ROM distribution
5. Preserved existing TV, Bubbles, Cloudflare worker, account and wallet implementations

## Next executable action

Complete independent source review of PR #1894, verify final exact-head CI and mergeability, merge only if the review gate passes, then separately check the active quantaphi.org assets and physical Android local-ROM playback. The owner has already requested a reviewed merge; do not ask them for routine design approval again. No completion, reward, browser verification or deployment inferred from successful source tests.
