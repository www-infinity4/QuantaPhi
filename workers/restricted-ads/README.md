# Age-verified restricted advertising backend · 2026-11-01

## Current boundary
- Created isolated Cloudflare D1 `quantaphi-restricted-ads`, with 3 tables.
- No licensed campaigns, no allowed jurisdictions, no consent records. All are disabled by default.
- The Worker requires a private service binding named `ELIGIBILITY` returning independently verified 21+ eligibility for an authenticated session; there is **no bound age-verification provider yet**. If missing, calls fail closed with no ad media.
- `CONSENT_SALT` is a Worker secret (minimum 16 characters) used to hash the subject. Do not store full ID images, birth dates, sensitive wallet records, or third-party passwords here.
- No Cloudflare production route is configured in wrangler.toml. Do not add it until the age vendor is connected and confirmed by runtime tests.

## Trust contract
The private `ELIGIBILITY` service accepts a QuantaPhi-authenticated HttpOnly session cookie and must independently verify it and the third-party age proof. Return `authenticated:true`, opaque `subject`, `verified_over_21:true`, `proof_kind:'third_party_verified'`, `expires_at` within seven days, and verified `jurisdiction:'US-XX'`. No browser-provided birth date, checked box, client script or Quant interest can create this claim. Source claims should expire and be revocable server-side.

The public endpoints are identical to the main homepage contract:
- `POST /v1/restricted-ads/consent` (same-origin, authenticated, JSON): opt-in requires verified age; opt-out works for any authenticated subject. A readback confirms the D1 record.
- `GET /v1/restricted-ads/creatives?category=cannabis`: require verified age every call, a persisted explicit opt-in, a reviewed and **enabled** jurisdiction with documented audience/legal evidence, licensed/rights-cleared advertiser creative, fresh review and source-domain HTTPS assets. Unknown states and missing or stale reviews are denied.
- Both endpoints use `Cache-Control: no-store` and disclose no user identity, wallet balance or browsing history. Other methods and categories are denied.

## Legal and editorial review
Advertising a legal adult cannabis business is not the same as using general ad networks. Google's dangerous-products policy generally prohibits marijuana ads. Check every advertiser license, seller municipality, platform rules, image usage rights, exact ad format and jurisdiction. California's current regulations include an audience-composition rule and age affirmation for individualized advertising. Do not enable a jurisdiction unless a reviewer attaches reliable evidence to `audience_evidence` and `legal_evidence` and records their name/date. Review at least every 30 days. No campaigns are pre-approved by this implementation.

## Integration steps, not yet completed
1. Select an identity/age-verification vendor with a documented privacy agreement and confirmed interface; route verified claims through a private Cloudflare Worker service binding named `ELIGIBILITY`.
2. Provision `CONSENT_SALT` as a secret; add the exact `ELIGIBILITY` binding.
3. Apply the migration idempotently (the isolated D1 tables already exist in Cloudflare).
4. Validate real authenticated end-to-end consent, revocation, age expiry, jurisdiction changes and ad approvals. Perform a legal and advertising policy review.
5. Only then attach `quantaphi.org/v1/restricted-ads/*` as the restricted Worker route. Avoid changing wallet, homepage site Worker or the public Quick Ads service.

## Directory
All 50 U.S. states are in the business city import queue; DC, PR, VI, GU, AS and MP are separate jurisdictions. A queued job does not mean businesses were imported. Business listings and cannabis advertiser **approvals** must remain separate: public directory presence grants no advertising privileges.

CI: `node --test test/restricted-ad-policy.test.mjs test/restricted-ads-worker.test.mjs`
