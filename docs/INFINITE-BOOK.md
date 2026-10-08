# The Infinite Book of Big Secrets (QuantaPhi v1)

A source-backed orange discovery card mounted **immediately below QuantaPhi's search bar**, without changing existing search, media cards or wallet mint logic.

## Discovery dimensions
- Choose 1–39 based on personal-interest signals: sector, defined in `infinite-book-catalog.json` (`sectors`).
- Roll 1–20: story angle (`angles`).
- Roll 1–10: source class (`sourceClasses`).
- The picker weights one of 39 sectors from searches and collections, rolls a story angle and source class, attempts live sourced discovery, and falls back to an unread verified entry. The rolls are discovery guidance, not proof that every combination has a story.

## First ten published entries
Mona Lisa identification, Edison/Topsy misconception, Philip experiment, White House ghost reports, Apple/iPhone launch, Venus day-versus-year, computer moth, Boston molasses disaster, pulsar discovery, and the WWII Ghost Army.

Every entry has a unique ID, its own original short and expanded Phi text, sector, angle, source class, factual-status label, and an HTTPS source reference. The Philip experiment and White House ghosts are labeled claims/folklore; the Edison elephant narrative is explicitly corrected.

## Card features
- Automatically selects one unseen story when loaded; **Another secret** selects another unseen entry.
- Full story expands in place, with the original source linked.
- Star is a device-local favorite (not automatically a StarCoin payment).
- Share uses native share where possible (or copies a canonical deep link), and sends an existing QuantaStarCredit *share* event **only after success**.
- Collect writes a compatible `quantaPhiCollected` record, emits `quantaphi:collected`, calls the existing deduplicated QuantaStarCredit *collect* hook, and attempts a Quanta Cloud collect sync when authenticated.
- Build with Infinity, Omni, or QuantaPhi opens their destination through the existing `inPageSite` viewer and passes the headline, original synopsis, source, and story ID in the URL. Destination apps still must parse/use these parameters to preserve all context.
- Refresh **does not mint** Quants or Infinity tokens. Discovery browsing is separate from the search mint pathway.

## Limits: next phase for a genuinely growing book
The initial release ships **10 verified stories**, not an infinite feed. It refuses to repeat once they are all read. User history currently lives in browser localStorage, so it is not a cross-device uniqueness guarantee. Indexed URLs are public original-source links; arbitrary publishers are *not* fetched by the client.

To move from the seed catalog to continuously expanding discoveries:

1. A Cloudflare Worker cron/source harvester chooses (sector 1–30, angle 1–20, source class 1–10), selects a relevant *approved source* for that sector (not a random unrelated corporate site), and queries APIPhi/SearXNG/approved feeds, museums, universities, and archives. A company site (e.g. GE or Tesla) is considered for its own claims/history only; corroborate contentious history independently.
2. Extract canonical URL, title, publication date, event date, credited author, source type, and full citation. Check robots/terms and source rights; keep only a link plus an independently written short/expanded summary rather than copying the article.
3. Fact-check dates, persons, and contradictions. Assign `documented`, `reported/attributed`, `contested`, `myth corrected`, or `folklore` statuses. Reject unsourced material and invented quotes. Flag distressing/graphic stories.
4. Deduplicate canonical links and semantic aliases (same event under different headlines). D1 tables: `book_sources`, `book_stories`, `book_story_sources`, `book_discovery_runs`, `book_user_seen`, `book_user_collections`; use unique constraints for URLs and per-user seen IDs. Never wipe history when catalogs change.
5. Publish verified stories to a same-origin JSON endpoint. Set `window.PhiInfiniteBookFeedUrl = '/path/to/feed.json'` **before** the `infinite-book.js` script; the v1 runtime can merge validated feed records into the catalog. Keep server auth and durable per-user seen state separate from local fallback.
6. Route the validated JSON story through Oracle for source weighting and WidgetPhi for card presentation. The `build_widget` payload should carry `id,title,summary,full,sourceUrl,status,sector,angle,sourceClass`.

## Sanity checks
- `infinite-book.js` should parse in JavaScript without syntax errors.
- `infinite-book-catalog.json` should contain exactly 39 sectors, 20 angles, and 10 source classes, with unique story IDs and HTTPS citations.
- Once an ID is marked seen, it must not be offered as a new pick on refresh or repeated button clicks.
- Canceling Share must not award StarCoins. Collecting the same story again must not generate a new credit.
- If the catalog is exhausted, display a visible no-new-stories message rather than silently recycling stories.
- Verify the exact domain routes (`/InfinityPhi/`, `/OmniPhi/`, `/`) with the live Cloudflare deployment before promoting this PR; GitHub Pages and the .org routes are different environments.


## Version 2 — individualized visits and search triggers

- A page visit or refresh tries one unseen card. Each fresh QuantaPhi search fires a new discovery, while a restored initial permalink does not double-trigger it.
- Interests are scored from the existing QuantaPhi search history, any available cloud build history, current query, and collected cards. Radio, broadcasting, semiconductors, computer and consumer electronics have special sectors 31–39.
- The first random factor is the story angle (1–20), followed by the source class (1–10). The source registry produces two targeted SearXNG searches and the existing Phi AI endpoint drafts an original evidence-limited story. A second source host is required.
- Only ten verified seed stories ship as fallback; no large prebuilt library is needed. If external endpoints are unavailable or source evidence is too thin, a new live item may not be possible. No made-up historical stories are allowed.
- Read history is device-local for now. A durable, authenticated Cloudflare D1 store is required for guaranteed no-repeat experiences across all of a user's devices. Browser storage caches only 100 recent live story bodies; seen IDs are not truncated.
- Reading stories never mints search tokens. Star/Share/Collect retain their existing distinct semantics. Live sharing carries a source, headline and summary in the Phi link pending canonical story URLs.
- This version is a source-gated discovery prototype. Search snippets are not full articles or an independently verified historical account. Future Oracle source verification and WidgetPhi reusable card integration should be backed by D1 and first-party publishing rights checks.
