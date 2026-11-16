-- Colorado official regulator SOURCE catalog only, not a store-license import.
-- MED says its retail and medical facility lists are updated monthly.
-- Do not infer any individual business is currently licensed from this catalog entry.
-- Safe to reapply: source row and receipt are unique; no stores or wallets touched.
INSERT OR IGNORE INTO regulator_source_catalog
(state,agency,source_kind,source_url,verified_at,source_status,notes)
VALUES (
  'CO',
  'Colorado Department of Revenue - Marijuana Enforcement Division',
  'retail_and_medical_facilities',
  'https://med.colorado.gov/licensee-information-and-lookup-tool/licensed-facilities',
  '2026-11-01',
  'verified_official_url',
  'Official retail and medical facility lists updated monthly; validate individual license type and status separately before store import'
);
INSERT OR IGNORE INTO regulator_source_ingest_runs
(run_id,source_kind,inspected,accepted,rejected)
VALUES ('2026-11-01-co-med-official-source-v1','official_regulator_urls',1,1,0);
