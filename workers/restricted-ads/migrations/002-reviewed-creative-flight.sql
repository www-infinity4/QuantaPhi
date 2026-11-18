-- Restrict formerly approved rows until an authorized reviewer records campaign flight,
-- licensed image expiry and an independently confirmed advertiser agreement.
-- No pre-approved campaigns, fake dates or merchant data are inserted.
ALTER TABLE restricted_ad_creatives ADD COLUMN rights_expires_at TEXT NOT NULL DEFAULT '';
ALTER TABLE restricted_ad_creatives ADD COLUMN campaign_starts_at TEXT NOT NULL DEFAULT '';
ALTER TABLE restricted_ad_creatives ADD COLUMN campaign_ends_at TEXT NOT NULL DEFAULT '';
ALTER TABLE restricted_ad_creatives ADD COLUMN sponsor_agreement_id TEXT NOT NULL DEFAULT '';
