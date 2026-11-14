-- 2026-11-01 Iowa HHS official medical cannabis dispensary source list.
-- These are MEDICAL ONLY, NOT adult-use or paid ads; no product images or prices.
-- Addresses from https://hhs.iowa.gov/health-prevention/medical-cannabis/dispensary-locations
-- Five distinct state-listed locations; license verification remains separate.
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,rights_cleared,image_url,image_rights)
VALUES
('ia-hhs-bud-marys-windsor','Bud & Mary''s','Windsor Heights','Windsor Heights','IA','7239 Apple Valley Drive, Windsor Heights, IA 50324','https://hhs.iowa.gov/locations/bud-marys-0','hhs.iowa.gov','Iowa HHS medical cannabis dispensary locations','2026-11-01','listed',0,'medical_program_listed',1,0,1,0,'',''),
('ia-hhs-bud-marys-sioux','Bud & Mary''s','Sioux City','Sioux City','IA','5700 Sunnybrook Drive, Sioux City, IA 51106','https://hhs.iowa.gov/locations/bud-marys','hhs.iowa.gov','Iowa HHS medical cannabis dispensary locations','2026-11-01','listed',0,'medical_program_listed',1,0,1,0,'',''),
('ia-hhs-iowa-cannabis-waterloo','Iowa Cannabis Company','Waterloo','Waterloo','IA','1955 La Porte Road, Waterloo, IA 50702','https://hhs.iowa.gov/locations/iowa-cannabis-company','hhs.iowa.gov','Iowa HHS medical cannabis dispensary locations','2026-11-01','listed',0,'medical_program_listed',1,0,1,0,'',''),
('ia-hhs-iowa-cannabis-east','Iowa Cannabis Company East','Iowa City','Iowa City','IA','322 Highway 1 W, Iowa City, IA 52245','https://hhs.iowa.gov/locations/iowa-cannabis-company-east','hhs.iowa.gov','Iowa HHS medical cannabis dispensary locations','2026-11-01','listed',0,'medical_program_listed',1,0,1,0,'',''),
('ia-hhs-iowa-cannabis-west','Iowa Cannabis Company West','Council Bluffs','Council Bluffs','IA','3615 9th Ave, Council Bluffs, IA 51501','https://hhs.iowa.gov/locations/iowa-cannabis-company-west','hhs.iowa.gov','Iowa HHS medical cannabis dispensary locations','2026-11-01','listed',0,'medical_program_listed',1,0,1,0,'','');

-- Append only after five IA IDs were independently read back; repeat-safe.
INSERT OR IGNORE INTO import_receipts
(receipt_id,state,city,source_url,job_id,inspected,accepted,rejected)
VALUES ('2026-11-01-ia-hhs-five-medical-v1','IA','statewide',
'https://hhs.iowa.gov/health-prevention/medical-cannabis/dispensary-locations',
'first-review-ia',5,5,0);
UPDATE directory_jobs SET status='review',phase='medical_only_regulator_review',
records_added=5,updated_at=CURRENT_TIMESTAMP
WHERE job_id='first-review-ia' AND state='IA' AND records_added<=5;
