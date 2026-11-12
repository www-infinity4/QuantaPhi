-- Add to the EXISTING quantaphi-product-directory D1. No second empty database.
-- Schema only: no paid ads, product images or sponsor records are fabricated.
-- Apply only after reviewed migration; changes to identity/wallet tables are forbidden.
CREATE TABLE IF NOT EXISTS ad_creatives (
  creative_id TEXT PRIMARY KEY NOT NULL,
  equivalence_key TEXT NOT NULL, -- stable across superficial re-skins of the same ad
  campaign_id TEXT NOT NULL,
  brand_id TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('house','editorial','sponsored')),
  placement TEXT NOT NULL DEFAULT 'quick' CHECK (placement IN ('quick','in-card','cast')),
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  category TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  image_url TEXT NOT NULL,
  image_rights TEXT NOT NULL DEFAULT 'unverified' CHECK (image_rights IN ('unverified','owned','licensed','expired')),
  tone TEXT NOT NULL DEFAULT '#145a88',
  disclosure TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_checked_at TEXT,
  rights_expires_at TEXT,
  sponsor_evidence_url TEXT,
  creative_hash TEXT NOT NULL,
  review_state TEXT NOT NULL DEFAULT 'draft' CHECK (review_state IN ('draft','review','approved','rejected','expired')),
  approved_at TEXT,
  starts_at TEXT,
  ends_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS ad_creatives_approved_lookup
  ON ad_creatives(placement,review_state,rights_expires_at,approved_at);
CREATE INDEX IF NOT EXISTS ad_creatives_equivalent
  ON ad_creatives(equivalence_key,campaign_id);

-- Reserved for the existing verified account/identity adapter.
-- Never accept a caller-supplied principal_id on an unauthenticated public route.
-- A server-side claim must INSERT OR IGNORE this unique pair before returning an ad.
CREATE TABLE IF NOT EXISTS ad_seen_receipts (
  principal_id TEXT NOT NULL,
  equivalence_key TEXT NOT NULL,
  creative_id TEXT NOT NULL,
  creative_hash TEXT NOT NULL,
  first_shown_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (principal_id, equivalence_key),
  FOREIGN KEY (creative_id) REFERENCES ad_creatives(creative_id)
);
CREATE INDEX IF NOT EXISTS ad_seen_by_principal
  ON ad_seen_receipts(principal_id,first_shown_at);
