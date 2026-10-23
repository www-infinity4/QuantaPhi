# Intelligent card workshop

Card creation and source repository saves cost **0 StarCoins**. The separate **1,000 StarCoin** price buys advertising placement on the QuantaPhi page. Creating, refreshing, exporting or privately saving a card never charges that fee.

Implemented source paths:
- `/card-workshop/`: natural-language AI definition, editable validated settings, live card preview, private native repository revisions and downloadable source bundle.
- Bubbles Tools `/v1/cards/plan`: connected GPT-OSS returns a constrained definition, never arbitrary executable markup.
- `/v1/cards/refresh`: fixed news/search/MLB adapters; no user-selected network destination is fetched. Exported cards can use this read-only endpoint from their own origins without credentials.
- Runtime refreshes periodically while visible and before Next story. Source URLs deduplicate tracking variants. Verified publication dates sort newest first, then relevance; undated results are explicitly unverified. Reader history and up to 200 stories stay on the reader's device.
- Existing `/v1/projects` stores private, authenticated, immutable source revisions. Save retries preserve request IDs and expected heads. Exports are JSON maps of source files, suitable for copying into the user's GitHub repository; no GitHub push is claimed.

Not implemented: arbitrary custom widget code generation, automatic authenticated GitHub export, in-card X Spaces playback, automated advertising debit/publication, full-paper medical synthesis or background refresh while the browser is closed. Sessions use original-source links. The existing Code Phi studio remains available for custom code.

Advertising requests are exported as `awaiting_checkout`, `paid:false`, `published:false`. They are not payment receipts. Complete advertising checkout by integrating an authoritative StarQuest debit with idempotency, recipient accounting, immutable revision pinning, placement moderation/status, refund policy and public ad rendering. Do not use a browser balance or uploaded receipt as payment evidence.

Deploy the static files through the site's existing release process and the changed Bubbles Tools worker through `deploy-bubbles-semantic-tools.yml`. Existing native project APIs must be deployed. Local tests do not establish production deployment, a funded checkout, real source availability or an authenticated user save.

Validation: `node --test test/intelligent-card-workshop.test.mjs test/native-projects.test.mjs test/bubbles-tools.test.mjs test/wallet-assets.test.cjs test/phi-project-actions.test.cjs`.

## Source compensation and karaoke extension

`/v1/source-ledger` uses the ledger's existing authenticated active-wallet identity. Its append-only records store provider, HTTPS source, content/card reference, usage category, proposed integer amount in hundredths, currency, and unverified recipient/agreement references. Retry keys prevent duplicate proposals. These records are private owner declarations, not verified usage, accounts payable, funded transfers or publisher acceptance. No public request may mark a record paid. Corrections need a new record; immutable rows cannot be edited or deleted. Each GET returns at most 200 records.

The card workshop and `/starmaker-card/` provide proposal controls. StarMaker, CNN, X and other providers are not represented as enrolled recipients. Actual settlement still needs verified recipient onboarding, agreed rates/permissions, funded authoritative debit/credit, provider receipt validation and reconciliation. The 1,000 StarCoin advertising placement charge remains separate from source compensation; no split or recurring rate has been assumed.

The independent karaoke studio permits up to eight selected StarMaker share links. No external song catalog, backing audio or proprietary studio is copied. Authorized local backing tracks can be mixed with microphone audio. Recordings stop at five minutes, release tracks/context and keep the latest take in IndexedDB with a download fallback. A deterministic pitch follower generates a fifth-above sine tone; it does not train a model, sing lyrics or establish a personalized Bubbles singing voice. APK microphone coordination and physical-device recording are not verified.

Official sources checked 2026-10-23: https://www.starmakerstudios.com/setting/terms/sm/index and https://www.starmakerstudios.com/uploading-faq . These sources do not establish an approved third-party embed/API or a redistribution agreement for QuantaPhi.

Local verification: 95 passing source and card-integration tests. A browser test was attempted, but Chromium is unavailable and its download failed; no browser or real microphone success is claimed.
