# Restricted-category Quick Card · November 2026

**Status: client UI and fail-closed review gates are built; adult advertising is NOT live.**

The homepage contains one neutral settings card. It advertises **no products** or adult imagery to people without verified consent and eligibility. Category v1 is cannabis only. The card uses the QuantaPhi carousel; the existing public Quick Ads engine and wallet are unchanged.

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
