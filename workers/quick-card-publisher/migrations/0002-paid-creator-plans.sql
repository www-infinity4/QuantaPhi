-- Additive D1 upgrade for existing quick_cards installations; run before deploying updated Worker.
-- StarCoin amounts are decimal TEXT, never JavaScript floating-point numbers.
-- These fields describe creator plans only. No checkout or wallet tokens live in this DB.
ALTER TABLE quick_cards ADD COLUMN pricing_mode TEXT NOT NULL DEFAULT 'free' CHECK(pricing_mode IN ('free','paid'));
ALTER TABLE quick_cards ADD COLUMN price_star_coins TEXT NOT NULL DEFAULT '0';
ALTER TABLE quick_cards ADD COLUMN creator_profile TEXT NOT NULL DEFAULT '';
