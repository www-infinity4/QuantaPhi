# Infinity first-party identity center (Bubbles)

**State: isolated database and encryption primitives implemented; user enrollment/verification remains intentionally disabled.** This is not a live SSN collection or identity-proofing service. QuantaPhi, not Plaid or a commercial age-verification vendor, will own the verification decision and account record.

## Provisioned Cloudflare resources

* New **U.S.-jurisdiction** D1: `quantaphi-identity-vault` / `b03d58f0-7a58-4ead-b740-b7ecf6a3a3e2`. Read replication disabled at creation. Confirm region in account dashboard before any personal data intake.
* Tables: `identity_subjects`, `identity_evidence`, `identity_review_cases`, `identity_consents`, `identity_access_audit`. All initially empty.
* `wrangler.toml` sets `workers_dev=false`; no public route. The existing wallet, Quants, public Bubbles chat, advertising databases, restaurant/business directories, and other identity stores are **not** connected or modified.
* `security.mjs` provides AES-256-GCM encryption for identity payloads with **fresh random 96-bit IV** and per-record associated data binding the account and evidence id. Pseudonymous account keys use HMAC-SHA-256 with a separate secret. Different accounts or evidence IDs cannot decrypt each other's records.
* The reserved identity Worker currently returns 503 on eligibility (or 404 on unrelated paths). **No accepting or approving user-submitted identity data** until following controls are ready and audited.
* Existing restricted-ads Worker now allows trusted first-party `proof_kind=infinity_verified` through its private service-binding interface. User-sent proof is **never** accepted. Advertising endpoint remains inactive without its other server-side controls.

## Evidence and sensitive-data policy

1. Get informed consent and explicit privacy notices before collecting legal name, DOB, address, photos, ID numbers, or an SSN. Explain necessity, retention, correction/deletion rights, appeals, and who can access the data. Offer non-SSN routes such as valid government identity documents when possible.
2. **An SSN / last four is not evidence of identity, age, or SSN ownership.** Bubbles can assist internal examination of a government-issued ID, verifying supported cryptographic/barcode security features where available and binding the document to the applicant via a defensible, reviewed process. No automatic approval from a merely entered DOB, last four, or image text.
3. Collect via dedicated HTTPS private intake, authenticated to the existing first-party account, with CSRF protection, rate limits, request caps, consent version, and no analytics/ad scripts. Do **not** collect SSNs in general chat, customer-support tickets, GitHub, or Google Forms.
4. Encrypt identity evidence **before D1** using a random 256-bit private Worker Secret `IDENTITY_ENCRYPTION_KEY_B64`, with separate `IDENTITY_HMAC_KEY_B64`. Never commit secrets; enforce secret versioning, key rotation, separated admin roles, redaction and incident response. D1's automatic encryption at rest is a second layer.
5. Store only blinded account key, encrypted evidence, limited review statuses and privacy-preserving audit events. No plaintext SSN / birthdate / license / photo in D1. For images, use a separate private encrypted object store with signed, short-lived access only; none is set up here.
6. Activate a first-party Bubbles verification **only after** meaningful proof validation and account-person binding. Require a defensible evidence record, authenticated trained reviewer/automated validation backed by reviewed rules, expiration and revocation. Follow official NIST SP 800-63A-4 for proofing strength and privacy; do not assert conformity without validation.
7. When approved, the user account gets the boolean eligibility claim `verified_over_21` with a short expiry and `proof_kind=infinity_verified` through a **private Worker service binding**. Bubbles may retain only the status and relevant expiration, not the submitted SSN. Do not use age-verification data for advertising targeting, training, recommendations, wallet, or purchase histories.
8. Set real purge jobs for temporary evidence, withdrawal/deletion and account revocation. Maintain access audits without raw PII. Schedule security/penetration testing, threat modeling and legal privacy review **before enabling intake**.

## Test and release gates

`node --test test/identity-vault.test.mjs test/restricted-ads-worker.test.mjs`

`node --check workers/identity-vault/security.mjs`

Verify no public route, no identity rows yet, no secret leakage, hard failures on unreviewed users, no user headers granting verified status, test encryption tamper and wrong-account failures, and no reliance on external identity vendors. Deployment with actual key setup, protected intake and evidence validation is a separate audited release. This scaffold alone **does not verify anyone**.
