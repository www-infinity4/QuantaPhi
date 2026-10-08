# Infinite Book — four-roll Cloudflare library (2026-10-08)

## Preservation
- The existing Cloudflare D1 database `infinity-reads-realms-index` retains the legacy `rr_*` schema and **4,280 reviewed topics**. Do not wipe or rewrite these records.
- Existing site: 30 top-level sectors, 20 reusable research refinements, and 3 narrative genres, plus 39 catalog sectors including nine specialist mappings. The original 6,000 research routes are retained as a legacy indexing concept, not a ceiling on stories.
- New D1 tables: `book_sectors`, `book_subjects`, `book_angles`, `book_directions`, `book_stories`, `book_story_paths`, `book_story_sources`, `book_story_jobs`. The book tables do not change any wallet/coin balances.

## Four bracket choices
1. **Sector**: one of 30 major categories (including Energy & electricity).
2. **Indexed subject**: a topic compatible with that sector. The Worker exposes the original 4,280 `rr_topics` as namespaced subject IDs `100000 + rr_topics.id`, plus 112 bundled/catalog subjects. Additional words are allowed; no 100-item hard stop.
3. **Research angle**: an independently reusable concept such as Origins, History, Hidden evidence, or Scientific breakthroughs.
4. **Story direction**: one of 36 initial final-slot concepts, including Inventors & discoveries, Next-generation technology, Future benefits, Engineering bottlenecks, and Mathematics behind the mystery. More may be added without invalidating existing paths.

The optional narrative style (Mystery / Suspense / Adventure) and evidence class are separate **instructions**, not two extra primary bracket rolls.

A story can belong to **many combinations** through `book_story_paths`; a combined path may have many independent documented stories. This enables Energy → Solar panels → Origins → Inventors & discoveries to return an appropriate archive entry without making every solar story share that single route. Canonical event keys and reader seen IDs prevent retelling identical events as new stories.

## Verified stories versus research candidates
- The initial 22 curated seed stories have been copied into D1. Four additional checked solar inventions and satellite-power stories live in `workers/infinite-book-library/curated-solar-20261008.json` and were also inserted in D1.
- **26 published stories, 100 queued research *candidates*, not 100 finished stories.** No claim of thousands of generated stories.
- The new `infinite-book-library` Cloudflare Worker reads approved D1 records using `GET /v1/book/feed`, or indexed subjects using `GET /v1/book/banks`. The public feed only returns records with `publish_status='published'`.
- The Worker has an AI binding and a small scheduled research queue running every three hours, processing up to two candidate jobs. Research gathers search results, asks GPT OSS 120B for an event-specific nonfiction draft, requires references to the same event on two different source hosts, then stores the result as **review**, never an automatically verified article.
- Editorial review and independent fact-checking remain required before drafts are published; see admin-protected `/v1/book/admin/import-stories` and `/v1/book/admin/drafts` routes. No `BOOK_ADMIN_TOKEN` has been set in the public repo. Set it as a Worker secret, never in browser HTML or GitHub.
- Shared screen pages continue to use instantaneous already-published stories, deduped against seen history. Remote Worker failure must not block a story already in the bundled catalog.

## Source and science rules
- Verify surprising historical claims against archives, museum records, patents, NASA, the Department of Energy, technical papers or reputable independent histories. Use HISTORY as a **lead**, not proof of a dramatic or contested assertion.
- Biographies are subject leads; the actual story needs a particular device, demonstration, experiment, document or event.
- Math exercises may appear when genuinely useful. Provide the formula, defined variables, units, assumptions and a checked calculation. Do not confuse illustrative values with recorded historical measurements.
- Claims about future technology, theories and open questions must be labeled as projections or hypotheses. Sources and source URLs are stored for each story.
- Stories are new original writing, not copied excerpts.

## Site integration
`index.html` configures `PhiInfiniteBookFeedUrl` and `PhiInfiniteBookBanksUrl` to the dedicated Worker. The client loads cloud data independently of the first visible story, preserving local fallbacks. `infinite-book-discovery.js` uses `indexedDraw` for the actual four rolls.

## Limitations / future work
- No-repeat is still primarily device-local; cross-device Cloudflare reader seen state requires an authenticated read-history bridge.
- The queued 100 research paths need source checking and editorial publication before they count as additional readable stories.
- GitHub merges do not themselves certify the live `quantaphi.org` frontend has been refreshed. Confirm the .org route and browser cache separately.
- AI research requires Cloudflare Workers AI usage and may incur account usage charges. Keep concurrency bounded; do not initiate 1,000 large simultaneous model requests.
