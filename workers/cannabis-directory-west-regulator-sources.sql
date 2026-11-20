-- Four independently opened official state cannabis license source pages.
-- This catalog is for provenance/discovery only, not a license verification,
-- adult-use eligibility decision, merchant endorsement, or store import.
-- Existing stores, state policies, wallets and restricted-ad services untouched.
INSERT OR IGNORE INTO regulator_source_catalog
(state,agency,source_kind,source_url,verified_at,source_status,notes)
VALUES
('CA','California Department of Cannabis Control','daily_license_search',
 'https://www.cannabis.ca.gov/resources/search-for-licensed-business/',
 '2026-11-01','verified_official_url',
 'Official daily license search; only Active or About to Expire remain active; check retail type and local restrictions'),
('OR','Oregon Liquor and Cannabis Commission','marijuana_license_report',
 'https://www.oregon.gov/olcc/marijuana/pages/recreational-marijuana-licensee-reports.aspx',
 '2026-11-01','verified_official_url',
 'Official marijuana businesses and endorsements report; verify active retail status before importing'),
('WA','Washington State Liquor and Cannabis Board','licensee_list_and_business_lookup',
 'https://lcb.wa.gov/taxreporting/licensee-list',
 '2026-11-01','verified_official_url',
 'Official LCB lists and WA DOR endorsement lookup; distinguish cannabis retailers from other licensees and check status'),
('NV','Nevada Cannabis Compliance Board','active_licensees_and_retailer_list',
 'https://ccb.nv.gov/list-of-licensees/',
 '2026-11-01','verified_official_url',
 'Official active license list current 2026-10-02; tribal establishments are outside CCB list; verify current status');
INSERT OR IGNORE INTO regulator_source_ingest_runs
(run_id,source_kind,inspected,accepted,rejected)
VALUES ('2026-11-01-four-west-regulator-urls-v1','official_regulator_urls',4,4,0);
