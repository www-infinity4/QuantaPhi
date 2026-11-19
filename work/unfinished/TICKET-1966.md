---
issue: 1966
project: "Apple II Infinity virtual hardware software workbench"
state: review_pending
dot: "🟡"
progress_percent: 65
progress_basis: "38/38 local Node tests for virtual CPU, FPGA/CM5, Apple IIe main/aux memory and new language-card banking; browser, exact-head CI, independent PR review, merge and production acceptance pending."
sessions_spent: 4
sessions_remaining_estimate: "unknown"
agent: "GPT Green engineer, unleased GitHub connector scoped writes"
lease_id: null
fence: null
lease_expires_at: null
task_session_id: null
last_observed_at_utc: "2026-11-19T23:45:11.771Z"
repo: www-infinity4/QuantaPhi
branch: feat/apple2-infinity-software-1966
head_sha: f72fee92610201ac4848a567670f518eaa3cec7d
pr: "https://github.com/www-infinity4/QuantaPhi/pull/1967"
tests:
  - "8/8 local Node v22 tests passed; dedicated GitHub CI https://github.com/www-infinity4/QuantaPhi/actions/runs/44426652404 succeeded on original head."
ci:
  - "Previous v3 exact head f72fee9 passed seven workflows. New language-card and main reconciliation head checks still pending."
independent_review: "pending"
merged: false
deployed: false
live_verified: false
blocker: "Independent reviewer approval and live/browser/Android verification not yet available; check new exact-head CI before considering guarded merge."
next_action: "Check GitHub exact-head CI for language-card/main reconciliation, obtain independent review, and verify any authorized source merge and Android/browser acceptance"
---

# Apple II Infinity · software-only workstation · #1966

- Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1966
- Owner request: drop Apple II physical hardware; emulate hardware components as software programs
- Repository: `www-infinity4/QuantaPhi`
- Branch: `feat/apple2-infinity-software-1966`; baseline head: `ff6a3242bcdbd75ba15511d9a3d846dda1a6631e`
- Work session: APPLE2-INF-1966-S1 · 2026-11-19T00:08:34.125Z
- State: `source_tested` locally; remote CI/review/merge/deploy unverified
- Dot: 🟡 YELLOW · estimated progress 35% toward prototype release and acceptance
- Evidence: 8/8 local focused Node tests passed before staging; exact-head GitHub CI not yet observed
- Implemented: virtual 6502 subset, slot registers, Apple bus/RAM, text/video mapping, FPGA control/IRQ/DMA/logic, CM5 computation and sparse RAM, ADC/DAC, offline networking stub, Android-readable browser controls
- Known limitations: not a full 6502/Apple IIe MMU/ROM/disk/video emulator; virtual clock is not wall-clock speed; DMA is a protected synchronous copy model
- Sessions spent: 1; sessions remaining estimate: unknown (at least review, CI, live/Android acceptance)
- Lease: none claimed or implied by chat, no independent process or runner identity
- Blockers: independent review, exact-head CI, permission-gated merge, real browser/Android tests, deployment
- Next executable action: check PR exact-head CI and independent review; repair failures on this branch before any merge or publication
- Release truth: source staged only; no hardware, customer accounts, remote system or production deployment touched

## APPLE2-INF-1966-S2 · source extension

- RED: seven new regression tests failed before CPU implementation; all were fixed in GREEN, 20/20 focused tests pass after I/O-store correction.
- Implemented: all 151 documented NMOS 6502 instruction decode/execute paths, stack, IRQ/NMI/BRK/RTI vectors, indexed and indirect addressing, binary and BCD arithmetic, relative branches with page-crossing estimates; demo-only BRK stop remains opt-in.
- Added browser hex input (max 4096 bytes), single-step, bounded 2000-instruction run, CPU/stack/flag readouts and error messages, no network/API calls.
- Safety: bounded sparse memory blocks, atomic bounds check, user-supplied ROM loader without any bundled Apple ROM, store instructions do not spuriously read their destination.
- Test evidence: 20/20 local Node v22 passing; HTML IDs unique; inline module parses with node --check. Playwright browser launch was blocked by environment policy (ERR_BLOCKED_BY_ADMINISTRATOR), so browser visuals/Android are not verified.
- No independent reviewer approval or merge/deploy authority inferred from user continuation; branch only.
- Next action: exact-head CI and independent review. No production/Android receipts.

## APPLE2-INF-1966-S3 · IIe MMU and 80-column software video

- Built auxiliary 64 KiB RAM alongside main RAM, with independent RAMRD/RAMWRT, ALTZP overrides for zero page/stack, 80STORE+PAGE2/HIRES priority, write-only C00X bank controls and C05X read/write display switching.
- Text rendering supports 40/80 columns, two 40-column text pages and alternating auxiliary/main banks for even/odd 80-column characters. Status registers expose bit 7 only. Not a full IIe firmware, language card or raster display.
- Browser controls for columns, text page and 80STORE use the virtual I/O addresses, not DOM-only mock values.
- TDD: seven new bank/video tests initially failed, then passed after implementation; one new browser-controls contract test failed RED, then passed; an end-to-end 6502-to-auxiliary-text test passed. 29/29 local Node 22 tests pass.
- Chromium localhost smoke blocked with ERR_BLOCKED_BY_ADMINISTRATOR, no browser execution claim. Exact-head GitHub Actions and independent PR review must be checked separately.
- Sources: https://github.com/frozen-signal/Apple_IIe_MMU_IOU/blob/master/Documentation/Understanding_IOU_MMU/mmu-soft-switches.md ; https://github-wiki-see.page/m/mikedaley/web-a2e/wiki/Memory-System
- No lease claimed; no merge, site deployment, physical Android acceptance or Apple ROM distribution.
- Next action: verify exact-head CI, secure independent code review and obey approved merge/deploy gates.

## APPLE2-INF-1966-S4 · Language Card + main reconciliation

- Verified prior PR head f72fee92610201ac4848a567670f518eaa3cec7d: seven GitHub workflows successful, no independent reviews, new main acfd3c9aac055a9fd8c960851885e1da324e37f0 caused a dirty PR.
- RED: 9 additional language-card behavior tests failed before implementation. GREEN: 38/38 focused Node v22 tests locally passed after implementing two D000 4KiB switchable banks, shared E000 8KiB high memory and separate main/aux banks controlled by ALTZP. C080-C08F switch accesses, double-odd-read prewrite, ROM write-through and C011/C012 status are modeled. All 151 documented 6502 opcode dispatches remain tested.
- Browser controls now select LC bank and protected/ROM-read/write-through modes, using virtual memory-mapped I/O. Physical timing, ROM licensing and disk boot still unimplemented.
- Main reconciliation preserves three current main-only index updates (HypeStat #1974; X Spaces #1284; X intake #1210), plus Apple II ticket; overlaying branch-owned files into main tree on a two-parent merge commit. New exact-head CI and independent review required before source merge.
- Verification receipts: local 38/38 Node checks only prior to GitHub push; no production, Android or genuine browser readback; no authenticated runner lease claimed.
- Next action: inspect new exact-head CI, resolve failures and seek independent review; no release assertion.
