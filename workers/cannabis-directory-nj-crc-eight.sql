-- New Jersey CRC official public Class 5 annual retailer permit snapshot, queried 2026-11-02.
-- Source index: https://www.nj.gov/cannabis/businesses/permitted/
-- Each store source URL is its exact state-issued permit PDF, with license number,
-- physical facility address, and future expiration. Permit is not proof of current operation.
-- No copied PDF imagery, owner names, reviews, prices, ads, age verification or wallet changes.
UPDATE state_policy SET adult_use='legal_with_conditions',source_url='https://www.nj.gov/cannabis/businesses/permitted/',
 reviewed_at='2026-11-02',notes='NJ CRC Class 5 retailer permits, individually sourced; current operations and suspensions not guaranteed'
 WHERE state='NJ' AND adult_use='unreviewed';
-- RE000035 Class 5 retailer permit expires 2027-10-26
INSERT OR IGNORE INTO store_sources (id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'nj-crc:RE000035','1634 Funk','1634 FUNK LLC','Jersey City','NJ','394 COMMUNIPAW AVE, JERSEY CITY, NJ 07304','https://www.nj.gov/cannabis/documents/businesses/Permits%20and%20Renewals/Funk%20Recreational%20License.pdf','www.nj.gov','New Jersey Cannabis Regulatory Commission','2026-11-02','listed',0,'nj_crc_class5_2027_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='NJ' AND adult_use='legal_with_conditions');
-- RE000252 Class 5 retailer permit expires 2027-08-14
INSERT OR IGNORE INTO store_sources (id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'nj-crc:RE000252','4Twenty Somewhere','4TWENTY SOMEWHERE','Hewitt','NJ','1938 UNION VALLEY RD STE D, HEWITT, NJ 07421','https://www.nj.gov/cannabis/documents/businesses/Permits%20and%20Renewals/4Twenty%20Somewhere%20Recreational%20License.pdf','www.nj.gov','New Jersey Cannabis Regulatory Commission','2026-11-02','listed',0,'nj_crc_class5_2027_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='NJ' AND adult_use='legal_with_conditions');
-- RE000943 Class 5 retailer permit expires 2027-03-06
INSERT OR IGNORE INTO store_sources (id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'nj-crc:RE000943','A-Z Supply','A-Z SUPPLY INC','Bloomfield','NJ','1283 BROAD ST, BLOOMFIELD, NJ 07003','https://www.nj.gov/cannabis/documents/businesses/Permits%20and%20Renewals/A-Z%20Supply%20Recreational%20License.pdf','www.nj.gov','New Jersey Cannabis Regulatory Commission','2026-11-02','listed',0,'nj_crc_class5_2027_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='NJ' AND adult_use='legal_with_conditions');
-- RE000527 Class 5 retailer permit expires 2027-12-09
INSERT OR IGNORE INTO store_sources (id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'nj-crc:RE000527','AC Leef','AC LEEF LLC','Atlantic City','NJ','470 N ALBANY AVE, ATLANTIC CITY, NJ 08401','https://www.nj.gov/cannabis/documents/businesses/Permits%20and%20Renewals/AC%20Leef%20Recreational%20License.pdf','www.nj.gov','New Jersey Cannabis Regulatory Commission','2026-11-02','listed',0,'nj_crc_class5_2027_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='NJ' AND adult_use='legal_with_conditions');
-- RE000395 Class 5 retailer permit expires 2027-05-14
INSERT OR IGNORE INTO store_sources (id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'nj-crc:RE000395','Altalune','ALTALUNE, INC.','Jersey City','NJ','433 PALISADE AVE, JERSEY CITY, NJ 07307','https://www.nj.gov/cannabis/documents/businesses/Permits%20and%20Renewals/Altalune%20Recreational%20License.pdf','www.nj.gov','New Jersey Cannabis Regulatory Commission','2026-11-02','listed',0,'nj_crc_class5_2027_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='NJ' AND adult_use='legal_with_conditions');
-- RE000216 Class 5 retailer permit expires 2027-10-01
INSERT OR IGNORE INTO store_sources (id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'nj-crc:RE000216','Altius NJ','ALTIUS NJ LLC','Glassboro','NJ','60 DELSEA DR N, GLASSBORO, NJ 08028','https://www.nj.gov/cannabis/documents/businesses/Permits%20and%20Renewals/Altius%20NJ%20Recreational%20License.pdf','www.nj.gov','New Jersey Cannabis Regulatory Commission','2026-11-02','listed',0,'nj_crc_class5_2027_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='NJ' AND adult_use='legal_with_conditions');
-- RE000587 Class 5 retailer permit expires 2027-05-05
INSERT OR IGNORE INTO store_sources (id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'nj-crc:RE000587','Andover Cannabis','ANDOVER CANNABIS, LLC','Andover','NJ','144 MAIN ST #146, ANDOVER, NJ 07821','https://www.nj.gov/cannabis/documents/businesses/Permits%20and%20Renewals/Andover%20Cannabis%20Recreational%20License.pdf','www.nj.gov','New Jersey Cannabis Regulatory Commission','2026-11-02','listed',0,'nj_crc_class5_2027_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='NJ' AND adult_use='legal_with_conditions');
-- RE000012 Class 5 retailer permit expires 2027-04-20
INSERT OR IGNORE INTO store_sources (id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'nj-crc:RE000012','Ascend New Jersey - Rochelle Park','ASCEND NEW JERSEY, LLC','Rochelle Park','NJ','174 ROUTE 17 N, ROCHELLE PARK, NJ 07662','https://www.nj.gov/cannabis/documents/businesses/Permits%20and%20Renewals/Ascend%20Rec%20Packet.pdf','www.nj.gov','New Jersey Cannabis Regulatory Commission','2026-11-02','listed',0,'nj_crc_class5_2027_snapshot',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='NJ' AND adult_use='legal_with_conditions');
INSERT OR IGNORE INTO import_receipts(receipt_id,state,city,source_url,inspected,accepted,rejected)
SELECT '2026-11-02-nj-crc-eight-class5-permits-v1','NJ','statewide','https://www.nj.gov/cannabis/businesses/permitted/',8,8,0
WHERE (SELECT COUNT(*) FROM store_sources WHERE id IN ('nj-crc:RE000035','nj-crc:RE000252','nj-crc:RE000943','nj-crc:RE000527','nj-crc:RE000395','nj-crc:RE000216','nj-crc:RE000587','nj-crc:RE000012'))=8;
UPDATE directory_jobs SET status='review',phase='license_and_local_review',records_added=8,updated_at=CURRENT_TIMESTAMP
WHERE state='NJ' AND status='queued'
 AND EXISTS(SELECT 1 FROM import_receipts WHERE receipt_id='2026-11-02-nj-crc-eight-class5-permits-v1');
