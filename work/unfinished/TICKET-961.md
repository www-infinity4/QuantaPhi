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
