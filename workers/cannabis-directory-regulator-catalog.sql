-- Independent official regulator SOURCE catalog, not a dispensary license import.
-- Existing state_policy/store_sources/import_receipts tables remain unchanged.
CREATE TABLE IF NOT EXISTS regulator_source_catalog (
  state TEXT PRIMARY KEY,
  agency TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  source_url TEXT NOT NULL,
  verified_at TEXT NOT NULL,
  source_status TEXT NOT NULL DEFAULT 'verified_official_url',
  notes TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS regulator_source_ingest_runs (
  run_id TEXT PRIMARY KEY,
  source_kind TEXT NOT NULL,
  inspected INTEGER NOT NULL CHECK(inspected>=0),
  accepted INTEGER NOT NULL CHECK(accepted>=0),
  rejected INTEGER NOT NULL CHECK(rejected>=0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO regulator_source_catalog(state,agency,source_kind,source_url,verified_at,source_status,notes) VALUES
('IA','Iowa Health and Human Services','medical_only','https://hhs.iowa.gov/health-prevention/medical-cannabis/dispensary-locations','2026-11-01','verified_official_url','Five medical locations; not adult-use'),
('MO','Missouri Division of Cannabis Regulation','license_and_ato','https://health.mo.gov/business-professionals/cannabis-regulation/licensee-compliance-guidance/licensed-facilities','2026-11-01','verified_official_url','License and approved-to-operate status are distinct'),
('IL','Illinois Cannabis Regulation Oversight Office','dispensary_map','https://cannabis.illinois.gov/about/locations.html','2026-11-01','verified_official_url','Official map updated 2026-10-08'),
('NY','New York Office of Cannabis Management','license_dataset','https://data.ny.gov/d/jskf-tt3q','2026-11-01','verified_official_url','Current OCM Licenses dataset; license status requires filtering'),
('ME','Maine Office of Cannabis Policy','adult_use_license_search','https://www1.maine.gov/dafs/ocp/open-data/adult-use/licensee-search','2026-11-01','verified_official_url','Active differs from conditional; downloadable data updated 2026-10-08');
INSERT OR IGNORE INTO regulator_source_ingest_runs(run_id,source_kind,inspected,accepted,rejected)
VALUES ('2026-11-01-official-regulator-catalog-v1','official_regulator_urls',5,5,0);
