# Bubbles AI — native Android companion

This Android app is the **cross-app layer** of QuantaPhi Bubbles AI. Unlike a
website, a properly authorized Android foreground service can draw a draggable
bubble over other apps while its visible microphone session is active.

## What the initial app actually does
- Install once, open Bubbles AI and choose **Enable the floating Bubbles
  assistant** to grant *Display over other apps*, microphone and notification
  permissions. This is setup/consent, **not** a push-to-talk call control.
- A circular, movable bubble appears and glows with recognition amplitude.
  Say **“Bubbles, explain Quants”**. Follow-up phrases are recognized for 30
  seconds; otherwise unrelated speech is discarded. Say **“Bubbles go quiet”**
  to mute. Long-press the bubble to mute, tap it to unmute.
- Android's speech-recognition service converts audio to text. The app sends
  only addressed text to QuantaPhi's existing **Oracle Cloudflare** chat
  endpoint, then attempts spoken playback with an available British-English
  system voice. It does not send raw audio files itself.
- A permanent foreground notification identifies the microphone session and
  offers **Stop and release microphone**. Stopping releases the speech
  recognizer and removes the overlay.
- The app has no wallet, GitHub-write or operating-system control privileges;
  replies do not prove that tools were run or actions were completed.

## Boundaries
- Android may limit speech recognizer background operation, foreground service
  launches, overlays on sensitive screens, microphone concurrency and battery
  behavior. **Continuous listening is best effort**, not a promised phone-call
  or guaranteed unattended hot mic.
- Neither the web bubble nor an ordinary PWA can float above another app.
  The native app is necessary for that. An embed can only follow the user
  within website pages that include the Bubbles script.
- This debug build is **not signed for distribution** and is not published to
  the Play Store. It needs live testing on an Android device before production.
- Speech recognition can involve Android's speech provider; this is not
  guaranteed on-device speech processing. No private API keys are embedded.
- There is no phone-dialer/VoIP call or background phone call. “Call” means
  an active, clearly visible and user-authorized assistant session.
- OpenAI/Claude model access requires separate properly authenticated API or
  connector permissions; signing in to an app never grants Bubbles those rights.

## Build and verify
GitHub Actions `Bubbles Android overlay APK` compiles the native project
and uploads an installable **debug APK artifact** after successful compilation.
This is a test build, not an auto-install or finished release.

To compile using a local Android SDK with Java 17 and Gradle 8.11.1:

```bash
cd android/bubbles-overlay
gradle assembleDebug
```

The APK is `app/build/outputs/apk/debug/app-debug.apk`. Validate an actual
Android microphone permission prompt, orb movement in at least two unrelated
apps, TTS locale, stop notification, background constraints, and network
response before describing the cross-app feature as production-ready.

## Next integration
- Move shared voice turn gating into an authoritative, versioned module with
  Android/browser parity tests.
- Add authenticated Oracle work/tools adapters with explicit per-action scopes,
  independent receipts, retries, and no unverified GitHub/wallet actions.
- Measure wake-to-response latency, recognizer failure rates and battery use.
- Add a privacy-preserving session handoff between Android overlay and
  QuantaPhi account; **never** copy WebView cookies to the network.
