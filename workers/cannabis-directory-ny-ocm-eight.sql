-- Source: New York OCM Current Licenses (official OPEN-NY dataset jskf-tt3q).
-- Public dataset updated 2026-10-31 22:31 UTC; independently queried 2026-11-01.
-- Exact filter: OCMRETL adult-use retailer, Active license AND Active operational
-- status, unexpired on snapshot date, usable business address. Eight rows only.
-- OPEN-NY terms permit reuse; retain agency/dataset attribution.
-- No personal contact fields, SSN, images, product prices, ads or customer ratings.
-- This is a historical official-source snapshot, not a perpetual license guarantee.
-- Keep state job in review, not complete. Never infer identity/age verification.
UPDATE state_policy SET adult_use='legal_with_conditions',medical_program=1,
 source_url='https://cannabis.ny.gov/licensing',reviewed_at='2026-11-01',
 notes='Official OCM adult-use licensing is 21+ with local/federal restrictions; directory is informational, not sales or age verification'
 WHERE state='NY' AND adult_use='unreviewed';
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,
 address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'ny-ocm:OCM-RETL-24-000003','ESH','Rosedale Cannabis Dispensary LLC','Jamaica','NY','90-67 Sutphin Blvd., 11435','https://data.ny.gov/d/jskf-tt3q','data.ny.gov','New York Office of Cannabis Management','2026-11-01','listed',0,'ocm_active_operational_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='NY' AND adult_use='legal_with_conditions');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,
 address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'ny-ocm:OCM-RETL-24-000004','Down To Earth Canna Inc','Down To Earth Canna Inc','Jamaica','NY','24815 Union Tpke, 11426','https://data.ny.gov/d/jskf-tt3q','data.ny.gov','New York Office of Cannabis Management','2026-11-01','listed',0,'ocm_active_operational_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='NY' AND adult_use='legal_with_conditions');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,
 address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'ny-ocm:OCM-RETL-24-000005','Mango Cannabis','NY Rochester Group, LLC','Henrietta','NY','3553 West Henrietta Road, 14623','https://data.ny.gov/d/jskf-tt3q','data.ny.gov','New York Office of Cannabis Management','2026-11-01','listed',0,'ocm_active_operational_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='NY' AND adult_use='legal_with_conditions');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,
 address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'ny-ocm:OCM-RETL-24-000007','Cloud 9 Evolution LLC','Cloud 9 Evolution LLC','Schenectady','NY','1610 Eastern Pkwy, 12309','https://data.ny.gov/d/jskf-tt3q','data.ny.gov','New York Office of Cannabis Management','2026-11-01','listed',0,'ocm_active_operational_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='NY' AND adult_use='legal_with_conditions');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,
 address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'ny-ocm:OCM-RETL-24-000008','My Bud 420 Inc.','My Bud 420 Inc.','Bronx','NY','1798 E Tremont Ave, 10460','https://data.ny.gov/d/jskf-tt3q','data.ny.gov','New York Office of Cannabis Management','2026-11-01','listed',0,'ocm_active_operational_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='NY' AND adult_use='legal_with_conditions');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,
 address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'ny-ocm:OCM-RETL-24-000009','Dryden Dispensary','Geneva Naturals LLC','Dryden','NY','2207 Dryden Rd, 13053','https://data.ny.gov/d/jskf-tt3q','data.ny.gov','New York Office of Cannabis Management','2026-11-01','listed',0,'ocm_active_operational_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='NY' AND adult_use='legal_with_conditions');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,
 address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'ny-ocm:OCM-RETL-24-000010','Leaf Plug','Khaar Wellness LLC','Amherst','NY','3341 Sheridan Dr, 14226','https://data.ny.gov/d/jskf-tt3q','data.ny.gov','New York Office of Cannabis Management','2026-11-01','listed',0,'ocm_active_operational_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='NY' AND adult_use='legal_with_conditions');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,
 address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'ny-ocm:OCM-RETL-24-000011','OET INC.','OET INC.','Brooklyn','NY','733 Flatbush Ave, 11226','https://data.ny.gov/d/jskf-tt3q','data.ny.gov','New York Office of Cannabis Management','2026-11-01','listed',0,'ocm_active_operational_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='NY' AND adult_use='legal_with_conditions');
INSERT OR IGNORE INTO import_receipts
(receipt_id,state,city,source_url,inspected,accepted,rejected)
SELECT '2026-11-01-ny-ocm-eight-active-operational-v1','NY','statewide',
 'https://data.ny.gov/d/jskf-tt3q',8,8,0
WHERE (SELECT COUNT(*) FROM store_sources WHERE id IN ('ny-ocm:OCM-RETL-24-000003','ny-ocm:OCM-RETL-24-000004','ny-ocm:OCM-RETL-24-000005','ny-ocm:OCM-RETL-24-000007','ny-ocm:OCM-RETL-24-000008','ny-ocm:OCM-RETL-24-000009','ny-ocm:OCM-RETL-24-000010','ny-ocm:OCM-RETL-24-000011'))=8;
UPDATE directory_jobs SET status='review',phase='license_and_local_review',
 records_added=8,updated_at=CURRENT_TIMESTAMP
WHERE state='NY' AND status='queued'
 AND EXISTS(SELECT 1 FROM import_receipts WHERE receipt_id='2026-11-01-ny-ocm-eight-active-operational-v1');
