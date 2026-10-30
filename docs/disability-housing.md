# Home Access housing intake

`/disability-housing.html` is an independent, free intake preparation tool for
people exploring housing with disability benefit income. It is reachable through
the original Oracle carousel (`/?card=disability-housing`), Quick Card search,
and Bubbles' registered app catalog.

The three steps collect location/goal, basic household information, and optional
budget details, then prepare a downloadable plain-text intake and printable/PDF
summary. USDA 502 purchase, USDA 504 repair, HUD voucher homeownership, and local
rental-assistance handoffs are separate. Program information and official URLs
were checked October 29, 2026. Current terms and funding require agency review.
There is no underwriting, eligibility determination, credit pull, document upload,
government submission, promised payment, or guaranteed housing in this feature.
No diagnosis, SSN, bank account number, or credential field is present.

Six automatically Infinity-branded community help cards flank the intake on
desktop, with full-width paged cards and visible arrows on phones. The same
catalog feeds the original homepage switchboard. Providers include bathroom
accessibility services, USDA repair/purchase loans, Sieda, SCICAP, the Chariton
Valley housing trust fund, Habitat, and the Community Action network. These are
unpaid directory listings, not paid sponsorship or provider endorsements.
Each card credits its provider, displays its actual service area, and tells
visitors to confirm current funding. Sieda's weatherization county list excludes
Monroe; SCICAP and Chariton Valley explicitly include Monroe. State and housing
goal may change resource ordering. Benefit type, income, and other financial
answers never select paid advertising or leave this guide for ad/Quant ranking.

Answers are kept in the current tab's session storage. Persistent local storage
requires the unchecked-by-default Save draft control. Unchecking removes that
saved copy; Clear answers removes both draft keys after an explicit confirmation.
Exports contain the visitor's entered information and should be treated privately.
Share, Follow, Collect, and Build use fixed card metadata; no intake is put in
share URLs, card collections, Bubbles prompts, public issues, or telemetry.

The gateway permits this exact public HTML route to frame on its own origin and
sets a restrictive CSP including `connect-src 'none'`, `form-action 'none'`, and
`frame-ancestors 'self'`. Owner/wallet/auth pages keep their existing restrictions.
The same gateway change repairs the already registered public Affiliates page's
missing same-origin frame registration, detected by the existing catalog test.
All four existing gateway service bindings must be preserved at deployment.

Run `node --test test/disability-housing.test.mjs test/disability-housing-routing.test.mjs`
and the existing search/preview/embedding regressions. The feature CI also runs
`test/disability-housing.browser.spec.mjs` on a 390px viewport using synthetic data.
Keep changes behind a reviewed PR and verify the exact source/checks before release.
Reverting the PR removes the feature; no database or server-held applicant data
needs migration or cleanup. Device draft keys are versioned and never authoritative
eligibility records.
