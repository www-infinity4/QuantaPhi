# TICKET-1231 — Bubbles / Android native readiness

Canonical issue: https://github.com/www-infinity4/QuantaPhi/issues/1231
This checkpoint covers the narrow 1-second screenshot-series change; other Android/identity/voice scope remains on the issue.

## Session · 2026-11-22 · opt-in screenshot cadence

- **Owner request:** Explain one-second snapshots in Bubbles while reviewing YouTube recommendations and supplied private screenshots.
- **Repo and branch:** `www-infinity4/QuantaPhi` / `fix/bubbles-one-second-screen-series-1231-20261122`; draft PR https://github.com/www-infinity4/QuantaPhi/pull/2104.
- **Source read:** `android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/ScreenCaptureService.java`, `MainActivity.java`, `VoiceCaptureCommands.java`, JVM command checks and existing Android CapturePublisher/source contracts. Pre-patch all three interval clamps required >=2 seconds; user-requested 1 second was unsupported. Recording MP4 remains a separate 24-fps mode.
- **TDD:** `c7f6c171f580fcbfc1258a2202d3bb4fc9bc78dc` first adds a Java voice regression for 1-second/30-second requests and preservation of 60-frame limit. `4af44539b24cf7829e7c9f5194257f3e56d0a573` adds a Node source guard for 3 clamp sites, 60-frame cap, time limit and MediaProjection consent. Implementations: `f28116658e0a37491128da7ab85481819b276231` voice, `fb906b2402eec019ab5966ed166e51dbe58243ba` activity, `e690382b7b1eb44ae7e7027cbff7a1d53337fd2c` capture service.
- **Safety/privacy:** At most one saved screenshot per second as supported by ImageReader callbacks, maximum 60 snapshots per authorized session, 300-second maximum session, explicit foreground Android per-session MediaProjection consent and local phone storage. No background capture, automated uploading, video piracy, scanning other people, profile inference or wallet activity. Screenshots remain private and are not included in GitHub. Exactly one image per elapsed second is **not guaranteed** if Android supplies frames more slowly.
- **Status/dot:** source_staged / 🔴 pending exact-head Android and emulator CI; estimated 3/7 milestones (reproduction test, native implementation, consent/cap contract maintained in source), 1 session spent, remaining unknown. No active shared runner lease claimed by this connector session.
- **Outstanding acceptance:** actual RED CI log review, GREEN exact-head Java/Node/Gradle/emulator CI, independent source/privacy review, guarded merge, signed APK installation/upgrade, and actual permissioned Android 12 one-second sequence saved to Pictures/Bubbles. None inferred from the source commits.
- **Next executable action:** examine the Android workflow at exact PR head; fix any failing test; preserve all other Android work and do not merge on incomplete security/device receipts.
