# Missouri DCR: source-only review preflight (#1394)

**Not a store import, licensed advertisement, merchant endorsement, age verification, or public directory activation.** This helper reads a locally obtained CSV from the official [Missouri DCR Licensed Facilities page](https://health.mo.gov/business-professionals/cannabis-regulation/licensee-compliance-guidance/licensed-facilities). The official dashboard includes active licenses **even if not approved to operate (ATO)**; DCR says the dashboard is updated monthly for the previous month. Do not equate an active license with permission to open. Do not use non-DCR third-party directories as licensing evidence.

First obtain a dated, current official DCR dashboard export and independently verify its source. Normalize the exported **business-only** columns to this exact header (do not guess which raw dashboard columns mean active license or ATO):

license_number,license_status,ato_status,facility_type,trade_name,legal_name,street_address,city,state,zip,website

Only explicit Active license status, Approved to Operate ATO status, Dispensary facility type, MO state, a valid public address and a DIS or MBD license number can enter the review set. Unknown, missing, suspended, not-approved, conditional, duplicate, non-dispensary and unsafe URL rows are rejected or fail closed. Keep names/addresses from business records only. Do not collect or export customer names, contact-person names, employee identifiers, private email addresses, phone numbers, ID scans or patient data. Do not copy merchant images or invent ratings.

Example local invocation (after source verification):

python scripts/cannabis_missouri_dcr_review.py --input /secure/path/mo-dcr-normalized.csv --retrieved-at YYYY-MM-DD --output /secure/path/mo-review-candidates.json

The output is **only** a hash-linked manual-review candidate manifest with import_ready: false, record_status: review, no D1 credentials, no SQL writes and no paid sponsors. An independent reviewer must check each accepted license number, current ATO status and facility address against the official source before creating a separate idempotent D1 migration and append-only import receipt. Run python -m unittest discover -s test -p 'test_cannabis_*.py' -v. The included test businesses are fictional fixtures, never directory records.

If the official dashboard cannot provide a verifiable export with both license and ATO fields, stop. Keep Missouri queued, not populated. This tool must never be used to infer 21+ identity or authorize cannabis advertising; the first-party identity vault remains separate and closed to public intake.
