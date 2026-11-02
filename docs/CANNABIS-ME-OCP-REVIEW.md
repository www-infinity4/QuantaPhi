# Maine OCP adult-use store review preflight (source only)

Official source: https://www1.maine.gov/dafs/ocp/open-data/adult-use/licensee-search . The Maine Office of Cannabis Policy describes **Active** as eligible for operations; **Conditional**, **Pending Conditional**, and **Conditional, Jurisdiction Approved** do not qualify. The downloadable source was described as last updated **2026-10-08** when checked **2026-11-01**, but the linked CSV could not be retrieved by the runner (403). This repository does **not** claim to have imported any Maine businesses.

The official export may contain owners, principals, phone numbers and other personal data. Before processing, a trusted local operator must normalize only the following public business columns into a CSV: `license_number,license_status,license_type,expiration_date,business_name,street_address,city,state,zip,website`. Preserve the original official source privately and record its URL, retrieval date and checksum. Do not put raw owner/contact columns into GitHub or Cloudflare. Dates must use `YYYY-MM-DD`; `license_type` must be `Store`, `Cannabis Store`, or `Adult Use Store`; license number must be `AMS` plus digits. These are **normalized input requirements**, not assertions about the raw Maine CSV header names.

Run after independently obtaining a dated official source:

```bash
python scripts/cannabis_maine_ocp_review.py --input /secure/maine-business-only.csv --retrieved-at YYYY-MM-DD --output /secure/maine-review-candidates.json
python -m unittest discover -s test -p 'test_cannabis_*.py' -v
```

The preflight refuses missing columns, conditional/expired licenses, non-store facilities, unsafe merchant URLs, duplicates, stale snapshots and missing physical addresses. Output is a hash-linked **manual review candidate** with `import_ready=false`, no paid sponsorship, no ★ and no D1 writes. An independent reviewer must validate each current license and address against OCP before a separate idempotent SQL import with receipt, PR CI/review/merge, D1 write and public readback. This tool does not verify age, authorize cannabis advertising, or change wallet/identity/restaurant/attractions data.
