-- Four independently checked official regulator source pages (2026-11-01).
-- Catalog-only: not a store import, license verification, advertising approval,
-- age check, or change to any state_policy, wallet or identity data.
-- Reapplication is idempotent; keep append-only receipt for the source review.
INSERT OR IGNORE INTO regulator_source_catalog
(state,agency,source_kind,source_url,verified_at,source_status,notes)
VALUES
('CT','Connecticut Department of Consumer Protection','licensed_retailer_and_medical_map',
 'https://portal.ct.gov/cannabis/knowledge-base/articles/verify-a-license?language=en_US',
 '2026-11-01','verified_official_url',
 'Official retailer map and establishment lookup; adult-use retailer, hybrid retailer and medical-only dispensary are different categories; verify current license and location before importing'),
('MA','Massachusetts Cannabis Control Commission','open_license_data_catalog',
 'https://masscannabiscontrol.com/open-data/data-catalog/',
 '2026-11-01','verified_official_url',
 'Official self-reported open data includes adult-use commence-operations and medical license files; verify retailer type, operational status, current address and source freshness before importing'),
('MI','Michigan Cannabis Regulatory Agency','adult_use_and_medical_license_verification',
 'https://www.michigan.gov/cra/verify-a-license-1',
 '2026-11-01','verified_official_url',
 'Official downloadable license searches; distinguish adult-use retailer from medical provisioning center, and verify active license and site before importing'),
('NJ','New Jersey Cannabis Regulatory Commission','official_dispensary_finder',
 'https://www.nj.gov/cannabis/dispensaries/find/',
 '2026-11-01','verified_official_url',
 'Official licensed dispensary finder distinguishes recreational and medicinal service; verify location and current license status, no merchant endorsement');
INSERT OR IGNORE INTO regulator_source_ingest_runs
(run_id,source_kind,inspected,accepted,rejected)
VALUES ('2026-11-01-four-ct-ma-mi-nj-regulator-urls-v1','official_regulator_urls',4,4,0);
