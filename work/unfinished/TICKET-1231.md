---
issue: 1231
project: "Bubbles Android APK production readiness"
source_requests: ["Owner: APK finish it please; 2026-11-21"]
state: source_tested
dot: "🟡"
progress_percent: unknown
progress_basis: "Source reconciled; 13 focused APK tests passed; real signed build, emulator, release and physical-device acceptance pending."
sessions_spent: 1
sessions_remaining_estimate: unknown
agent: "GPT builder with independent Pink source review"
lease_id: null
fence: null
lease_expires_at: null
task_session_id: null
last_observed_at_utc: "2026-11-21T11:39:00Z"
repo: www-infinity4/QuantaPhi
branch: bubbles/20261023-apk-059-integrated-history-mic
head_sha: c8e594e3ddf4ddecfa5bc300aec3136ec2dfde9b
pr: "https://github.com/www-infinity4/QuantaPhi/pull/935"
merged: false
deployed: false
live_verified: false
blocker: "Exact-head Android build, signer continuity and emulator results pending"
next_action: "Verify exact-head APK build, signer compatibility and API31/API35 emulator results on PR #935"
---

# Bubbles Android readiness — canonical issue #1231

Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1231

- Owner request: “APK finish it please”, 2026-11-21.
- Existing release PR: [#935](https://github.com/www-infinity4/QuantaPhi/pull/935), branch `bubbles/20261023-apk-059-integrated-history-mic`.
- Original PR head: `6c95824fe0e19d5e1c2969ad1417c3d224dd3c6e`; reconciled main: `0e96538f4c1054c797bd1ee363eab5855a1c4b2d`.
- Agent: GPT builder; state `source_tested`; dot 🟡; overall progress unknown.
- Sessions: one documented release-continuation session; historical session count and remaining effort unknown.
- Coordinator lease: not claimed; lease ID, fence, expiry and claimed task/session identity are null.

## 2026-11-21 release continuation

Main already contains the original PR's history journal, microphone arbitration, TTS retry, RecordB save protection and tests. Retain current main implementations, including newer duplicate-Record protection, fresh-chat reopening, navigation contrast and search retry behavior. Advance the original Preview5 package to versionCode 59 / 0.59.0.

New release validation compares the compiled phone APK with the checksum-verified published Preview5 binary: package, increasing version, original signing certificate, Android 12 support and both ARM ABIs. A signer mismatch blocks artifact promotion. Preserve public metadata receipts with exact checked-out source commit and SHA-256; never export signing keys or ask the owner to uninstall.

The existing emulator gate now covers API 31 and 35 with distinct artifacts. Request notification permission only on API 33+. The older #935 emulator run 39877062141 failed with an unresponsive-app dialog; no successful device result is inferred from that run.

Evidence: version-specific parity test failed against the stale 58 assertion after the version advance; new upgrade validation initially failed before implementation. All 13 focused Node checks now pass. Bash and Node syntax checks pass. Independent read-only source review confirmed preservation of current fixes and identified the missing signer-continuity gate. Exact-head CI, real compilation/signing, emulator results, merge and release readback remain pending at this checkpoint.

Next single executable action: run exact-head PR CI and inspect the signed APK update receipt and Android emulator results; fix failures on this same branch, then use a guarded merge only when GitHub permits it and required evidence passes.

Physical Moto G Pure microphone/speaker quality, Start/Stop/save, provider sign-in and authenticated cross-device history remain separate acceptance checks. This ticket stays open. Infinity Platinum hold #525 concerns a different package and is untouched.
