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
- One continuous AudioRecord stream feeds the bundled Vosk small English model locally. The microphone stays open across utterances and while Bubbles speaks. Speaker-echo transcripts are discarded during replies; speaking interruption is not implemented. The app sends
  only addressed text to QuantaPhi's existing **Oracle Cloudflare** chat
  endpoint, then attempts spoken playback with an available British-English
  system voice. It does not send raw audio files itself.
- A permanent foreground notification identifies the microphone session and
  offers **Stop and release microphone**. Stopping releases the speech
  recognizer and removes the overlay.
- The app has no wallet, GitHub-write or operating-system control privileges;
  replies do not prove that tools were run or actions were completed.

## Boundaries
- Android may limit microphone background operation, foreground service
  launches, overlays on sensitive screens, microphone concurrency and battery
  behavior. The microphone is continuous while the explicitly started foreground session remains active; Android can still interrupt it. This is not a promised phone-call
  or guaranteed unattended hot mic.
- Neither the web bubble nor an ordinary PWA can float above another app.
  The native app is necessary for that. An embed can only follow the user
  within website pages that include the Bubbles script.
- This debug build uses a debug signature and is **not release-signed for distribution** and is not published to
  the Play Store. It needs live testing on an Android device before production.
- Speech recognition uses bundled Vosk 0.3.75 and the Apache-2.0 vosk-model-small-en-us-0.15 model offline. Addressed text still goes to Oracle for replies. No raw audio or private API keys are uploaded. The model is downloaded from its official versioned HTTPS URL at build time; dependencies/model should be reviewed before release.
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

## Brain workflow learning (October 12 update)

The Android companion now stores a configurable name and job. It recognises that
name (Brain by default) and Bubbles. The native Oracle request includes the site
Origin required by the existing endpoint.

Optional learning is read-only and disabled by default. Select ChatGPT, X, or the
standalone Gemini app, then manually enable **Brain workflow learning** in Android
Accessibility Settings. This observes visible accessibility text only, skips
password/editable fields, and records up to 30 bounded local snapshots after a
screen settles. It does not read hidden conversation history, Chrome tabs, the
Google app's integrated Gemini, images, or arbitrary apps; some app views may
expose no readable text. Uncheck an app to stop its capture. Review or clear
notes in the native Bubbles settings.

The separate **Include my recent notes ... Oracle Cloudflare AI** switch is also
off by default. When enabled, up to 10,000 characters of recent notes accompany
the next addressed voice request. No capture event sends a network request or
runs a tool. Ask Brain what needs fixing next to get evidence-based suggestions.
The assistant cannot identify your intent perfectly from screen text.

The browser embed does not auto-install this app or grant these permissions.
Native profile settings are currently separate from web-created bubble profiles;
wallet-bound profile sync and multiple simultaneous persona overlays remain
future work. Install the updated debug APK and verify overlay movement between
apps, name recognition, capture permission, pause/review, and Oracle response on
the real device. The CI job runs JVM allowlist/bounded-text checks and assembles
the full APK; it does not replace real-device testing.

## Bubbles Preview APK after "Something went wrong" installing an update

GitHub's hosted runners can produce different debug-signing certificates, so
Android can refuse to replace an earlier `org.quantaphi.bubbles` APK.
Increasing `versionCode` cannot fix a signature mismatch.

**Do not uninstall your current app just to try this build.** The Actions
artifact named `bubbles-preview-android12-apk` builds a *different* debug
package, `org.quantaphi.bubbles.preview`, labelled **Bubbles Preview**.
It installs alongside the old Bubbles app and does not delete its private data.
This is a test/preview, not a production in-place upgrade and does not import
private notes or owner credentials from the old package. Stop the old app's
microphone session before starting the Preview microphone.

On Android 12: download the successful workflow artifact ZIP, extract it,
open the extracted `app-debug.apk` with Files, and allow that app to install
unknown apps when Android asks. Check free space (the offline voice model
makes this APK large). If Android still says "Something went wrong," retrieve
the installer error/status before concluding the signing conflict is the cause.
Use no instructions to bypass security or install a modified APK.

CI caches a **test-only** debug signing key to reduce preview update conflicts,
but GitHub cache is not a permanent signing identity. A true update to an
existing non-preview package requires its ORIGINAL signing key and a higher
version code; a new key cannot transparently preserve installed app data.
A protected release signing key should be provisioned outside source control.
