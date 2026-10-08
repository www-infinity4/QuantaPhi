# Infinity Reads & Realms — sector-index build contract

**Important:** Staging implementation only; NOT connected to the public story card, QuantaPhi wallet, refresh minting, site deployment, or existing Omni channels.

## Not a 100-word universal catalog

Each of the 30 top-level sectors must maintain **at least 100 reviewed, sector-specific indexed subjects**, independently. That means **3,000+ reviewed sector/topic relationships** as the minimum launch condition, with capacity for thousands more. Subjects may appear in more than one appropriate sector (e.g., helium in Energy and Chemistry).

Actual data storage: Cloudflare D1 `infinity-reads-realms-index`, with versioned and idempotent migrations in `workers/reads-realms/schema.sql` and `seed-index.sql`. Nothing in these migrations reads or changes tokens, customer information, or existing StarCoin and Quant ledgers.

### Ordered brackets

1. **Sector** — one of 30 subject sectors; optionally nudged by Quant interests, but plenty of unrelated exploration remains.
2. **Sector-specific indexed subject** — from at least 100 reviewed terms **within the selected sector**. Never take a globally random unrelated word.
3. **Research intent** — one of 20 choices (History, Origins, Mysteries, etc.).
4. **Narrative realm** — independently choose Mystery, Suspense, or Adventure. Changes storytelling emphasis without making up evidence.
5. **Evidence source class** — an independent constraint (museum, archive, scientific institution, specialist historian, etc.).

Example: `Energy → Helium → History → Mystery → Museum / archives`.

Only bracket 1 and 2 produce the research subject. A click immediately searches `Helium History`, then more precise related queries. SearXNG returns up to 20 *result excerpts* from real source links; those excerpts are NOT the same thing as reading 20 complete website articles. A future source reading service must fetch and honor publisher licensing, robots, and terms before saying full sources were read.

### Original researched story card

The GPT writer compares candidate events, chooses a single well-supported, interesting story, writes original prose, labels uncertain or legendary claims, and cites at least two **independent domains** about the **same event**. It may have a suspenseful opening, but must not invent dialogue, dates, conspiracies, discoveries or conclusions. Story status is shown honestly; a failed research or source verification step returns an explicit error, not a fabricated or repetitious card.

No token minting on display or refresh. **Star/Share/Collect/Build** connections must be carried forward when and only when the existing UI is integrated and tested.

### Readiness gates

- All 30 sectors have at least 100 reviewed indexed terms with no empty sectors.
- Every draw selects exactly one term belonging to its selected sector; the previously drawn term/angle/realm IDs remain fixed for story writing.
- The same story ID / canonical event key isn't immediately repeated; seen history is durable only after a protected identity scheme is implemented.
- Run browser tests on Android-size viewports for long story titles, button taps, scroll, and loading recovery.
- Test stale, down, malformed and timed-out SearXNG and GPT services; return a sourced saved card with an honest label or visible retry, never a made-up story.
- Verify a valid public deployment and data source endpoint *before* connecting the new Worker to the main site.
- Run all existing QuantaPhi story, search, minting and wallet regressions; do not mask unrelated failures.

## Current staging coverage

The Cloudflare D1 has 30 sectors. Energy has 123 curated indexed topics. The other sector catalogs contain only the retained legacy seed words; those sectors are **not ready to publish**. Count verification is available through `/health` or `/v1/counts` when the staging Worker is deployed with its `RR_INDEX` D1 binding.

The `/v1/draw` Worker route refuses a sector with fewer than 100 reviewed words. The `/v1/story` route is disabled to public clients unless an authorized server supplies the `RR_WRITER_TOKEN` binding. Those safeguards must remain in place during further expansion.

## Next implementation milestone

Fill and independently review the remaining 29 sector-specific word libraries, add a controlled ingestion and editorial review path to D1, then integration-test and launch the new UI behind a feature flag. Existing story card stays in place until the replacement passes.
