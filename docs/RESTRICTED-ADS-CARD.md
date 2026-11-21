# Restricted-category Quick Card · November 2026

**Status: client UI and fail-closed review gates are built; adult advertising is NOT live.**

The homepage contains one neutral 21+ card. It displays **no product advertising or adult imagery before verified consent and eligibility**. The separately verified **paid restricted advertising API** remains cannabis-only in v1. The visitor-led **independent publisher navigation** now also offers lifestyle and event kits, with per-visit acknowledgment (not third-party age verification). The card uses the QuantaPhi carousel; the existing public Quick Ads engine and wallet are unchanged.

## Required first-party service contract (not deployed by this PR)

- `POST /v1/restricted-ads/consent` — authenticated, CSRF-protected JSON `{category:"cannabis",opt_in:boolean}`. Persist consent with verified identity, return `{consent_recorded:true}` only after durable write. Withdrawals must be enforceable immediately. No cookies or user IDs in URL parameters.
- `GET /v1/restricted-ads/creatives?category=cannabis` — authenticated, no-store, verified 21+ age proof from approved identity vendor, location/legal-jurisdiction check, opt-in recheck, license and approved campaign checks **server-side before returning a creative**. Deny with 403 for all unverified states. Never accept a browser-supplied self-attested birthdate as proof.
- Response if approved: `{decision:{allowed:true,verified_over_21:true,opted_in:true,category:"cannabis",jurisdiction:"US-CO"},creatives:[{id,category:"cannabis",approved:true,advertiser,license_id,approved_jurisdictions:["US-CO"],reviewed_at,title,description,image,url,publisher_domain}]}`. Values above are **schema examples, not real licenses or ads**. Only reviewed, rights-cleared, original publisher-hosted HTTPS assets; no invented prices, strain names, deals, health claims or direct checkout.
- Verify laws for the **viewer** and **advertiser** jurisdictions; maintain a compliance review timestamp and revocation controls. Domain/asset licensing is not established merely by discovering a photo online.
- Avoid third-party ad-network scripts in this route; general Google/Meta ad policies typically prohibit recreational-cannabis promotions. Do not send verified age, category, searches, wallet, or inferred interests to unrelated ad networks.
- Disable all loading and analytics of restricted creative until the session-based server response is eligible. Explicit opt-in is the only personalization signal; **Quant usage must not infer cannabis use or adult preferences**.
- Deploy only after API integration tests, vendor age-proof verification, compliance review, accessibility and Android testing. A click labeled 21+ is not an age verification, and no such bypass is implemented.

## UX and safety
The page displays a neutral preferences panel. The opt-in button calls the server; while endpoints are absent/blocked it shows an honest unavailable state and no ad. Approved images rotate without an immediate repeat at a modest interval or by pressing Next, respecting reduced motion. Disable immediately clears images, then asks the server to revoke consent. A failed opt-out should be retried once service support is present; no private data is logged by this client.

## Tests
Run `node --test test/restricted-ad-policy.test.mjs` and `node --check restricted-ad-card.mjs`. Existing card tests and browser regression suite remain separate.

## Lifestyle publisher carousel and purpose kits · November 1, 2026

The source-only catalog is in `adult-lifestyle-catalog.mjs`, used by the existing `restricted-ad-card.mjs` on the homepage. Source destinations currently include Playboy; Victoria's Secret, Adore Me, Savage X Fenty and Agent Provocateur; Hims (healthcare decisions on the provider's site); GRAV glassware (the original shop controls its own 21+ rules); Amsterdam's official De Wallen and nightlife guides; Café de Jaren, Coffee & Coconuts and The Coffeeshops' English-language venue information; OpenTable, Spafinder, Sonos, Philips Hue, Etsy and Eventbrite.

- **Six curated source kits:** date night, Amsterdam after dark, room party, lingerie and wellness, glass and coffee lounge, and special occasion. Each kit groups 3–4 original official links inside one 21+ Quick Card; a separate original-site spotlight rotates every 20 seconds while visible, with Pause and Next buttons and a reduced-motion fallback. Cannabis source discovery remains available as a distinct kit, not folded into the lifestyle supply chain.
- **No live price or buy action:** these links do not constitute authorized advertisements, affiliate programs, product catalogs, medicine recommendations, bookings, a unified cart or retail checkout. No copied media or invented menus/ratings; providers retain their own account, age, medical eligibility, location, ordering and shipping gates.
- **21+ shelf versus local law:** The QuantaPhi browse acknowledgment is for this visit only. Some official providers allow younger adults or all ages, and Amsterdam venue entry conditions are determined in the Netherlands. A visitor clicking 21+ is not verified for restricted advertising.
- **Excluded by product policy:** no alcohol, tobacco, nicotine or mushroom products are included or pitched as kit ingredients. The De Wallen guide covers cultural tourism and nightlife, without identifying, photographing or facilitating bookings of individual sex workers.
- **Cost claims:** potential consolidated shipping, energy, packaging and purchasing savings can be evaluated only after verified offers and an actual willing fulfillment partner provide compatible quotes; no benefit is asserted by this source list. Compare direct deliveries against a contracted hub before calling a bundle cheaper or greener.
- **Traffic model:** QuantaPhi can provide an original entry point, themed recommendations, optional event planning and site-to-site referrals. Links alone do not transfer the publisher's original audience, advertising inventory or monetization rights. Partner agreements, licensed catalog feeds, rights-cleared creatives and affiliate disclosures would be separate work.

Checks: `node --check adult-lifestyle-catalog.mjs`; `node --check restricted-ad-card.mjs`; `node --test test/restricted-source-directory.test.mjs test/restricted-ad-policy.test.mjs test/adult-lifestyle-catalog.test.mjs`. Do not deploy restricted paid campaigns without the existing server-side verification and rights checks.

## Purpose-kit checklist upgrade · November 2, 2026

The 21+ source card now includes a deliberate **Build a kit research plan** button after this-visit acknowledgment. A visitor can enter a personal **USD budget ceiling** and an optional delivery/visit region, then assemble a source-by-source checklist. Each source is explicitly a retailer, publisher, booking platform, venue, health provider, regulated accessory merchant or visitor guide — not all are shipping-ready sellers.

- **In-card results:** source links, role labels, budget ceiling and clear notice that current offers, stock, shipping and jurisdiction have not been verified. No order is placed.
- **Controls:** switching kits and closing the 21+ shelf clear the prepared result. The cannabis source option never offers this kit planner; its separate restricted-ad workflow stays unchanged.
- **Copy checklist:** an explicit visitor click writes a plain-text research plan to the device clipboard. No first-party server receives the plan and no browser persistence, identity profile, analytics targeting or wallet charges are added.
- **Power Chain connection:** the card links to the existing Design Lab Power Chain 003. It does **not** pass age-restricted interests, budget or location in the URL. Visitors must enter any planning details there voluntarily.
- **No invented freight:** `adult-kit-research.mjs` does not connect to merchants, invent live prices, promise shipped packages or calculate shipping savings. Real quotes and 3PL contracts must be acquired separately.

Acceptance: `node --test test/adult-kit-research.test.mjs`, `node --check adult-kit-research.mjs` and the Android-width `test/adult-lifestyle-card.browser.spec.mjs` regression.

Follow-up: Continuity Builder issue #1446 for approved merchant offers, licensed creative rights, actual supplier discounts, and signed hub quote receipts.
