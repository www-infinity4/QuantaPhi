-- Bounded Illinois IDFPR official active adult-use license snapshot, PDF updated 2026-10-30.
-- Source: https://idfpr.illinois.gov/content/dam/soi/en/web/idfpr/forms/cannabis/all-cannabis-licenses.pdf
-- First eight DISTINCT credential rows from Active Adult Use Dispensing Organization
-- Licenses section (PDF page 2). Verified 2026-11-01; names, facility addresses,
-- and stable license IDs only. No contact persons, phones, images, prices or reviews.
-- Official *active license list* does not establish current opening hours,
-- merchant endorsement, independently confirmed address, or verified visitor age.
-- Fail closed unless IL legal policy and official regulator catalog are present.
-- Reapplying is idempotent; store-import receipt is append-only and review-phase.
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,
 address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'il-idfpr:284.000001-AUDO','Rise','GTI Mundelein, LLC','Mundelein','IL','1325 Armour Boulevard, 60060',
 'https://idfpr.illinois.gov/content/dam/soi/en/web/idfpr/forms/cannabis/all-cannabis-licenses.pdf','idfpr.illinois.gov',
 'Illinois Department of Financial and Professional Regulation','2026-11-01',
 'listed',0,'idfpr_active_adult_use_2026_10_30',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='IL' AND adult_use='legal_with_conditions')
 AND EXISTS(SELECT 1 FROM regulator_source_catalog WHERE state='IL' AND source_status='verified_official_url');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,
 address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'il-idfpr:284.000002-AUDO','Rise','3C Compassionate Care Centers, LLC','Joliet','IL','1627 Rock Creek Blvd., 60431',
 'https://idfpr.illinois.gov/content/dam/soi/en/web/idfpr/forms/cannabis/all-cannabis-licenses.pdf','idfpr.illinois.gov',
 'Illinois Department of Financial and Professional Regulation','2026-11-01',
 'listed',0,'idfpr_active_adult_use_2026_10_30',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='IL' AND adult_use='legal_with_conditions')
 AND EXISTS(SELECT 1 FROM regulator_source_catalog WHERE state='IL' AND source_status='verified_official_url');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,
 address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'il-idfpr:284.000003-AUDO','Rise','3C Compassionate Care Centers, LLC','Naperville','IL','1700 Quincy Ave. #103, 60540',
 'https://idfpr.illinois.gov/content/dam/soi/en/web/idfpr/forms/cannabis/all-cannabis-licenses.pdf','idfpr.illinois.gov',
 'Illinois Department of Financial and Professional Regulation','2026-11-01',
 'listed',0,'idfpr_active_adult_use_2026_10_30',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='IL' AND adult_use='legal_with_conditions')
 AND EXISTS(SELECT 1 FROM regulator_source_catalog WHERE state='IL' AND source_status='verified_official_url');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,
 address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'il-idfpr:284.000005-AUDO','Rise','Evergreen Dispensary, LLC','Canton','IL','3104 N. Main Street, 61520',
 'https://idfpr.illinois.gov/content/dam/soi/en/web/idfpr/forms/cannabis/all-cannabis-licenses.pdf','idfpr.illinois.gov',
 'Illinois Department of Financial and Professional Regulation','2026-11-01',
 'listed',0,'idfpr_active_adult_use_2026_10_30',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='IL' AND adult_use='legal_with_conditions')
 AND EXISTS(SELECT 1 FROM regulator_source_catalog WHERE state='IL' AND source_status='verified_official_url');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,
 address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'il-idfpr:284.000006-AUDO','Sunnyside','Phoenix Farms of Illinois, LLC','Champaign','IL','1704 S Neil St. C, 61820',
 'https://idfpr.illinois.gov/content/dam/soi/en/web/idfpr/forms/cannabis/all-cannabis-licenses.pdf','idfpr.illinois.gov',
 'Illinois Department of Financial and Professional Regulation','2026-11-01',
 'listed',0,'idfpr_active_adult_use_2026_10_30',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='IL' AND adult_use='legal_with_conditions')
 AND EXISTS(SELECT 1 FROM regulator_source_catalog WHERE state='IL' AND source_status='verified_official_url');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,
 address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'il-idfpr:284.000007-AUDO','Sunnyside','MedMar Rockford, LLC','Rockford','IL','2696 McFarland Rd, 61107',
 'https://idfpr.illinois.gov/content/dam/soi/en/web/idfpr/forms/cannabis/all-cannabis-licenses.pdf','idfpr.illinois.gov',
 'Illinois Department of Financial and Professional Regulation','2026-11-01',
 'listed',0,'idfpr_active_adult_use_2026_10_30',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='IL' AND adult_use='legal_with_conditions')
 AND EXISTS(SELECT 1 FROM regulator_source_catalog WHERE state='IL' AND source_status='verified_official_url');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,
 address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'il-idfpr:284.000008-AUDO','Sunnyside','MedMar Lakeview, LLC','Chicago','IL','3524 N. Clark St., 60657',
 'https://idfpr.illinois.gov/content/dam/soi/en/web/idfpr/forms/cannabis/all-cannabis-licenses.pdf','idfpr.illinois.gov',
 'Illinois Department of Financial and Professional Regulation','2026-11-01',
 'listed',0,'idfpr_active_adult_use_2026_10_30',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='IL' AND adult_use='legal_with_conditions')
 AND EXISTS(SELECT 1 FROM regulator_source_catalog WHERE state='IL' AND source_status='verified_official_url');
INSERT OR IGNORE INTO store_sources
(id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,
 record_status,paid_sponsor,license_status,official_source,license_verified,
 address_confirmed,rights_cleared,image_url,image_rights)
SELECT 'il-idfpr:284.000009-AUDO','Sunnyside','PDI Medical III, LLC','Buffalo Grove','IL','830 Milwaukee Ave., 60089',
 'https://idfpr.illinois.gov/content/dam/soi/en/web/idfpr/forms/cannabis/all-cannabis-licenses.pdf','idfpr.illinois.gov',
 'Illinois Department of Financial and Professional Regulation','2026-11-01',
 'listed',0,'idfpr_active_adult_use_2026_10_30',1,0,0,0,'',''
WHERE EXISTS(SELECT 1 FROM state_policy WHERE state='IL' AND adult_use='legal_with_conditions')
 AND EXISTS(SELECT 1 FROM regulator_source_catalog WHERE state='IL' AND source_status='verified_official_url');
INSERT OR IGNORE INTO import_receipts
(receipt_id,state,city,source_url,job_id,inspected,accepted,rejected)
SELECT '2026-11-01-il-idfpr-eight-active-adult-use-v1','IL','statewide',
 'https://idfpr.illinois.gov/content/dam/soi/en/web/idfpr/forms/cannabis/all-cannabis-licenses.pdf','first-review-il',8,8,0
WHERE (SELECT COUNT(*) FROM store_sources WHERE id IN ('il-idfpr:284.000001-AUDO','il-idfpr:284.000002-AUDO','il-idfpr:284.000003-AUDO','il-idfpr:284.000005-AUDO','il-idfpr:284.000006-AUDO','il-idfpr:284.000007-AUDO','il-idfpr:284.000008-AUDO','il-idfpr:284.000009-AUDO'))=8
 AND EXISTS(SELECT 1 FROM state_policy WHERE state='IL' AND adult_use='legal_with_conditions')
 AND EXISTS(SELECT 1 FROM regulator_source_catalog WHERE state='IL' AND source_status='verified_official_url')
 AND EXISTS(SELECT 1 FROM directory_jobs WHERE job_id='first-review-il' AND state='IL' AND status='queued');
-- The receipt belongs to ONE job. Never let a stale receipt advance another
-- Illinois job, or a requeued original job after a later discovery update.
UPDATE directory_jobs SET status='review',phase='license_and_site_review',
 records_added=8,updated_at=CURRENT_TIMESTAMP
WHERE job_id='first-review-il' AND state='IL' AND status='queued' AND records_added=0
 AND EXISTS(SELECT 1 FROM state_policy WHERE state='IL' AND adult_use='legal_with_conditions')
 AND EXISTS(SELECT 1 FROM regulator_source_catalog WHERE state='IL' AND source_status='verified_official_url')
 AND (SELECT COUNT(*) FROM store_sources WHERE id IN ('il-idfpr:284.000001-AUDO','il-idfpr:284.000002-AUDO','il-idfpr:284.000003-AUDO','il-idfpr:284.000005-AUDO','il-idfpr:284.000006-AUDO','il-idfpr:284.000007-AUDO','il-idfpr:284.000008-AUDO','il-idfpr:284.000009-AUDO'))=8
 AND EXISTS(SELECT 1 FROM import_receipts
   WHERE receipt_id='2026-11-01-il-idfpr-eight-active-adult-use-v1'
     AND job_id='first-review-il' AND state='IL'
     AND COALESCE(NULLIF(directory_jobs.updated_at,''),'1970-01-01 00:00:00') <= created_at);
