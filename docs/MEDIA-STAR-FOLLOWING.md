# Media Star — followed accounts and two independent X Spaces rolls

## Actual data inventory (October 11, 2026)
- Existing platform D1: `media-star-following-spaces`, UUID `0612b802-ec33-4eaa-9716-2870d36d5356`.
- 342 direct Fred X Spaces URLs already stored and marked `indexed`. That means the source link was indexed, **not that the replay audio was played and confirmed**.
- Existing Fred Curio Spotlight and `fred-spaces-ledger` keep the one-full-StarCoin curated unlock protocol. The new service never reads Fred's private unlock credentials or rewards someone for refreshing.
- No authenticated X following list has been connected: `followed_hosts` initially had zero rows. No fictional 41-account import.
- Magoo's two guest recordings remain separate from actual X Spaces; they are **not** substituted for Magoo-hosted Spaces.

## Selection contract
For a particular wallet-authenticated owner:
1. Read their currently followed X accounts whose hosts have at least one indexed or reviewer-verified original X Space link.
2. Draw a uniformly random number from 1 to the number of **eligible followed hosts**, independent of each host's episode count. If 41 eligible people, draw 1–41.
3. For that selected host, read its original X Space index and exclude episodes in that wallet's seen history. Draw a new uniform number from the remaining entries. If 33 unseen episodes, draw 1–33.
4. Persist the two numbers, host ID, episode ID, owner ID, and timestamp in D1 before returning the result; replaying the same `rollId` returns the same episode. Once a host's episodes are exhausted, the host's seen cycle restarts.
5. Fred is always highlighted in the UI but only enters the two-roll pool if **actually followed**. Its curated URL is not returned by the following-worker for locked playback; use the existing Fred Curio Spotlight entitlement flow.

The user can browse the complete currently indexed episode list per followed host. For non-Fred hosts, each original link opens at X. X may require a sign-in, may block embedding, or may no longer serve a replay. “Indexed” is not “playable verified.”

## Auth and import
All owner-specific endpoints require the existing StarQuest device-session bearer token and resolve the account against the existing `IDENTITY_DB.account_devices`. No X credentials or wallet balances are stored in a media player HTML page.

`/v1/following/sync` uses the official authorized X user account's following endpoint when **both** `X_USER_ACCESS_TOKEN` and the matching platform `X_OWNER_ID` are securely configured in Cloudflare. `/v1/spaces/sync` uses X's creator lookup for currently returned Space metadata. These endpoints fail closed if no authorized connection exists.

Where X is not connected, a user may enter their **real** followed @handles and their collected original Space URLs. These records are tagged `owner_import` and `indexed`—they are not falsely described as X-verified or audio-verified. The server de-duplicates URLs by Space ID and now stores durable import receipts. A full X archive is not guaranteed by X's API response and should not be presented as exhaustive history without supplementary authorized source discovery.

### Routes
- `GET /health`, `GET /v1/featured`
- `GET /v1/following`, `POST /v1/following/import`, `POST /v1/following/sync`
- `GET /v1/hosts`, `GET /v1/episodes?handle=<handle>`
- `POST /v1/space/import`, `POST /v1/spaces/sync`
- `POST /v1/roll`, `GET /v1/history`

## Cloudflare binding and deployment
Canonical source: `workers/media-star-following/worker.js`.
Wrangler config: `workers/media-star-following/wrangler.toml`.
Use the existing D1 and identity DB; **never** provision a new empty D1 for every host or duplicate these ledgers.

The root QuantaPhi page mounts `#followingSpacesRadio` after the Fred and Magoo cards and includes `following-spaces-radio.js` and its CSS.

Node 24 integration tests: `node --test test/media-star-following.test.cjs test/fred-catalog.test.cjs test/magoo-spaces.test.cjs`, plus existing QuantaPhi wallet and news regressions.

Security/rights: no audio rehosting, no entitlement bypass, no unverified payment credit, no scraping or automated private following access without the user's authorized X connection.

## October 11 screenshot import and priority research
The user supplied a screenshot of the **Following** tab from their X account.
Six clearly readable handles were saved to their private Cloudflare followed
catalog as `owner_import` with snapshot ID
`x-screenshot-20261011-six-visible`: HodlMagoo, 1_isavedbygrace,
Aequitas42, BankerWeimar, AMCDiamondHands, optionscalps. The screenshot is
a **partial scrolling window**, not evidence that the user follows only six
accounts, and does not reveal the user's exact X @handle.

The public priority source index separately identifies **Aequitas42,
GaryCardone and GrantCardone** as requested research targets. Aequitas is
visible in the Following screenshot; the Cardone accounts are **not confirmed
as followed by that screenshot**. The Cardones are not inserted into the
owner's `followed_hosts` set solely on the basis of public search.

The new `space_host_sources` table stores host-linked public archive/profile
discovery URLs as `discovery_only` leads. These URLs do not go in
`space_episodes`. Public Spaces host archives can include **appearances
as speakers**, not necessarily recordings hosted by that profile; confirm the
role and the complete original X Space ID before creating any episode.
A source page being indexed, or an X Space URL being syntactically valid,
cannot prove that a recording remains playable. Never synthesize missing
Space IDs from truncated search-engine result URLs.

Before claiming a complete live Following sync, resolve the actual account
identifier through authorized X access and review the full paginated response.
If X access is unavailable, only collect accounts that the user visibly
supplies or explicitly confirms. No independent follow set is overwritten by
a partial screenshot import. Each person is a logical partition in the shared
D1 host/episode schema, not an unnecessary standalone Cloudflare account or
new physically empty D1 database.

## Owner X identity link — October 11
The owner identified the X handle as **@YahooPingcwlz**. It has been
registered in the existing `media-star-following-spaces` D1
`x_account_links` table as `owner_claimed`, associated exclusively with
their already-verified `kris` StarQuest account. No claim has been made that
X verified the account or that the current full Following list was retrieved.

Endpoints `GET /v1/x/account` and `POST /v1/x/account` are wallet-session
authenticated and do not allow another owner to view or change this mapping.
The radio card shows its saved @handle, opens the exact
`https://x.com/YahooPingcwlz/following` page, and can save another handle
from its account-settings panel.

**Safety rule for future OAuth:** Before any authorized X Following sync may
replace screenshot-imported rows, the Worker checks that `/2/users/me` returns
the **same username** as the owner-declared one (case-insensitive). A mismatch
returns HTTP 403 without deactivating previous follows. Only after every
page of the authorized Following response is fetched and committed may the
mapping change to `x_api_verified`. It records the verified X user ID and
timestamp. No private X token should be kept in D1, source, browser local
storage, logs or Media Star exported cards.

Public browser page retrieval of X's Following tab is not a reliable
authenticated feed; do not assume it exposes every followed user. The
platform must configure owner-authorized X provider credentials with
appropriate read scopes before genuine full import and historical Space
discovery can run. The existing six screenshot-confirmed followed handles
remain available even without this connection.
