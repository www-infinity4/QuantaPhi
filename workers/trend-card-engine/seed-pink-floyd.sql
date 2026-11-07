-- Manually confirmed from Pink Floyd's official November 5, 2026 announcement
-- and shop.us.pinkfloyd.com. Pilot only; NOT approved for public placement.
-- Refresh checked_at and obtain media rights/working-card verification before approval.
INSERT OR IGNORE INTO source_items
(id,title,artist,category,tags,source_url,destination_url,source_authority,checked_at,kind,rights,state,media_rights_verified,card_tests_passed)
VALUES
('pink-floyd-animals-50','Animals 50 — Sheep (Original Radio Edit)','Pink Floyd','music',
 '["pink floyd","animals","sheep","roger waters"]',
 'https://www.pinkfloyd.com/pink-floyd-announce-animals-50/',
 'https://shop.us.pinkfloyd.com/products/animals-50-cd',
 'artist','2026-11-07T06:00:00Z','organic','source-linked','source_verified',0,0);
INSERT OR IGNORE INTO orange_decisions(source_id,role,status,explanation)
VALUES('pink-floyd-animals-50','orange','proposed','Verified original artist source; Quant-AI, licensed image, playable embed and Red tests pending');
