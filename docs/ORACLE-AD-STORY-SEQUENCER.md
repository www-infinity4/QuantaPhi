# Oracle Ad Stories · 21+ skip and contextual discovery · November 10, 2026

Canonical work ticket: https://github.com/www-infinity4/QuantaPhi/issues/1315

## Delivered source behavior (not yet a production release)
- Existing Oracle viewer remains the original node: it keeps the real movie, search, games and player controls.
- Device-local, persistent 21+ `skip` suppresses adult content from automatic Public/For You/Following and is restored only by explicitly opening the adult preference card and selecting Browse. The adult preference teaser appears at most once after 12 non-adult cards; after a deliberate adult-browsing acknowledgment, no adult source enters automatic suggestions until 10 ordinary cards have been seen. User-triggered direct 21+ links remain reachable; this preference is neither age verification nor ad consent.
- Oracle stage artwork accepts deliberate horizontal pointer gestures with 75 px minimum and 1.5:1 horizontal/vertical threshold. Controls, inputs, audio, video, frame widgets, and scroll remain operable.
- ShopPhi optional story tray plays up to six authentic HTTPS images per approved Quick Card, in order, once; then advances to the next separately approved card. If no approved image or relevant card exists, it remains hidden. There is no automatic play on mount or background request.
- Only approved published cards and explicitly creative-reviewed sponsored ads can enter this story tray. It does not rehost video, monitor another app, observe movie playback, add platform APIs, request a purchase or infer private user intent.
- Context matching is bounded and understandable: e.g. a deliberately selected *Miami Vice* context can surface a reviewed travel card; a syntax-error/developer context can surface a tool card. Adult, tobacco, cannabis, medical and other sensitive contexts are excluded from ordinary ad matching.
- All creative sourcing, pricing and CTA rights must be reviewed. Organic cards are not described as paid ads.

## Next stages, unverified
1. Exact-head GitHub workflow and all existing QuantaPhi card regression checks.
2. Independent technical review with focus on touch gestures, local 21+ skip semantics, safe URL handling, sensitive-topic suppression, source and creative rights, and image performance.
3. Reconcile conflicts with other changes to `shop-phi-switchboard.mjs` (notably smoother fade PR #1896) before any permitted merge.
4. Browser tests at 320/360/393/720 px: show → swipe → 21+ skip → reopen → no adult; restore through explicit preference; next image at image 6 → next card image 1; pause on hidden; full movie unaffected.
5. Cloudflare deployed-asset readback and physical Android verification are **separate**. No server-side identity, D1 consent, bot runner, wallet or token changes.
6. Only with explicit viewer opt-in and permitted video source metadata should a future companion story tray be related to a currently viewed movie. No screen or microphone surveillance.
7. Preserve real Follow/Following from #1883 separately; no cross-device account claim.

## Acceptance distinction
Source built ≠ CI passed ≠ independently approved ≠ merged ≠ deployed ≠ real Android/browser verified. Every stage requires actual evidence.
