# Media Star — independent creator card and protected Curio Spotlight

## Ownership and content boundaries
- **Media Star** is the QuantaPhi platform's reusable visual/media-card invention.
- **Fred's Curio Spotlight** is a separate curated program served **only on QuantaPhi**. Keep its current catalog, original-X replay links, feed, search, recent-listen logic, and server-side StarCoin unlock service operating.
- A visitor can **copy the blank Media Star template** from QuantaPhi, but the exported markup must contain **no** Fred episodes, no episode catalog, no Fred stream or paid unlock URLs, no backend tokens and no platform wallet payout settings.
- Media Star creators provide an HTTP(S) link to **their own authorized** audio/video/episode or external player, add their own title and story, and publish their own finished card. The blank embed asks for a media link if they haven't supplied one. A blank embed's link entry is a viewer-local preview until added to the published website source.
- Card builders can use AI to help connect a creator's **own** Cloudflare Worker and D1 database. Never copy QuantaPhi D1 bindings, the Fred ledger Worker, the StarQuest owner wallet, the platform's indexes, or private API credentials. Do not place any API secret in HTML.
- Copying public card markup is technically possible. Access to the platform's protected ledger and payout account must be secured **server side**, independently of what HTML is copied.

## Payment contract
1. Fred's QuantaPhi discovery fee is one StarCoin for a *new* curated episode; the platform's active owner wallet is the only recipient. The original replay plays on X, with no claim of audio ownership. Owner previews cost zero; duplicate episode visits cost zero.
2. An embedded creator card starts **free, with no payment endpoint**. A creator may separately opt into paid access, connecting their verified Unified Wallet and their own backend.
3. For creator payments, an AI builder should generate or configure a **creator-specific** D1 ledger that implements idempotent charges, entitlement receipt, owner's payout, verified recipient, duplicate-click and refresh guards, all in atomic transactions. A client cannot nominate a wallet recipient at charge time.
4. **No creator card may use the Fred ledger's checkout endpoint, payout destination, episode index, runtime credentials, or backend Worker to collect coins.** Keep Fred's public catalog/replay feature live; never remove or disable that service to achieve this separation.
5. Do not use copied public content without appropriate rights; user-supplied source URLs do not confer redistribution rights.

## Implementation
- Fred's non-embeddable runtime: `fred-spaces-radio.js`, `media-star-index.json`, `fred-spaces-radio.css`.
- Creator studio and downloadable template: `media-star-creator.js`, `media-star-creator.css` (separate `#mediaStarCreator` panel on QuantaPhi).
- The creator edition's `window.PhiMediaStarAsset.html({title,url,description})` outputs only the blank or filled creator template.
- Builder handoffs use `assetType=media-star-blank-v3` and explain the creators' independent payment/database setup.
- Fred's backend: `www-infinity4/TV-Database/workers/fred-spaces-ledger`, with fixed platform recipient and zero-coin owner preview.

## Accounting incident
A live audit found five historical Fred unlock debits, but no linked owner payout receipts. The owner reported one previously missing coin and separately reported a two-coin UI drop when checkout displayed "paused". The StarQuest Fred ledger contained no additional Fred debits explaining that last drop at the time of audit. Do **not** automatically mint/refund two or five coins: investigate wallet display identity and other transactions before editing balances. See TV-Database issue #110.
