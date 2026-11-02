-- Massachusetts CCC public Commence Ops snapshot, dataset last updated 2026-10-26.
-- Four active adult-use retailer licenses with COMMENCE_OPS=Yes and unexpired 2027 dates.
-- CCC data is licensee self-reported; no ongoing operating/license guarantee.
-- Excludes EIN, contacts, emails, phones, owner details, prices, ads and images.
-- Official source: https://masscannabiscontrol.com/resource/l_licenses_commence_ops.json
UPDATE state_policy SET adult_use='legal_with_conditions',source_url='https://masscannabiscontrol.com/open-data/data-catalog/',reviewed_at='2026-11-01',notes='MA CCC self-reported active Commence Ops retailer snapshot; current status requires recheck'
 WHERE state='MA' AND adult_use='unreviewed';
-- MR281268: active final retailer, commenced operations, expires 2027-04-10
INSERT OR IGNORE INTO store_sources (id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'ma-ccc:MR281268','Cultivate Leicester','Cultivate Leicester, Inc.','Leicester','MA','1764 MAIN STREET, LEICESTER, MA 01524','https://masscannabiscontrol.com/resource/l_licenses_commence_ops.json','masscannabiscontrol.com','Massachusetts Cannabis Control Commission','2026-11-01','listed',0,'ma_ccc_active_commence_ops_2026_10_26_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='MA' AND adult_use='legal_with_conditions');
-- MR281346: active final retailer, commenced operations, expires 2027-06-24
INSERT OR IGNORE INTO store_sources (id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'ma-ccc:MR281346','Alternative Therapies Group II','Alternative Therapies Group II, Inc.','Amesbury','MA','49 MACY STREET, AMESBURY, MA 01913','https://masscannabiscontrol.com/resource/l_licenses_commence_ops.json','masscannabiscontrol.com','Massachusetts Cannabis Control Commission','2026-11-01','listed',0,'ma_ccc_active_commence_ops_2026_10_26_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='MA' AND adult_use='legal_with_conditions');
-- MR281240: active final retailer, commenced operations, expires 2027-10-10
INSERT OR IGNORE INTO store_sources (id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'ma-ccc:MR281240','CDXX MA TRANSCO - Northampton','CDXX MA TRANSCO, LLC','Northampton','MA','118 CONZ STREET, NORTHAMPTON, MA 01060','https://masscannabiscontrol.com/resource/l_licenses_commence_ops.json','masscannabiscontrol.com','Massachusetts Cannabis Control Commission','2026-11-01','listed',0,'ma_ccc_active_commence_ops_2026_10_26_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='MA' AND adult_use='legal_with_conditions');
-- MR281287: active final retailer, commenced operations, expires 2027-10-10
INSERT OR IGNORE INTO store_sources (id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'ma-ccc:MR281287','CDXX MA TRANSCO - Brookline','CDXX MA TRANSCO, LLC','Brookline','MA','160 WASHINGTON STREET, BROOKLINE, MA 02445','https://masscannabiscontrol.com/resource/l_licenses_commence_ops.json','masscannabiscontrol.com','Massachusetts Cannabis Control Commission','2026-11-01','listed',0,'ma_ccc_active_commence_ops_2026_10_26_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='MA' AND adult_use='legal_with_conditions');
INSERT OR IGNORE INTO import_receipts(receipt_id,state,city,source_url,inspected,accepted,rejected)
SELECT '2026-11-01-ma-ccc-four-active-retailers-v1','MA','statewide','https://masscannabiscontrol.com/resource/l_licenses_commence_ops.json',4,4,0
WHERE (SELECT COUNT(*) FROM store_sources WHERE id IN ('ma-ccc:MR281268','ma-ccc:MR281346','ma-ccc:MR281240','ma-ccc:MR281287'))=4;
UPDATE directory_jobs SET status='review',phase='license_and_local_review',records_added=4,updated_at=CURRENT_TIMESTAMP
WHERE state='MA' AND status='queued'
 AND EXISTS(SELECT 1 FROM import_receipts WHERE receipt_id='2026-11-01-ma-ccc-four-active-retailers-v1');
