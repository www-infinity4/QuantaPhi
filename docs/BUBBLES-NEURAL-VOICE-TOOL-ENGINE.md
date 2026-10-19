# Bubbles neural voice and active tools: practical architecture

October 19, 2026 · Android 12 / low-memory Motorola path

## What is already real

- **Recognition:** bundled Vosk small English acoustic/language model. This is neural speech recognition; the device sends recognized text, not audio, to the ordinary Oracle/Brain chat service.
- **Playback:** Android `TextToSpeech`; voice quality depends on the voice engine and downloaded voice packs. The 0.46 APK automatically prefers an *installed* high-quality offline English voice when no custom voice is selected. Users may override it in the existing voice picker. Android's quality metadata alone is **not** proof of a neural synth. No new model is downloaded or bundled by this PR.
- **Reasoning:** owner-authorized Oracle/Bubbles tools, bounded job runner and source-based repair contracts. The AI model and tools are separate. GitHub writes and deployments require their own receipts.
- **GPT-Live:** `workers/bubbles-gpt-live/index.js` already includes a provider broker; it requires an OpenAI project key and billed API service. A ChatGPT paid consumer subscription does not unlock unrestricted API use.
- **Gemini:** consumer Gemini access likewise does not mean unrestricted free Gemini API usage.

## What this upgrade fixes

Natural commands such as **“Bubbles, pull Infinity Radio into chat”** now classify as owner build requests, not ordinary chat-only questions. Red/Yellow inspect the true source and routes; Blue maps dependencies; Green reuses the component or creates the missing narrowly scoped bridge; Pink verifies real rendering, mobile interaction and job/deployment receipts. These are job instructions, **not automatic permissions** or a guarantee that the bot runner has already performed the work. Explanations and negated requests do not generate owner jobs.

For a complete voice agent, the delivery chain is:

`AudioRecord → Vosk ASR + voice activity/end-of-turn detection → owner conversation/memory → model/tool selector → authenticated source tools → verified action/result → offline TTS and native bubble overlay`.

Model choice must be independent of tool privileges. An LLM choosing “call tool X” cannot grant itself repository write, media playback, app control, wallet access or permissions.

## Free/open-source neural speech roadmap

1. Benchmark existing Vosk for partial transcript accuracy, end-of-turn delays and low-memory pressure (already shipped). Honor pauses; do not cut off slower speech.
2. Optional neural **TTS** using `k2-fsa/sherpa-onnx` with a small, license-checked Piper/VITS English voice downloaded on explicit user request. Verify a working 32-bit ARM variant if required and test on actual hardware. Initial audio should be ready quickly, with sentence-level streaming and interrupt/cancel. Do not ship a large model blindly inside the APK, and do not conflate synthesis with reasoning.
3. Optional offline **ASR/VAD** upgrade via sherpa-onnx on a supported ARM target after real phone performance tests. Speech engine fallback must be Vosk, with no silent loss of microphone, permissions, or the ongoing voice session.
4. Optional **LLM** using a licensed quantized local model when RAM/CPU permit, or user-authorized local/server inference for longer reasoning. A small model cannot truthfully be promised GPT/Gemini capability. Cloudflare Workers AI inference also consumes the user's allotted resources and may have limits/costs. Build a smart tool planner that verifies existing code and creates a narrow, reviewed bridge when needed.
5. Tool composition such as **Infinity Radio → Bubbles chat** must create a real embedded player and use the existing source where feasible. If the source API is missing, first return an inspect/repair ticket; no invented playlist, credits, or playback receipt.

## Acceptance gates

- Native recording remains foreground-user-controlled and supports interruption.
- Selected installed voice remains selected after restart and English/offline preference never takes priority over manual selection.
- Real “pull Infinity Radio into chat” routes through owner work, while “tell me about the radio” stays a normal question.
- Unauthorized or unverified owner requests cannot create GitHub writes; no request status is confused with an executed workflow.
- A future on-device model is **only supported** after a verified installed model file, license, Android ABI, memory tests, and a real Motorola playback/recognition receipt.

References: https://github.com/k2-fsa/sherpa-onnx and https://k2-fsa.github.io/sherpa/onnx/tts/
