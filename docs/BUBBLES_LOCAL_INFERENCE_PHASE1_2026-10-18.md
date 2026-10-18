# Bubbles local AI — phase 1: verified interface (October 18, 2026)

## Current source, not a claimed installed feature
- `android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/BubblesService.java` already records continuous PCM to **Vosk**, bundled offline; retaining it avoids disrupting microphone consent and capture.
- Android `TextToSpeech` already speaks replies. The chosen installed voice may require network: verify `Voice.isNetworkConnectionRequired()` if guaranteeing offline TTS.
- Regular spoken/typed requests go through `FloatingOracleWindow` to the website assistant; modifying the dormant `replyFromOracle` path *alone* cannot make conversations offline.
- Cloudflare `/v1/assist`, authenticated Robot Brain tools, website search and online card content remain network services. This PR does not change or bypass permissions for those actions.

## Added in this phase
- `LocalBrainPort`: a network-free on-device generation contract, compatible with a JNI/llama.cpp or Kotlin adapter.
- `LocalBrainSession`: a single-request async boundary with ordered text fragments, maximum input/output lengths, cancellation, no implicit cloud fallback, and explicit `MODEL_UNAVAILABLE`.
- `LocalVoiceBridge`: converts actual session fragments to streamed UI text and coherent sentence/phrase callbacks for a TTS engine. It is deliberately network-free, side-effect-free, and leaves Android recorder permissions and the floating UI in their current classes.
- Plain-Java fake-engine tests requiring neither Android nor an AI model, including grouped speech output and unavailable-model refusal.

**No GGUF model, Android native library, model downloader, speech recognizer swap, WebView routing switch, real TTS playback connection, or APK is installed by this PR.** Do not say Bubbles can answer questions offline yet.

## Next steps required for a usable on-device assistant
1. Select a **source-reviewed** llama.cpp Android implementation and pinned build. The official `ggml-org/llama.cpp/examples/llama.android` project is a reference. The third-party `ffmpegkit-maintained/llama-android` free package currently advertises synchronous completion only; its streaming Flow is a paid feature. Do not assume its license, artifact or safety without checking the actual binary and transitive dependencies.
2. Measure memory, responsiveness, battery and thermal limits on the Motorola target with a small, correctly licensed GGUF model (e.g. a 0.5B quantization). An 8B model is not a reasonable default for an entry-level phone.
3. Implement the `LocalBrainPort` adapter. It must load a user-approved model into application-private storage, report readiness accurately, execute off the main thread, and release resources. Test airplane mode with the network denied.
4. Wire native speech or typed text through a **visible local-only mode** to the session and send its fragments to the floating conversation and TTS. Do not redirect owner GitHub/Cloudflare actions through a text-completion model: those need verified credential scopes, explicit authorization and job receipts.
5. If upgrading STT to `ggml-org/whisper.cpp` or TTS to `k2-fsa/sherpa-onnx`, test one layer at a time. Vosk and Android TTS are functional baselines. TTS should consume coherent sentence chunks rather than treating arbitrary LLM tokens as independent speech jobs.
6. Run Android build, unit tests, a network-isolation test, device listening/speaking tests and APK security review before any distribution. The unrelated Infinity Platinum APK security hold must not be bypassed.

### Offline execution contract

```text
Explicitly started microphone (existing Vosk)
    -> owner-directed utterance gate (existing)
    -> local-only selection (not yet wired)
    -> LocalBrainSession -> actual LocalBrainPort implementation (not yet installed)
    -> sentence grouping -> offline TTS (not yet verified)
    -> visible Bubbles reply
```

No paid per-token API is required for local inference, but model download, disk, CPU, battery and network connectivity for external tools still have costs.

### Test

```bash
mkdir -p /tmp/bubbles-local-test
javac -d /tmp/bubbles-local-test \
  android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/LocalBrainPort.java \
  android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/LocalBrainSession.java \
  android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/LocalVoiceBridge.java \
  test/java/LocalBrainSessionTest.java \
  test/java/LocalVoiceBridgeTest.java
java -cp /tmp/bubbles-local-test LocalBrainSessionTest
java -cp /tmp/bubbles-local-test LocalVoiceBridgeTest
```


## Recorder trigger is native Android, not a desktop executable

On this repository, spoken commands already pass through `BubblesService.heard()` and `VoiceCaptureCommands.parse()`. After Android's per-session MediaProjection consent screen, `MainActivity` starts `ScreenCaptureService` directly. It shares the existing microphone PCM and publishes the MP4 through `CapturePublisher` to Movies/Bubbles. WebView capture requests are drained by `FloatingOracleWindow` and forwarded to the same native command path; do not add subprocess, PATH, fake taps, admin permission, or an invented external recorder.

The physical device's recording/save behavior remains to be verified independently from repository-source tests.
