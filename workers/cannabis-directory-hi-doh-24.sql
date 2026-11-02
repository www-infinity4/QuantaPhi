-- 2026-11-02 source-inspected Hawaii DOH Medical Cannabis Registry (24 named locations).
-- MEDICAL ONLY; not adult-use or paid advertising. No license numbers asserted.
-- Island source pages: https://health.hawaii.gov/medicalcannabisregistry/oahu-dispensary-locations/ | https://health.hawaii.gov/medicalcannabisregistry/hawaii-island-dispensary-locations/ | https://health.hawaii.gov/medicalcannabisregistry/maui-dispensary-locations/ | https://health.hawaii.gov/medicalcannabisregistry/kauai-dispensary-location/
-- Permanently closed Maui locations intentionally excluded; no photos/prices/reviews.
-- Exact state source addresses verified on official public pages; current individual
-- license/operating status is not independently verified, license_verified=0.
UPDATE state_policy
SET adult_use='not_authorized',medical_program=1,
 source_url='https://health.hawaii.gov/medicalcannabisregistry/dispensaries/',
 reviewed_at='2026-11-02',
 notes='Hawaii DOH medical dispensary directory only; no adult-use. Individual current license/operating status not independently verified.'
WHERE state='HI' AND adult_use='unreviewed';
INSERT OR IGNORE INTO regulator_source_catalog
(state,agency,source_kind,source_url,verified_at,source_status,notes)
VALUES ('HI','Hawaii Department of Health Medical Cannabis Registry',
'medical_dispensary_locations','https://health.hawaii.gov/medicalcannabisregistry/dispensaries/',
'2026-11-02','verified_official_url',
'Four official island location pages reviewed 2026-11-02; closed Maui locations excluded');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,
 rights_cleared,image_url,image_rights)
SELECT 'hi-doh:aloha-green-nimitz','Aloha Green — Nimitz','Aloha Green','Honolulu','HI','3131 North Nimitz Hwy., Honolulu, HI 96819',
'https://health.hawaii.gov/medicalcannabisregistry/oahu-dispensary-locations/','health.hawaii.gov','Hawaii Department of Health Medical Cannabis Registry',
'2026-11-02','listed',0,'hi_doh_medical_directory_current_unverified',1,0,1,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='HI' AND adult_use='not_authorized' AND medical_program=1)
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,
 rights_cleared,image_url,image_rights)
SELECT 'hi-doh:aloha-green-kapolei','Aloha Green — Kapolei','Aloha Green','Kapolei','HI','92-1047 Olani St., #1-110, Kapolei, HI 96707',
'https://health.hawaii.gov/medicalcannabisregistry/oahu-dispensary-locations/','health.hawaii.gov','Hawaii Department of Health Medical Cannabis Registry',
'2026-11-02','listed',0,'hi_doh_medical_directory_current_unverified',1,0,1,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='HI' AND adult_use='not_authorized' AND medical_program=1)
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,
 rights_cleared,image_url,image_rights)
SELECT 'hi-doh:aloha-green-king-st','Aloha Green — King Street','Aloha Green','Honolulu','HI','1314 S. King St., Honolulu, HI 96814',
'https://health.hawaii.gov/medicalcannabisregistry/oahu-dispensary-locations/','health.hawaii.gov','Hawaii Department of Health Medical Cannabis Registry',
'2026-11-02','listed',0,'hi_doh_medical_directory_current_unverified',1,0,1,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='HI' AND adult_use='not_authorized' AND medical_program=1)
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,
 rights_cleared,image_url,image_rights)
SELECT 'hi-doh:aloha-green-waikiki','Aloha Green — Waikiki','Aloha Green','Honolulu','HI','2113 Kalakaua Ave., Honolulu, HI 96815',
'https://health.hawaii.gov/medicalcannabisregistry/oahu-dispensary-locations/','health.hawaii.gov','Hawaii Department of Health Medical Cannabis Registry',
'2026-11-02','listed',0,'hi_doh_medical_directory_current_unverified',1,0,1,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='HI' AND adult_use='not_authorized' AND medical_program=1)
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,
 rights_cleared,image_url,image_rights)
SELECT 'hi-doh:cure-oahu-kailua','Cure Oahu — Kailua','Cure Oahu','Kailua','HI','70 Kihapai Street, Kailua, HI 96734',
'https://health.hawaii.gov/medicalcannabisregistry/oahu-dispensary-locations/','health.hawaii.gov','Hawaii Department of Health Medical Cannabis Registry',
'2026-11-02','listed',0,'hi_doh_medical_directory_current_unverified',1,0,1,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='HI' AND adult_use='not_authorized' AND medical_program=1)
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,
 rights_cleared,image_url,image_rights)
SELECT 'hi-doh:cure-oahu-kapolei','Cure Oahu — Kapolei','Cure Oahu','Kapolei','HI','4850 Kapolei Parkway Bldg. D #501, Kapolei, HI 96707',
'https://health.hawaii.gov/medicalcannabisregistry/oahu-dispensary-locations/','health.hawaii.gov','Hawaii Department of Health Medical Cannabis Registry',
'2026-11-02','listed',0,'hi_doh_medical_directory_current_unverified',1,0,1,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='HI' AND adult_use='not_authorized' AND medical_program=1)
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,
 rights_cleared,image_url,image_rights)
SELECT 'hi-doh:cure-oahu-waikiki','Cure Oahu — Waikiki','Cure Oahu','Honolulu','HI','727 Kapahulu Ave., Honolulu, HI 96816',
'https://health.hawaii.gov/medicalcannabisregistry/oahu-dispensary-locations/','health.hawaii.gov','Hawaii Department of Health Medical Cannabis Registry',
'2026-11-02','listed',0,'hi_doh_medical_directory_current_unverified',1,0,1,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='HI' AND adult_use='not_authorized' AND medical_program=1)
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,
 rights_cleared,image_url,image_rights)
SELECT 'hi-doh:noa-botanicals-aiea','Noa Botanicals — Aiea','Noa Botanicals','Aiea','HI','98-302 Kamehameha Hwy, Aiea, HI 96701',
'https://health.hawaii.gov/medicalcannabisregistry/oahu-dispensary-locations/','health.hawaii.gov','Hawaii Department of Health Medical Cannabis Registry',
'2026-11-02','listed',0,'hi_doh_medical_directory_current_unverified',1,0,1,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='HI' AND adult_use='not_authorized' AND medical_program=1)
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,
 rights_cleared,image_url,image_rights)
SELECT 'hi-doh:noa-botanicals-young','Noa Botanicals — Young Street','Noa Botanicals','Honolulu','HI','1308 Young Street, Honolulu, HI 96814',
'https://health.hawaii.gov/medicalcannabisregistry/oahu-dispensary-locations/','health.hawaii.gov','Hawaii Department of Health Medical Cannabis Registry',
'2026-11-02','listed',0,'hi_doh_medical_directory_current_unverified',1,0,1,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='HI' AND adult_use='not_authorized' AND medical_program=1)
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,
 rights_cleared,image_url,image_rights)
SELECT 'hi-doh:noa-botanicals-kaneohe','Noa Botanicals — Kaneohe','Noa Botanicals','Kaneohe','HI','46-028 Kawa St., Kaneohe, HI 96744',
'https://health.hawaii.gov/medicalcannabisregistry/oahu-dispensary-locations/','health.hawaii.gov','Hawaii Department of Health Medical Cannabis Registry',
'2026-11-02','listed',0,'hi_doh_medical_directory_current_unverified',1,0,1,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='HI' AND adult_use='not_authorized' AND medical_program=1)
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,
 rights_cleared,image_url,image_rights)
SELECT 'hi-doh:noa-botanicals-waikiki','Noa Botanicals — Waikiki','Noa Botanicals','Honolulu','HI','345 Royal Hawaiian Avenue, Honolulu, HI 96815',
'https://health.hawaii.gov/medicalcannabisregistry/oahu-dispensary-locations/','health.hawaii.gov','Hawaii Department of Health Medical Cannabis Registry',
'2026-11-02','listed',0,'hi_doh_medical_directory_current_unverified',1,0,1,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='HI' AND adult_use='not_authorized' AND medical_program=1)
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,
 rights_cleared,image_url,image_rights)
SELECT 'hi-doh:hawaiian-ethos-hilo','Hawaiian Ethos — Hilo','Hawaiian Ethos','Hilo','HI','578 Kanoelehua Ave., Hilo, HI 96720',
'https://health.hawaii.gov/medicalcannabisregistry/hawaii-island-dispensary-locations/','health.hawaii.gov','Hawaii Department of Health Medical Cannabis Registry',
'2026-11-02','listed',0,'hi_doh_medical_directory_current_unverified',1,0,1,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='HI' AND adult_use='not_authorized' AND medical_program=1)
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,
 rights_cleared,image_url,image_rights)
SELECT 'hi-doh:hawaiian-ethos-kona','Hawaiian Ethos — Kona','Hawaiian Ethos','Kailua-Kona','HI','73-5613 Olowalu St., Suite 7, Kailua-Kona, HI 96740',
'https://health.hawaii.gov/medicalcannabisregistry/hawaii-island-dispensary-locations/','health.hawaii.gov','Hawaii Department of Health Medical Cannabis Registry',
'2026-11-02','listed',0,'hi_doh_medical_directory_current_unverified',1,0,1,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='HI' AND adult_use='not_authorized' AND medical_program=1)
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,
 rights_cleared,image_url,image_rights)
SELECT 'hi-doh:hawaiian-ethos-waimea','Hawaiian Ethos — Waimea','Hawaiian Ethos','Kamuela','HI','64-1035 Mamalahoa Hwy., Unit J, Kamuela, HI 96743',
'https://health.hawaii.gov/medicalcannabisregistry/hawaii-island-dispensary-locations/','health.hawaii.gov','Hawaii Department of Health Medical Cannabis Registry',
'2026-11-02','listed',0,'hi_doh_medical_directory_current_unverified',1,0,1,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='HI' AND adult_use='not_authorized' AND medical_program=1)
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,
 rights_cleared,image_url,image_rights)
SELECT 'hi-doh:big-island-grown-hilo','Big Island Grown — Hilo','Big Island Grown','Hilo','HI','750 Kanoelehua Ave., Suite 104, Hilo, HI 96720',
'https://health.hawaii.gov/medicalcannabisregistry/hawaii-island-dispensary-locations/','health.hawaii.gov','Hawaii Department of Health Medical Cannabis Registry',
'2026-11-02','listed',0,'hi_doh_medical_directory_current_unverified',1,0,1,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='HI' AND adult_use='not_authorized' AND medical_program=1)
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,
 rights_cleared,image_url,image_rights)
SELECT 'hi-doh:big-island-grown-kona','Big Island Grown — Kona','Big Island Grown','Kailua-Kona','HI','74-5617 Pawai Place, Kailua-Kona, HI 96740',
'https://health.hawaii.gov/medicalcannabisregistry/hawaii-island-dispensary-locations/','health.hawaii.gov','Hawaii Department of Health Medical Cannabis Registry',
'2026-11-02','listed',0,'hi_doh_medical_directory_current_unverified',1,0,1,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='HI' AND adult_use='not_authorized' AND medical_program=1)
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,
 rights_cleared,image_url,image_rights)
SELECT 'hi-doh:big-island-grown-waimea','Big Island Grown — Waimea','Big Island Grown','Waimea','HI','64-1040 Mamalahoa Hwy., Waimea, HI 96743',
'https://health.hawaii.gov/medicalcannabisregistry/hawaii-island-dispensary-locations/','health.hawaii.gov','Hawaii Department of Health Medical Cannabis Registry',
'2026-11-02','listed',0,'hi_doh_medical_directory_current_unverified',1,0,1,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='HI' AND adult_use='not_authorized' AND medical_program=1)
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,
 rights_cleared,image_url,image_rights)
SELECT 'hi-doh:maui-grown-kahului','Maui Grown Therapies — Kahului','Maui Grown Therapies','Kahului','HI','44 Paa St., Kahului, HI 96732',
'https://health.hawaii.gov/medicalcannabisregistry/maui-dispensary-locations/','health.hawaii.gov','Hawaii Department of Health Medical Cannabis Registry',
'2026-11-02','listed',0,'hi_doh_medical_directory_current_unverified',1,0,1,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='HI' AND adult_use='not_authorized' AND medical_program=1)
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,
 rights_cleared,image_url,image_rights)
SELECT 'hi-doh:maui-grown-kihei','Maui Grown Therapies — Kihei','Maui Grown Therapies','Kihei','HI','1215 S. Kihei Rd, Unit D2, Kihei, HI 96753',
'https://health.hawaii.gov/medicalcannabisregistry/maui-dispensary-locations/','health.hawaii.gov','Hawaii Department of Health Medical Cannabis Registry',
'2026-11-02','listed',0,'hi_doh_medical_directory_current_unverified',1,0,1,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='HI' AND adult_use='not_authorized' AND medical_program=1)
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,
 rights_cleared,image_url,image_rights)
SELECT 'hi-doh:maui-grown-pukalani','Maui Grown Therapies — Pukalani','Maui Grown Therapies','Makawao','HI','7 Aewa Place, Unit 3, Makawao, HI 96768',
'https://health.hawaii.gov/medicalcannabisregistry/maui-dispensary-locations/','health.hawaii.gov','Hawaii Department of Health Medical Cannabis Registry',
'2026-11-02','listed',0,'hi_doh_medical_directory_current_unverified',1,0,1,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='HI' AND adult_use='not_authorized' AND medical_program=1)
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,
 rights_cleared,image_url,image_rights)
SELECT 'hi-doh:pono-life-kihei','Pono Life Sciences Maui — Kihei','Pono Life Sciences Maui','Kihei','HI','95 E. Lipoa St., Kihei, HI 96753',
'https://health.hawaii.gov/medicalcannabisregistry/maui-dispensary-locations/','health.hawaii.gov','Hawaii Department of Health Medical Cannabis Registry',
'2026-11-02','listed',0,'hi_doh_medical_directory_current_unverified',1,0,1,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='HI' AND adult_use='not_authorized' AND medical_program=1)
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,
 rights_cleared,image_url,image_rights)
SELECT 'hi-doh:pono-life-lahaina','Pono Life Sciences Maui — Lahaina','Pono Life Sciences Maui','Lahaina','HI','60 Ulupono Street #8, Lahaina, HI 96761',
'https://health.hawaii.gov/medicalcannabisregistry/maui-dispensary-locations/','health.hawaii.gov','Hawaii Department of Health Medical Cannabis Registry',
'2026-11-02','listed',0,'hi_doh_medical_directory_current_unverified',1,0,1,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='HI' AND adult_use='not_authorized' AND medical_program=1)
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,
 rights_cleared,image_url,image_rights)
SELECT 'hi-doh:green-aloha-kapaa','Green Aloha — Kapaa','Green Aloha','Kapaa','HI','4-1565 Kuhio Hwy #3, Kapaa, HI 96746',
'https://health.hawaii.gov/medicalcannabisregistry/kauai-dispensary-location/','health.hawaii.gov','Hawaii Department of Health Medical Cannabis Registry',
'2026-11-02','listed',0,'hi_doh_medical_directory_current_unverified',1,0,1,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='HI' AND adult_use='not_authorized' AND medical_program=1)
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,address_confirmed,
 rights_cleared,image_url,image_rights)
SELECT 'hi-doh:green-aloha-koloa','Green Aloha — Koloa','Green Aloha','Koloa','HI','2827 Poipu Rd., Koloa, HI 96756',
'https://health.hawaii.gov/medicalcannabisregistry/kauai-dispensary-location/','health.hawaii.gov','Hawaii Department of Health Medical Cannabis Registry',
'2026-11-02','listed',0,'hi_doh_medical_directory_current_unverified',1,0,1,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='HI' AND adult_use='not_authorized' AND medical_program=1)
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO import_receipts
(receipt_id,state,city,source_url,job_id,inspected,accepted,rejected)
SELECT '2026-11-02-hi-doh-24-medical-locations-v1','HI','statewide',
'https://health.hawaii.gov/medicalcannabisregistry/dispensaries/',
'first-review-hi',24,24,0
WHERE (SELECT COUNT(*) FROM store_sources WHERE state='HI' AND id LIKE 'hi-doh:%'
 AND official_source=1 AND paid_sponsor=0 AND license_verified=0)=24
AND EXISTS(SELECT 1 FROM directory_jobs WHERE state='HI' AND status='queued');
INSERT OR IGNORE INTO store_inventory_connections
(store_id,provider,connection_state,license_review_state)
SELECT id,'merchant','not_connected','unreviewed' FROM store_sources
WHERE state='HI' AND id LIKE 'hi-doh:%'
AND EXISTS(SELECT 1 FROM import_receipts WHERE receipt_id='2026-11-02-hi-doh-24-medical-locations-v1');
UPDATE directory_jobs
SET status='review',phase='medical_license_review',records_added=24,updated_at=CURRENT_TIMESTAMP
WHERE state='HI' AND status='queued'
AND EXISTS(SELECT 1 FROM import_receipts WHERE receipt_id='2026-11-02-hi-doh-24-medical-locations-v1');
