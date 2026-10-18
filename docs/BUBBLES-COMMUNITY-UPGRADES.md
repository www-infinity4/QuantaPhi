# Bubbles community upgrade intake, contributor rewards and motion — 2026-10-18

## Actual source changes in this PR
- Public QuantaPhi suggestion form, accepting optional editable display name and a specific UI / feature / advertising proposal.
- A new POST /community/upgrade route in the existing Infinity Brain Clock Worker. It rejects oversized/sensitive proposals, uses same-origin submission, hashes a daily client bucket, applies six-per-hour and 60-second limits, deduplicates proposals, and writes a private D1 row; no raw client IP is retained.
- Optional **GPT** classification through OpenAI Responses API. The model only assesses relevance, category, concise summary and risk. A missing/unreachable GPT API returns needs_review; it never asserts a verified GPT judgment. The model receives untrusted text and cannot grant owner status.
- An owner-only POST /work/community/upgrades endpoint to inspect the most recent 50 suggestions, surfaced inside the existing Bubbles Robot Brain notifications.
- An owner-only POST /work/community/promote endpoint that turns a selected community proposal into a **draft** owner ticket (idempotent), with external text flagged as untrusted. Promotion does not dispatch, merge, deploy or mint StarCoins. Existing authentic owner approval, GitHub runner, Pink verification and Black receipts still govern execution.
- An original pauseable, reduced-motion-aware swirling canvas scene on the QuantaPhi home page, linking to the Bubbles commercial and Oracle Video Studio. It is not an AI-rendered movie. The full Video Studio now exposes the separate configured-provider AI engine next to the local animated-stills movie exporter.

## Deployment prerequisites
1. Run workers/infinity-brain-clock/schema-community-upgrades.sql against **the existing authorized** `WORK_DB` D1 database, with change management/backup and no destructive resets. No raw Cloudflare credentials in GitHub.
2. Add Cloudflare secret `COMMUNITY_SUBMISSION_SALT`, at least 32 unpredictable bytes. Absence disables public submissions with 503.
3. To enable GPT screening (optional, provider-billed), set server-side `OPENAI_API_KEY` and optionally `COMMUNITY_GPT_MODEL` to an approved GPT model (defaults to gpt-4.1-mini). Enforce account budgets, bot mitigation and upstream rate limits before inviting public submissions. Never put API keys on the page or in an APK.
4. Deploy the Infinity Brain Clock Worker with its original D1, Durable Object, owner, wallet and runner bindings unaltered. Deploy the website files together and test real CORS, owner auth, submit/duplicate/rate responses, device sizes, and accessibility.
5. Confirm the existing Robot Brain owner pairing can retrieve new proposals and promote one to a *draft*, and that only a separately authorized owner ticket can start Green/Pink work.
6. Test a real video provider before advertising AI moving-video generation; open ComfyUI / Wan / LTX workflows require actual GPU service and model weights or Grok Imagine requires provider credits. The existing local animated-stills exporter is a separate method.
7. **Infinity Platinum security hold #525 remains intact.** Do not publish APKs from this change.

## Intelligent community assessment
Ideas from Fred or any person can be discovered, but a public post is not an owner instruction.
- "The mobile button is broken; scrolling does not work" → affected-card / investigate soon / reproduce on Android / narrow fixes / tests / reviewed deployment.
- "Add Xavior advertising beside Fred in Media Star" → candidate media-star-adjacent placement / brand ownership, disclosure, terms and destination verification / preview before publishing.
- "Put sponsors by Bitcoin Crusher" → sponsor-board candidate, but separate from gambling/rewards interactions and with clear advertising labels.
- "Build swirling bubbles video" → video-studio candidate; verify actual playback and rendering before calling the result generated video.

GPT relevance is only a filter, not independent proof of a bug, a license, compensation or permission. Signed trusted contributors' GitHub source and verified tests can inform priority; external repository code remains untrusted until license and security review.

## Contributor StarCoin / ads business rules not activated
Do not instantly mint a transferable StarCoin for each raw view or ad click. Bots, repeated refreshes and fraudulent traffic must not mint rewards. In a future explicit revenue-share program, agree on contributor licensing, verified provenance, supported wallets, per-unique-human page view counting, caps, fraud prevention, revocations, payout reserves, actual treasury liquidity, terms and taxes. Keep contributor rewards separate from advertising interactions and never incentivize clicking, viewing or refreshing Google ads.

The home page already references Google Analytics `G-JXQKLVZQT1` and an AdSense publisher script, and has **inactive** 1000-StarCoin/30-day sponsor preview slots. These source tags are NOT evidence of live ad-serving approval, clicks, payable revenue, or millions of views. Verify actual numbers in approved Analytics / AdSense reports. AdSense program policies prohibit incentivizing ad clicks/views and artificially inflating traffic: https://support.google.com/adsense/answer/48182 .

## Verification
```
node --test test/bubbles-community-upgrades.test.mjs
node --check bubbles-community-upgrades.js
node --check bubbles-orbit-preview.js
```
There is no claim in this PR of public form deployment, GPT provider activation, new earned StarCoins, actual ad revenue, or a completed provider-backed video render.
