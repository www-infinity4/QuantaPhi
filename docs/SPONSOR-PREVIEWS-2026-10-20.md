# QuantaPhi sponsor preview: Lazercat + Illicit SMOKOS Bruce Banner

Status: **DRAFT – not licensed, not approved for production advertising, not a paid partnership.**

## Source identifiers
- Lazercat: https://lazercatcannabis.com/ . Reference brand artwork used on prototype page originates from product-assets.iheartjane.com (rights unverified).
- Illicit SMOKOS: https://www.illicitbrand.com/marijuana-flower-smokos-preroll-packs . Reference cassette-tin photograph comes from Illicit Gardens' official site (image-use permission unverified).
- Bruce Banner Smokos product listing: https://www.leafly.com/brands/illicit/products/illicit-bruce-banner-smokos-2pk-pre-rolls . The pictured cassette is a *hybrid product illustration*, not necessarily the exact two-pack edition pictured in every listing.
- Brand names and logos are their owners' trademarks. Do not represent this prototype as an authorized campaign.

## Scope
- Two existing QuantaPhi green arm positions: left -> Lazercat; right -> Illicit.
- Landing pages `/ads/lazercat/` and `/ads/illicit/` open inside the existing first-party Infinity site viewer.
- Viewer landing pages require a 21+ click before showing the reference image. A self-attestation is **not identity/age verification**, and does not establish compliance with local cannabis-advertising laws.
- Each landing page discloses that it is a prototype, not a confirmed paid placement.
- Explicit outbound action opens the brand's actual site in a new tab with a fallback rather than claiming unsupported third-party iframe embedding.
- Anonymized `view` after 1s at least 50% visible, and `click` on the actual outbound action.
- Cloudflare D1 table and Worker endpoint for idempotent event storage; daily reporting can query `/api/sponsor-stats` after the production binding exists. No client-side credit or payouts.
- GA4 event pings are kept separate from actual stored D1 receipts.

## Required before release
1. Obtain creative/brand advertising permissions and confirm the correct imagery for each campaign, including the requested Lazercat artwork.
2. Review advertising regulations and platform/network policies for legal-age targeting and eligible jurisdictions; use a real gating/geo-compliance service rather than treating the self-confirmation as proof.
3. Complete advertiser attribution/affiliate contract with a real settlement webhook before promising purchase or Quant rewards. Never pay for unverified ad clicks or pretend that visiting a website creates revenue.
4. Clear sync/commercial rights to any **Bob Marley** recording. A YouTube consumer music embed is *not* evidence of a license to use a recording in a paid cannabis advertisement. The prototype intentionally has no autoplay track.
5. Provision D1 and bind `SPONSOR_EVENTS_DB`, apply `sponsor-events.sql`, deploy the Worker update and confirm real D1 receipts. If binding is absent, API returns 503 and no event is counted.
6. Verify real mobile viewer behavior, outbound open, accessibility and click-dedup with receipts before merge.

## Non-claims
No purchase conversion, payout, wallet mint, paid campaign, approved sponsor, licensed music, Cloudflare deployment, or live traffic is claimed by this PR.
