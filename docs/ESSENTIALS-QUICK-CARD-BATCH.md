# Hard-to-find medicine cabinet Quick Cards · batch publication

Owner request 2026-11-07: Blue Star 2oz Walmart product; forgotten and everyday OTC essentials; 100+ cards at a time; one Public feed and optional user-chosen Power Chain.

## Existing integration
- Editorial pilot: 4 source-backed cards in essentials-card-batch.mjs (Blue Star 2oz, Campho-Phenique, Aveeno Anti-Itch, Sarna Original).
- Independent full retail listing link, publisher-hosted photograph, source label, no invented current sale, stock, ranking or sponsorship.
- Main page #essentialsQuickCards mounts the originals after ShopPhi; Oracle discovers the SAME original DOM card as its Public, For You, and Following card. Shared Follow / Star / Collect / Share / +1 Build controls are reused.
- data-personalization="disabled" prevents health card click/view analytics. Only an explicit on-card Power Chain follow turns on close Skin relief category matching. Unfollow this one is durable within the existing device-local follow state.
- The data/essentials-reviewed.json file (currently empty, fallback to curated 4) can hold up to 120 reviewed cards at a time. New validated entries are shown on the home page without editing HTML. To prepare a candidate batch offline:

    node scripts/build-essentials-batch.mjs editorial-source-input.json data/essentials-reviewed.json

- Candidates must have unique IDs, valid HTTPS original/product image URLs, date checked within 90 days, kind="otc", category="Skin relief", reviewState="editorial-reviewed", sponsored=false, imageRights="not-confirmed-for-paid-ads", and visible brand, name, size, sourceName, description, imageCredit. Any invalid, duplicated or out-of-limit item rejects the entire import. Review the staged JSON in PR before release.

## What this does not mean
- The runner is a batch preprocessor, not a continuous automatic crawler, verified trending chart, merchant API, drug approval, automated buying, affiliate relationship, price or inventory checker, ad purchase, payment ledger, or free permission to use retailer photos in paid placements.
- A 120-record fixture test confirms importer capacity, not that 120 real listings are curated. The pilot currently has FOUR real product references.
- Medical uses must come from approved Drug Facts labels, not inferred from shopper interest. No prescription product listing; check label contraindications and seek medical advice for severe or persistent symptoms.
- No promotion to main until CI exact-head, mobile original-photo fallback and card navigation acceptance, publisher photo and sponsored rights (for commercial ads), PR conflict resolution, and owner-approved release.

## Scaling
- Maintain topic/department-specific manifests and editorial source checks: skin relief, first-aid supplies, oral care, home necessities, clothing and denim. Do not mix OTC treatments with unrelated shopping suggestions based on medical inference. User choice seeds a chain; no follow without input, and each automatically suggested card can be individually excluded.
- Do not publish unreviewed stock, price or “trending” assertions. Future scheduled source checks should add dated provenance and only update reviewed catalog rows after genuine vendor API/permissions.
- Canonical issue #1315 and existing PR #1738. Preserve unfinished state and attach merge/CI/deployment receipts separately.