# Imagine video integration

Actual text-to-video and image-to-video requests use Grok Imagine, with asynchronous job polling and playback inside the Oracle Octaves card. No external generator redirect is used.

QuantaPhi mounts the API at /api/video/* in workers/quantaphi-site/worker.js. Deploy worker.js together with video-api.mjs as modules. Preserve existing service bindings. Configure XAI_API_KEY as a Worker secret, never in HTML, and a VIDEO_RATE_LIMITER Cloudflare ratelimit binding (one new render per wallet per 60 seconds recommended). XAI_VIDEO_MODEL optionally overrides grok-imagine-video-1.5. Provider credits are required. Configure provider spending limits before enabling public generation. This integration never charges or changes the Infinity wallet; wallet state is used solely to authenticate.

The standalone Video-Generator card requires the same API mounted on its hosting origin. The QuantaPhi integration is the primary deployment. A GitHub Pages-only host cannot run the backend.

Generated URLs are temporary. Users can save the original. Durable generated media storage, multi-shot stitching, video editing/extension and self-hosted Wan/LTX GPU inference are not implemented in this change. The existing still-image timeline remains a separate tool below Imagine. No live render has been claimed or tested without provider credentials.

Validation: node --test test/imagine-video.test.mjs (QuantaPhi); node --check phi-imagine-video.js. Mock-provider tests verify exact request payload, polling, wallet ownership receipts, auth rejection, invalid settings and rate-limit rejection.

Official API: https://docs.x.ai/developers/model-capabilities/video/generation
