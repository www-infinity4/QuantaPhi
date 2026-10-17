# Quant AI commercial: verified cinema-reel-core.js API

This document records the **existing** public API, so Yellow readers and Green builders must not stop with `owner_input_required` over an invented `exportVideo` function. Source: `cinema-reel-core.js`.

The script is a browser IIFE exposing `window.PhiCinemaTimeline` (also CommonJS `require('./cinema-reel-core.js')`). Its public functions are:

| Function | Inputs | Output / limits |
| --- | --- | --- |
| `seconds(s)` | `s: string` SRT timestamp in `MM:SS` or `HH:MM:SS` | Seconds (number), or NaN for invalid values. |
| `captions(text)` | `text: string`, SRT subtitle content | Sorted array `{start, end, text}`, limited to 10,000 captions. |
| `matches(rows, term)` | Caption rows and a search term | Matching `{start, duration: 15, text}` clips, spaced 15 s apart. |
| `clip(source, start, duration=15)` | Source metadata object, nonnegative start and duration in `(0,15]` | Clip descriptor. Throws for invalid input. **Not** an exporter. |
| `finalizeWebM(blob, durationSeconds)` | Existing video/webm Blob and positive duration in seconds | Promise resolving to a WebM Blob with duration metadata when possible, otherwise the original Blob. **Not** a recorder. |

There is **no `exportVideo`**, `exportV`, `render`, `record`, or other video-export public method in `cinema-reel-core.js`. Do not hallucinate one.

For **TASK-2**, implement the actual browser capture lifecycle in `quant-ai-commercial.js`: use a canvas stream and `MediaRecorder` where supported, capture actual scene frames, collect nonempty chunks, stop/clean up the tracks and recorder on completion or cancellation, and create a Blob. `PhiCinemaTimeline.finalizeWebM(blob, measuredDurationSeconds)` may then be used for metadata repair, but cannot replace recording. No unauthorized music is bundled or downloaded. Only an owner-provided authorized audio file can be used; its real duration comes from browser media metadata. Without audio, present the explicitly labelled silent 35-second scene-order preview, not a song-synchronized export.

Do not add a speculative API to the timeline core or treat missing audio/portraits as a source-code blocker. Tests should use a fake MediaRecorder and verify cancellation, successful chunk export, null audio timings, and cue order. Real mobile hardware/browser capability still requires separate verification.
