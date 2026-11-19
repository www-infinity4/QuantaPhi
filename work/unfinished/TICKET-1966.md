---
issue: 1966
project: "Apple II Infinity virtual hardware software workbench"
state: source_tested
dot: "🟡"
progress_percent: 55
progress_basis: "All 151 documented NMOS 6502 opcodes implemented at instruction level, 20/20 local Node tests, interactive hex loader/step/run UI; exact-head CI, independent review, real browser/Android and deployment not yet verified."
sessions_spent: 2
sessions_remaining_estimate: "unknown"
agent: "GPT Green engineer, unleased GitHub connector scoped writes"
lease_id: null
fence: null
lease_expires_at: null
task_session_id: null
last_observed_at_utc: "2026-11-19T00:26:40.000Z"
repo: www-infinity4/QuantaPhi
branch: feat/apple2-infinity-software-1966
head_sha: 6353aca7372ec9cf0e1caf40a4e0b9ced660eb8c
pr: "https://github.com/www-infinity4/QuantaPhi/pull/1967"
tests:
  - "8/8 local Node v22 tests passed; dedicated GitHub CI https://github.com/www-infinity4/QuantaPhi/actions/runs/44426652404 succeeded on original head."
ci:
  - "Prior head 6353aca7: seven GitHub workflows succeeded. New source head CI pending."
independent_review: "pending"
merged: false
deployed: false
live_verified: false
blocker: "Independent review, new exact-head CI, browser execution blocked by environment navigation policy; production and Android readback pending."
next_action: "Check exact-head PR CI for 151-opcode follow-up and obtain independent source review; then gated merge and live/browser/Android acceptance"
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
