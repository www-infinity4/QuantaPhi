---
issue: 1927
project: "Complete Me AI"
state: source_tested
dot: "🟡"
progress_percent: unknown
progress_basis: "Owner-scoped project intake, source-verification guard, two dependent jobs and dedupe regressions are source tested; independent review, merge, deployed runner, live owner claim, Android card and production acceptance are unverified"
sessions_spent: 2
agent: "GitHub-connected source repair, not a signed Brain writer lease"
sessions_remaining_estimate: unknown
lease_id: null
lease_expires_at: null
task_session_id: null
fence: null
repo: www-infinity4/QuantaPhi
branch: feat/universal-automation-1913-20261111
pr: https://github.com/www-infinity4/QuantaPhi/pull/1916
merged: false
deployed: false
live_verified: false
blocker: "Independent review, shared homepage integration, and a working production repository-engine run"
next_action: "Verify PR #1916 checks and obtain independent review on the final head"
---

# Complete Me AI project controller

Canonical [issue #1927](https://github.com/www-infinity4/QuantaPhi/issues/1927) and [Continuity #1908](https://github.com/www-infinity4/QuantaPhi/issues/1908). See the [Session 07 scope handoff](https://github.com/www-infinity4/QuantaPhi/issues/1927#issuecomment-6812162873).

- In an authenticated Bubbles conversation, `Complete Me AI — <goal>` opens a private project card. The owner supplies the existing issue, two ordered source jobs and acceptance criteria, then selects **Start project**. The card gets the target repository head through the existing authenticated GitHub read adapter. The owner intake saves the project in `work_tickets` and requests its first eligible job through the existing scheduler.
- The owner, GitHub's canonical repository name, issue and normalized goal identify a saved project. Tests use the actual Brain intake and claim handlers with SQLite and simulated external transport. They verify one dispatch across concurrent duplicates, saved state after restart, an expired lease retry, approval blocking, and admission of job two after a fixture records the first job’s verified merge. They also verify that a casing-only retry reuses the saved project and that the same goal on two issues creates distinct projects.
- The first job has no dependency. The second stays queued until the Brain accepts its prerequisite. The card renders saved runner or commit links when present. The `sourceSha` is the intake provenance; the runner pins its actual work base at execution time.
- [Red CI](https://github.com/www-infinity4/QuantaPhi/actions/runs/43138774825) records the missing project module. The [latest PR checks](https://github.com/www-infinity4/QuantaPhi/pull/1916/checks) carry subsequent source and Android-width results.
- Release depends on independent review, combined Oracle homepage checks, the existing signed runner, and the Brain release that exposes the verified canonical repository name. Moltnook [#252](https://github.com/www-infinity4/Moltnook/pull/252) delivered the runner’s browser fix. [#253](https://github.com/www-infinity4/Moltnook/pull/253) merged the advisory recipe descriptors. QuantaPhi [#1911](https://github.com/www-infinity4/QuantaPhi/pull/1911) owns lease and retry recovery. QuantaPhi [#1926](https://github.com/www-infinity4/QuantaPhi/pull/1926) owns the separate signed Avatar bridge.
- Remaining acceptance includes project-wide pause and stop through the same coordinator, production signed claim/source/test/review/merge receipts for both jobs, deployment and Android device readback. The card’s **Request runner** action uses the existing admission checks. Closing the card only closes the view.

---

## First-word assistance integrated with color-coded word orbs · 2026-11-22

The owner proposed Bubbles helping at the first letter, measuring the byte "weight" of the first word, rendering a size-coded orb, then gradually letting the user take over like bicycle training wheels. Unlike Complete Me AI's existing **project** orchestrator, this is **local text composition assistance only**. It must never silently submit, rewrite private texts, infer user emotions, or use community members' ideas without consent.

Reused existing Bubbles composer and canonical [wallet color issue #1906](https://github.com/www-infinity4/QuantaPhi/issues/1906); [PR #2120](https://github.com/www-infinity4/QuantaPhi/pull/2120) adds `bubbles-byte-assist.mjs`, optional UI, Android styles, exact RGB passage-match helper, and a static synthetic color-window lab. Tests cover UTF-8/grapheme weight, first-letter suggestions, off/fade modes, only-on-tap insertion, zero wallet grants or network I/O, incorrect hex holes and a display-only passage. First word-byte mass is **not a model's intelligence/reasoning score**. This work does not replace the original Complete Me AI project intake or owner execution bridge.

**Next:** Review exact-head CI for #2120, guarded source-only merge if eligible, then check actual Bubbles WebView/Android keyboard and color lab on the released site. No live completion, device scan, full-letter control, or signed model invocation claimed.
