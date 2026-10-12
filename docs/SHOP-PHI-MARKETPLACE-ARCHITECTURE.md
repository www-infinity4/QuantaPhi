# Shop Phi + Ad Phi marketplace architecture · 2026-10-12

## System objective
One camera-first seller experience in the Shop Phi Oracle Octaves card, reused through QuantaPhi, Shop-Phi, WidgetPhi and Ad Phi. The existing specialized color robots are the product's orchestrators; any LLM is an interchangeable image perception/copywriting tool, not the seller or publication authority.

Seller camera / gallery / video → private durable media → robot data validation → policy + item review → sourced copy and recent sold-price comparables → owner confirmation → server moderation → publication → Quant contextual relevance → disclosed sponsored slots → original merchant checkout / receipts / reporting.

## What is built versus what is not
- QuantaPhi Shop Phi/Ad Phi card from PR #171 supports local listing drafts, external HTTPS seller links, and conditional owner publishing to WidgetPhi. Publishing currently assumes external URL sources, not certified merchandise.
- Shop-Phi index currently offers merchant search links, not individual verified products or native checkout.
- WidgetPhi's current shop publisher has owner session authorization but no durable photo ingest, human-safe model review receipt or payment settlement.
- Moltnook agents/jobs.json and agent roster provide actual scoped issue/inspection routing. Cross-repo model-driven write execution remains limited and must not be faked.
- This PR adds an in-card camera, camera-picker fallback, image gallery, short video import, preview, IndexedDB storage and local media draft references. It does not connect R2, model vision, real sold comps, D1 seller products or payment processing.

## Assigned specialist roles
- Greenbeans: Owner-scoped R2 asset upload with original-file encryption/access controls and D1 manifest links; resumable / idempotent upload receipts and public rendition privacy stripping. Prevent raw personal camera EXIF/geolocation publication.
- Bluey → Blueberry: Inspect byte/mime/duration, metadata, source provenance, duplicates and item fields; keep immutable originals, create safe square thumbnail previews without replacing evidence.
- Gold Digger's Ink: Draft factual text and suggested price RANGE only from dated sold comparables (not asking prices). Report unknown if evidence cannot be found.
- Bluth / Orange Peel: Server-side legal and product policy gate (prohibited weapons, illegal drugs, counterfeit, stolen and restricted goods), image-to-description consistency, ambiguity/manual review/appeals. Client regex is just an early hint.
- Purple Pearl: Oracle Octaves mobile card, camera-first layout, correction-only fields and clear private/public state.
- Pink Panther: test forged certs, wrong coin dates/mintmarks, one-sided photos, edited replicas, duplicate photos, oversized video, upload replays, merchant scope and false positive appeals.
- Greenbeans + Bluth: Contextual Quant matching by current shopper intent rather than sensitive inferred traits. Distinguish organic listing inventory from clearly labeled Ad Phi sponsored placements.

## Coin handling
Require photos of obverse/reverse, condition and relevant edge/mintmark; ask for certification evidence where graded status is claimed. Photos are clues, not proof of authenticity. Never invent grade, origin, silver content, error variety, mintmark, or certificate ID. Keep original photos privately. Listing previews may fit automatically but must not erase damage or hide inscriptions. If generating an eBay listing, separately enforce eBay collectible currency limits and approved grader policies.

## Mandatory publication states
private_draft → media_uploaded → ai_assisted → needs_review or rejected → server_verified → published → sold or withdrawn.
Every claim/price/media edit invalidates the verification decision. Server approval must bind immutable media hashes, seller identity, listing version, category, review policy version, review actor and timestamp; a browser-provided approved flag is not trusted.

## Planned APIs, not operational
POST /shop/seller/upload-init; POST /shop/seller/upload-complete; POST /shop/seller/analyze; POST /shop/seller/request-review; POST /shop/seller/publish; GET /shop/public/listings.
All need tenant isolation, auth, CSRF protection, size limits, content inspection, evidence, explicit seller consent and abuse/appeal workflow. Checkouts and StarCoin rewards require actual separate settlement services, never simulated.

## Verification status
This PR covers local capture and draft gating only. Server image analysis, owner R2/D1 persistence, authenticated moderation receipts, actual sale fulfillment, Quant product-ranking and deployment require separately verified engineering changes.