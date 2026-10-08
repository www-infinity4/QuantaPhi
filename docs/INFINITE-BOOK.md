# The Infinite Book of Big Secrets (QuantaPhi v1)

A source-backed orange discovery card mounted **immediately below QuantaPhi's search bar**, without changing existing search, media cards or wallet mint logic.

## Discovery dimensions
- Roll 1–30: sector, defined in `infinite-book-catalog.json` (`sectors`).
- Roll 1–20: story angle (`angles`).
- Roll 1–10: source class (`sourceClasses`).
- The picker scores verified candidates against all three rolls, broadens when the exact combination is unavailable, and **never chooses a previously seen story** from this browser's persisted ID history. The rolls are discovery guidance, not proof that every combination has a story.

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
- `infinite-book-catalog.json` should contain exactly 30 sectors, 20 angles, and 10 source classes, with unique story IDs and HTTPS citations.
- Once an ID is marked seen, it must not be offered as a new pick on refresh or repeated button clicks.
- Canceling Share must not award StarCoins. Collecting the same story again must not generate a new credit.
- If the catalog is exhausted, display a visible no-new-stories message rather than silently recycling stories.
- Verify the exact domain routes (`/InfinityPhi/`, `/OmniPhi/`, `/`) with the live Cloudflare deployment before promoting this PR; GitHub Pages and the .org routes are different environments.
