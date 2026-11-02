-- Idempotent metadata-only correction for the eight NJ CRC Class 5 permit listings.
-- "2027" in the original label refers to the documented permit expiration dates,
-- NOT a regulator snapshot from the future. Current operation/suspension unverified.
-- Preserve IDs, original import receipt, policy, addresses and source URLs.
-- Do not assert active license, authorize advertising, or touch wallet/identity.
UPDATE store_sources
SET license_status='nj_crc_class5_permit_current_status_unverified'
WHERE state='NJ'
  AND official_source=1
  AND license_verified=0
  AND source_domain='www.nj.gov'
  AND license_status='nj_crc_class5_2027_snapshot'
  AND id IN (
    'nj-crc:RE000035', 'nj-crc:RE000252', 'nj-crc:RE000943',
    'nj-crc:RE000527', 'nj-crc:RE000395', 'nj-crc:RE000216',
    'nj-crc:RE000587', 'nj-crc:RE000012'
  );
