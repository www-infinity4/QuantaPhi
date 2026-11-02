-- Correct one exact official CT DCP source name, preserving license ID, receipt, and all other fields.
-- Official https://data.ct.gov/resource/42yd-3x3d.json?\$limit=100 reports AMHF.0008270 DBA CURALEAF GROTON LLC.
UPDATE store_sources SET name='CURALEAF GROTON LLC',store='CURALEAF GROTON LLC',updated_at=CURRENT_TIMESTAMP
WHERE id='ct-dcp:AMHF.0008270' AND state='CT'
  AND name='CURALEAF GROTON INC' AND store='CURALEAF GROTON INC'
  AND source_domain='data.ct.gov' AND license_verified=0;
