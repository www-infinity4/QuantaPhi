-- Source-backed ASTEROID RADIO X Space seed for the EXISTING shared Media Star D1.
-- Apply only after reviewed release authorization; this file does not deploy itself.
-- The host profile/archive can include speaker appearances; only an independently
-- attributed ASTEROID-hosted original direct Space ID enters space_episodes.
INSERT INTO space_hosts(x_user_id,handle,display_name,profile_url,featured,updated_at)
 SELECT 'handle:A5T3R0lD','A5T3R0lD','ASTEROID RADIO','https://x.com/A5T3R0lD',0,CAST(strftime('%s','now') AS INTEGER)*1000
 WHERE NOT EXISTS(SELECT 1 FROM space_hosts WHERE lower(handle)='a5t3r0ld');

INSERT OR IGNORE INTO space_episodes(space_id,host_user_id,title,space_url,started_at,duration_seconds,summary,source_type,availability,imported_at)
 SELECT '1pKdRbWZgVRJW',h.x_user_id,'ASTEROID RADIO: $DOG TONIGHT - BUY ON KRAKEN',
 'https://x.com/i/spaces/1pKdRbWZgVRJW','2026-03-25',11915,
 'Title, date and duration indexed by public XspaceGPT archive. Actual audio unverified.',
 'curated_archive','indexed',CAST(strftime('%s','now') AS INTEGER)*1000
 FROM space_hosts h WHERE lower(h.handle)='a5t3r0ld' LIMIT 1;

INSERT OR IGNORE INTO space_host_sources(host_user_id,source_url,source_kind,review_status,notes)
 SELECT h.x_user_id,'https://x.com/A5T3R0lD','x_profile','discovery_only','Public host identity, not replay confirmation'
 FROM space_hosts h WHERE lower(h.handle)='a5t3r0ld' LIMIT 1;
INSERT OR IGNORE INTO space_host_sources(host_user_id,source_url,source_kind,review_status,notes)
 SELECT h.x_user_id,'https://www.twitterspacegpt.com/zh/hosts/A5T3R0lD','public_archive','discovery_only',
 'Mixed hosted/speaker appearances: verify each Space ID, attribution and X replay before adding episodes'
 FROM space_hosts h WHERE lower(h.handle)='a5t3r0ld' LIMIT 1;
