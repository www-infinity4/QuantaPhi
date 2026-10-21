# Bubbles One — clean Android rebuild (2026-10-21)

A **different Android app**, not another revision of the large `android/bubbles-overlay` code. Package `org.quantaphi.bubblesone` installs alongside Preview 5 and does not delete existing chats, files or app data.

## One setup, not a button farm

Tap **Set up Bubbles** once. Android separately grants microphone and overlay permissions; those permissions cannot legally/technically be silently granted by another app. After they are granted, Bubbles opens its floating orb through an Android foreground service. Future launches resume it without another setup button. Tap the orb for a native conversation window; the separate recorder dashboard, fake Saved states, and independent Live/Record/Stop buttons are not included.

Voice uses the Android SpeechRecognizer service on the phone, with bounded automatic recovery, English Android TextToSpeech, and typed conversation fallback. This is not a claim of GPT Live neural audio, always-on uninterrupted recognition, or guaranteed microphone coexistence with another recorder. Voice recognizer availability, battery restrictions and actual Motorola output need physical tests.

Ordinary conversation reaches the existing Cloudflare Bubbles Tools AI gateway (Workers AI GPT-OSS with actual read-only tools/receipts). Last local turns accompany new requests. This is **not** proof of the separately authenticated website owner/GitHub-write connection: the native prototype intentionally does not copy cookies, owner credentials, or five-day grants. The phone has a private SQLite conversation notebook and explicit spoken note requests; it does **not** silently transcribe unrelated conversations around the phone.

## External recorder integration

No invented universal screen-recorder Start button. Use an external Android screen recorder's normal recording controls. When the recorder finishes, **Share > Bubbles One** copies its explicitly shared video file into the app's private files and records a local receipt; an empty/missing video is not called a success. Neither this share contract nor MediaStore access gives arbitrary live access to video frames from another app. Live screen assistance would require Android MediaProjection approval or a cooperative recorder API and should be built separately only after this base app works.

## Acceptance before declaring fixed

1. GitHub Actions: Gradle build passes and APK signature verifies.
2. On Moto G Pure Android 12: install alongside the old app; one-time Android prompts; orb survives leaving the app, can open and hide, and receives typed conversation.
3. Test mic and real TTS end-to-end; interrupt/retry; no duplicate turns; verify source/tool evidence.
4. Record using an outside app, share its **finished** video to Bubbles One, and confirm non-empty private file. Test rejected/empty/overlarge files.
5. Compare six consecutive multi-turn replies with website Bubbles. Owner-session sync is not included in this first foundation; do not claim it is.

Separate package and preview signature mean this build does not auto-replace an installed app.
