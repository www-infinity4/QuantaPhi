-- Organic source-only Oregon OLCC retailer snapshot, not live licensing or advertising approval.
-- Official dataset: https://data.oregon.gov/d/q32u-cmam (dataset last updated 2026-10-05; queried 2026-11-02).
-- Query: RECREATIONAL RETAILER, ACTIVE, license_expired=No, expiration after 2026-11-01,
-- non-exempt public physical address; first 8 ascending license numbers.
-- Source dates/expiry in data/cannabis/or-olcc-eight-2026-10-05.json.
-- No owner names, contact PII, product imagery, prices, ratings, paid ads, or age verification.
UPDATE state_policy SET adult_use='legal_with_conditions',source_url='https://data.oregon.gov/d/q32u-cmam',
 reviewed_at='2026-11-02',notes='Oregon OLCC recreational retailer licensing; source snapshot 2026-10-05, not live license guarantee'
 WHERE state='OR' AND adult_use='unreviewed';
-- 050-10000590807 expiration 2026-12-31
INSERT OR IGNORE INTO store_sources (id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'or-olcc:050-10000590807','DiamondTREE','DiamondTREE','Bend','OR','2715 NE HIGHWAY 20 BEND OR 97701-9595','https://data.oregon.gov/d/q32u-cmam','data.oregon.gov','Oregon Liquor and Cannabis Commission','2026-10-05','listed',0,'olcc_active_retailer_2026_10_05_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='OR' AND adult_use='legal_with_conditions');
-- 050-10000680436 expiration 2026-12-31
INSERT OR IGNORE INTO store_sources (id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'or-olcc:050-10000680436','MARITIME CAFE','MARITIME CAFE','Milwaukie','OR','17417 SE MCLOUGHLIN BLVD MILWAUKIE OR 97267-5906','https://data.oregon.gov/d/q32u-cmam','data.oregon.gov','Oregon Liquor and Cannabis Commission','2026-10-05','listed',0,'olcc_active_retailer_2026_10_05_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='OR' AND adult_use='legal_with_conditions');
-- 050-1000071214D expiration 2026-12-08
INSERT OR IGNORE INTO store_sources (id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'or-olcc:050-1000071214D','DiamondTREE','DiamondTREE','Bend','OR','1233 NW GALVESTON AVE BEND OR 97703-2433','https://data.oregon.gov/d/q32u-cmam','data.oregon.gov','Oregon Liquor and Cannabis Commission','2026-10-05','listed',0,'olcc_active_retailer_2026_10_05_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='OR' AND adult_use='legal_with_conditions');
-- 050-1000076B368 expiration 2027-01-09
INSERT OR IGNORE INTO store_sources (id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'or-olcc:050-1000076B368','DiamondTREE','DiamondTREE','Madras','OR','380 N HIGHWAY 26 MADRAS OR 97741-9599','https://data.oregon.gov/d/q32u-cmam','data.oregon.gov','Oregon Liquor and Cannabis Commission','2026-10-05','listed',0,'olcc_active_retailer_2026_10_05_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='OR' AND adult_use='legal_with_conditions');
-- 050-1000146ACE7 expiration 2026-12-11
INSERT OR IGNORE INTO store_sources (id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'or-olcc:050-1000146ACE7','Happy Leaf','Happy Leaf','Portland','OR','1301 NE BROADWAY ST PORTLAND OR 97232-1235','https://data.oregon.gov/d/q32u-cmam','data.oregon.gov','Oregon Liquor and Cannabis Commission','2026-10-05','listed',0,'olcc_active_retailer_2026_10_05_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='OR' AND adult_use='legal_with_conditions');
-- 050-10001534ACF expiration 2026-12-31
INSERT OR IGNORE INTO store_sources (id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'or-olcc:050-10001534ACF','Silver Stem Fine Cannabis','Silver Stem Fine Cannabis','Portland','OR','12240 N JANTZEN DR PORTLAND OR 97217-8137','https://data.oregon.gov/d/q32u-cmam','data.oregon.gov','Oregon Liquor and Cannabis Commission','2026-10-05','listed',0,'olcc_active_retailer_2026_10_05_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='OR' AND adult_use='legal_with_conditions');
-- 050-1000163439B expiration 2027-09-30
INSERT OR IGNORE INTO store_sources (id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'or-olcc:050-1000163439B','Gorge Greenery','Gorge Greenery','Hood River','OR','13 OAK ST HOOD RIVER OR 97031-2384','https://data.oregon.gov/d/q32u-cmam','data.oregon.gov','Oregon Liquor and Cannabis Commission','2026-10-05','listed',0,'olcc_active_retailer_2026_10_05_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='OR' AND adult_use='legal_with_conditions');
-- 050-10001759551 expiration 2026-12-29
INSERT OR IGNORE INTO store_sources (id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'or-olcc:050-10001759551','Nectar','Nectar','Portland','OR','3350 NE SANDY BLVD PORTLAND OR 97232-1927','https://data.oregon.gov/d/q32u-cmam','data.oregon.gov','Oregon Liquor and Cannabis Commission','2026-10-05','listed',0,'olcc_active_retailer_2026_10_05_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='OR' AND adult_use='legal_with_conditions');
INSERT OR IGNORE INTO import_receipts(receipt_id,state,city,source_url,inspected,accepted,rejected)
SELECT '2026-11-02-or-olcc-eight-active-retailers-v1','OR','statewide','https://data.oregon.gov/d/q32u-cmam',8,8,0
WHERE (SELECT COUNT(*) FROM store_sources WHERE id IN ('or-olcc:050-10000590807','or-olcc:050-10000680436','or-olcc:050-1000071214D','or-olcc:050-1000076B368','or-olcc:050-1000146ACE7','or-olcc:050-10001534ACF','or-olcc:050-1000163439B','or-olcc:050-10001759551'))=8;
UPDATE directory_jobs SET status='review',phase='license_and_local_review',records_added=8,updated_at=CURRENT_TIMESTAMP
WHERE state='OR' AND status='queued'
 AND EXISTS(SELECT 1 FROM import_receipts WHERE receipt_id='2026-11-02-or-olcc-eight-active-retailers-v1');
