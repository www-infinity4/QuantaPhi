-- Backfill missing neutral merchant connection placeholders after regulator-only store imports.
-- No actual merchant permission, license verification, inventory, media, testimonials, or ad activation.
-- INSERT OR IGNORE never overwrites an existing merchant connection or its approval state.
INSERT OR IGNORE INTO store_inventory_connections(store_id,provider,connection_state,license_review_state)
SELECT id,'merchant','not_connected','unreviewed' FROM store_sources
WHERE record_status='listed' AND official_source=1 AND paid_sponsor=0;
