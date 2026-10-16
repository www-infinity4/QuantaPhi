## Native voice-attribution safeguard (October 16, 2026)

The Android microphone now forwards idle speech only after an explicit "Bubbles"
address or tap on the orb. This opens a 30-second follow-up window with at most
four unaddressed turns, so ambient recognition cannot renew its own window forever.
Typed messages are unaffected. While the APK owns the microphone, its embedded
website cannot open a competing mic stream. Partial results are not published
while idle. Speech needs at least 320 ms of measurable input above the energy
threshold; this reduces, but cannot eliminate, misrecognition of room noise.
The notification's **Stop Bubbles** control still stops the service.
This change is not installed until a signed APK is built and tested on device.

## 0.22.0 — one website conversation

Gemini reviewed the bridge source and the recovered project requirements. This
build adds UUID-based acknowledgement deduplication within the current page,
async preflight backpressure, bounded bridge readiness polling and navigation
generations. Typed screen questions in the website composer route to Android's
existing Accessibility tools; the observation returns separately from command
intent. Recorder state, owner-job routing, ChatGPT inference and native voice
handlers remain connected. Full page/process restart is not an exactly-once
submission guarantee; work outcomes still require real runner receipts.


The floating orb and notification now open the same retained QuantaPhi Bubbles
WebView. There is no separate Android composer or local transcript interface.
If the website fails to load, the window shows an error and Retry; ordinary
messages do not silently switch to a different native AI. Collapsing the window
keeps the website session and queues alive. The linked website owner session
continues to supply shared history; embedding a page alone does not pair Chrome
and Android's separate storage. Existing local history is preserved.

This source change needs a successful signed Android build and real-device
verification. It does not update an installed APK by itself.


## Bubbles Preview 5 — 0.17.0 (October 15, 2026)

- The floating Android chat reports **Robot Brain: owner linked/not linked**. Linked means the first-party WebView has an owner credential, not that a job ran. Say **"check robot brain tools"** to call the authenticated read-only tickets API; a failed check must not be presented as connected.
- Spoken owner build instructions use the existing owner-authenticated `/work/tickets/create`, `/work/tickets/update`, and `/work/run-next` pipeline. These API requests require a verified owner wallet or a one-time pairing code; no ChatGPT sign-in grants Robot Brain permissions. A work ticket is not evidence of a completed repair.
- The website panel inside the Android orb now receives an Android-originated recorder state. It shows **waiting for Android approval**, **screen/sound ON**, **saving**, and the MediaStore save/failure result. Its **Stop & save recording** action appears only for an active session. Spoken **"is the recorder on?"** and **"did the recording save?"** read the native status, not the model's guess.
- Voice and typed screen/sound recording instructions route to the Android foreground services. Android's protected MediaProjection consent still needs a person's approval, and the first launch may need a notification tap to display that system dialog. The app should start capture after consent rather than asking for a separate app-side Start tap.
- This is a compiled-code preview until GitHub's Android build succeeds and the APK is actually tested on a Motorola. The package still uses Preview 5's test signer; an earlier app with a different certificate will *not* install as an in-place upgrade regardless of versionCode.

# Bubbles AI — native Android companion

Version 0.26 adds **Share current screen**. Android reads a fresh frame for each message while sharing is enabled, including after scrolling. The floating chat hides for the screenshot and returns immediately after capture. The frame is sent to the existing Cloudflare image reader; images are not saved in chat or on disk. This is refreshed frame sharing, not continuous video streaming. Stop sharing or mute Bubbles to end the session. Website-only page view reads the current page viewport and cannot inspect other Android apps.

Owner commands beginning **Direct GitHub** use the owner-authenticated Brain `/work/github` adapter. The Worker needs a server-side `GITHUB_TOKEN` credential with Contents, Pull requests and Actions write access on the selected repositories. Never put that credential into chat, frontend code or the APK. Missing credentials return `github_runtime_credential_missing`. Code changes go to a pinned `bubbles/` task branch and PR; commits, CI runs and deployments have separate receipts. Direct operations share repository leases and feed receipts to Purple and Black so they cooperate with the existing color bots.

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


## Oracle conversation and natural speech — 0.6.0 (October 14, 2026)

- **Tap the movable orb** to stop a spoken reply immediately (when talking) and open a dedicated dark **ORACLE / BUBBLES** text window. This does not stop the foreground microphone. **Long-press** mutes the microphone. The chat has **Stop talking** and **Resume listening** controls.
- A typed prompt is shown with its reply **without** forced speech. The latest 30 message entries remain in the app's local private preferences (not uploaded just for displaying the conversation). The activity polls new replies, so it also shows the spoken conversation.
- Local Vosk continuous recognition now exposes partial words in `last_partial` for better live diagnostics. This is **not a new recognizer**; acoustic recognition still uses the bundled English Vosk model. For a future genuine recognition-engine upgrade, evaluate the actively maintained `k2-fsa/sherpa-onnx` streaming Zipformer Android implementation against phone CPU, memory, latency and battery budgets. Do not describe it as installed until compiled and tested.
- The app uses Android's system `TextToSpeech` interface, at natural pitch 1.0. For a better **on-device neural voice**, the app links to open-source `HayaiApp/HayaiTTS` (Kokoro and Piper options) which can be selected as Android's default speech engine **after separately installing it**. This can sound more natural but **is not a licensed ChatGPT Live voice**. A direct ChatGPT/GPT-Live voice requires supported authentication and a real-time API integration; the local ChatGPT-plan OAuth preview does not grant Realtime voice usage.
- Android `Continue with ChatGPT` already requests user-authorized, device-local Responses API usage. The ChatGPT-plan OAuth preview does **not** support GPT image generation, hosted tools, audio transcription or live voice, and cannot be sent to QuantaPhi's shared backend to service other users. ChatGPT account identity is **not** wallet-transfer authority: require the verified QuantaPhi wallet session and signed ledger transfer/receipt separately.
- Preview package remains `org.quantaphi.bubbles.preview2` with Android `versionCode 6` / `0.6.0-preview`. The preview-only debug key may not match manually installed builds; a version bump alone cannot solve a different signing certificate. CI assembles an APK but cannot confirm installation or microphone operation on your Motorola.

Verified reference docs:
- https://developers.openai.com/siwc/token-sharing-open-source/preview-limitations
- https://developers.openai.com/api/docs/guides/voice-webrtc
- https://github.com/k2-fsa/sherpa-onnx
- https://github.com/HayaiApp/HayaiTTS

## Installed Android voice picker (October 14 follow-up)

The **Choose and test Bubbles voice** button lists voices the phone's currently
selected Android TTS engine actually reports, marks on-device versus
network-required voices, saves an engine-scoped voice identifier to private app
preferences, and plays a short sample. Voice choice refreshes the running
Bubbles foreground service without stopping its microphone. The fallback
is the installed engine's English/default voice when a saved voice is missing.
The separate **Change Android speech engine** button opens Android's TTS
settings if available; **Optional: install open-source neural voices** links
HayaiTTS, which the user must install and enable separately.

This is a *speech-output picker*, not speech-recognition improvement,
voice cloning, or a licensed ChatGPT Live voice. NaturalReader's proprietary
voices are not extracted or redistributed. Any self-voice-cloning service
should require an explicit microphone sample and confirmation that the
recorded speaker has authorized cloning. Evaluate OpenVoice V2 (MIT code and
model claims) separately from large noncommercial model-weight families.
A song-generation provider such as ACE-Step 1.5 and pitch-controlled
DiffSinger/OpenUtau would be distinct, optional **singing tools**, not a
replacement for real-time spoken assistant replies. Check each model's
weights and distribution terms before offering paid StarCoin services.

**Test on the actual Android phone:** choose a bundled voice, listen to the
sample, ask Bubbles a question, switch to HayaiTTS as Android's TTS provider
if installed, reopen the selector, choose a neural voice, and ask again
without stopping the mic. Also test the no-voice-data and engine-not-installed
cases. GitHub CI can confirm compilation but not perceived quality or
always-listening battery/microphone performance. This branch does not change
Robot Brain job submission, radio playback, wallet transfers, or Android
screen-recording permissions.

## 0.9.0 — Bubbles Preview 4: live QuantaPhi assistant in the floating window

**Tap the floating orb while Twitter or another app is open.** The window now
loads the actual first-party `https://quantaphi.org/bubbles.html?nativeOverlay=1`
Bubbles app instead of approximating its prompt in a second Android-only chat.
The web application handles its familiar message composer, private webpage notes,
owner-verification boundary, Brain tickets, status and source links. The Android
foreground service handles microphone transcription and selected Android TTS
playback, passing addressed voice **text** into the loaded site. This avoids
opening the website's microphone or playing two voices simultaneously.

- **Type without talking:** tap the orb, tap **Mic off**, then type in the same
  Bubbles website composer. The native microphone closes while muted, but typing
  and normal webpage AI conversation continue. Tap **Mic on** to resume after
  Android permits the foreground mic.
- **Just say "take notes"** to start dictating local notes; "write down ..."
  writes a single note and "stop taking notes" ends note mode. The native
  fallback also keeps private spoken notes. Native-fallback notes are separate
  from the website's origin-local notes, not silently synchronized.
- The website UI also runs while the floating panel is collapsed: the overlay
  keeps an existing WebView session until Bubbles is stopped. If the first-party
  page has not deployed the `window.QuantaBubbles.isNativeOverlay` bridge or
  becomes unavailable, the native Oracle chat remains the fallback. No owner
  GitHub or Robot Brain write is inferred from a text reply.
- The embedded WebView has its **own** QuantaPhi wallet / owner verification;
  Android cannot silently reuse Chrome's cookies, site history or login. Verify
  the owner's existing session in this native QuantaPhi window if needed.
- Only https://quantaphi.org opens internally. External HTTPS links use the
  system browser. No JavaScript-to-Java native bridge, raw ChatGPT tokens,
  microphone/camera WebView grants or unlocked Android system access.
- The spoken voice is the currently selected Android TTS voice, with British
  English preferred. Similar speech character to the website is possible, but
  identical Chrome SpeechSynthesis timbre cannot be guaranteed by Android TTS.

Preview 4 is intentionally a different install package:
`org.quantaphi.bubbles.preview4` with version 0.9.0 (versionCode 9) so it
can coexist with the older debug-signed previews. Stop the older Bubbles
microphone before starting Preview 4. The exact signature of a specific
debug build can still vary, so never uninstall an existing app merely to
replace it. Check Android 12 permission prompts, Twitter overlay keyboard,
voice notes, owner Brain receipts, background speech, link handling,
and the fallback with no network on a real Motorola.

**Publishing:** successful GitHub CI can build/sign a Preview APK, but neither
CI nor a merged GitHub commit proves the live Cloudflare site has deployed these
new JS/HTML assets. Confirm the first-party web bridge is live and owner-auth
works before calling the on-device behavior verified. The HTML/CSS interface
is site-provided, not a screenshot imitation.


## Website/APK shared long memory (October 14 follow-up)

Preview 4's floating WebView opens the exact QuantaPhi Bubbles page and now
loads the same `bubbles-memory.js` client as the website. There are no parallel
Android-only AI prompts while the first-party page is available. The normal
website microphone releases when Chrome goes into the background, leaving the
foreground APK microphone to continue listening. Android still permits only
what its OS microphone permissions and audio concurrency allow.

To retain a complete Bubbles transcript instead of just a small recent buffer,
open the Bubbles conversation, check **Remember my entire Bubbles conversation
on this device**, then check **Sync website and Android history with my verified
Unified Wallet**. Verify the *same* wallet separately in Chrome and the Android
floating WebView; Android never copies Chrome session cookies. This private
Cloudflare D1 sync is per verified wallet with idempotent event IDs and indexed
local retrieval of earlier conversation and notes. It does not access
conversations in the ChatGPT app, hidden messages from other applications,
or pre-installation audio that was never recorded in Bubbles. A small
relevant-context excerpt is used per model request; it cannot fit every past
word into one model context window. Guest embeds remain independent.

Cloud history is voluntary and stored on QuantaPhi's Cloudflare infrastructure,
not end-to-end encrypted. **Clear local chat** only deletes this profile's local
IndexedDB history; **Erase synced memory** (confirmation required) deletes the
verified wallet's remote transcript as well. Work tickets, media and wallet
transactions are separate from chat transcripts. Tests prove source-level
authorization and event-deduplication behavior, not real Motorola mic concurrency.

## Consecutive voice turns, native screen capture and Robot Brain work (0.16.0)

- Android Bubbles keeps its foreground microphone even if the *website's*
  optional owner voice lease is unavailable. A website sync failure must not
  silently mute the next spoken command.
- Recognized turns and typed commands wait in bounded FIFO queues when the
  shared QuantaPhi chat is loading or busy. The first request is not overwritten
  by a second instruction. A failed WebView callback is retried; callers should
  check the visible connection status and actual work receipts.
- Interrupted AudioRecord streams retry at most three times while Bubbles is
  still started and microphone permission remains granted; permission denial,
  intentional mute and app shutdown are never silently overridden.
- Say **"record my screen"**. Android may require two taps: first the Bubbles
  notification (to open the foreground activity), then Android's protected
  "Start now" screen-sharing consent. **Bubbles cannot press the system consent
  button for you.** After consent, Android starts Bubbles' recorder directly;
  there is no second Bubbles recording button. Say **"stop recording"** or
  **"stop screen recording"** afterwards; the native capture service saves the
  file to **Movies/Bubbles** and exposes a Stop notification as a fallback.
- **"Contact Robot Brain and ask it to add your missing tools"** is classified
  as an explicit engineering task, not an assertion that new permissions have
  already been granted. Only a verified owner session can save the ticket and
  request the authorized runner; a queued ticket is not evidence of a code
  edit, signed APK, merged PR or installed repair.
- Preview 5 retains its same package ID but increments versionCode to 16.
  Updates require the identical signing certificate as the installed Preview 5.
  Signing caches are not a permanent release key, and real-phone installation
  and continuous spoken stop/save remain to be verified.
