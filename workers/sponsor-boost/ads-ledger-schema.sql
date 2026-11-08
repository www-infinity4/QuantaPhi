-- DRAFT only: do not execute against production D1 until authenticated
-- advertiser merchant service, provider webhooks, retention and rollout are approved.
-- Direct-sold sponsored campaigns ONLY; never consumer Cash Wallet or reward tokens.
-- Opaque payment processor references only. No bank numbers, PayPal secrets,
-- Plaid tokens, emails, IP/device IDs, raw browsing history or user identity.
CREATE TABLE IF NOT EXISTS sponsor_campaign (
 campaign_id TEXT PRIMARY KEY CHECK(length(campaign_id) BETWEEN 1 AND 70),
 brand_id TEXT NOT NULL CHECK(length(brand_id) BETWEEN 1 AND 70),
 status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN
   ('draft','reviewed','invoice_issued','provider_paid','active','ended','refunded','suspended')),
 currency TEXT NOT NULL DEFAULT 'USD' CHECK(currency='USD'),
 proposed_fee_cents INTEGER NOT NULL CHECK(proposed_fee_cents>0 AND proposed_fee_cents<=100000000),
 contracted_fee_cents INTEGER CHECK(contracted_fee_cents>0),
 start_utc TEXT NOT NULL,
 end_utc TEXT NOT NULL,
 contract_ref TEXT,
 provider TEXT CHECK(provider IN ('stripe','paypal')),
 provider_invoice_ref TEXT,
 provider_payment_ref TEXT UNIQUE,
 provider_settlement_ref TEXT UNIQUE,
 sponsored_label TEXT NOT NULL DEFAULT 'Sponsored' CHECK(sponsored_label='Sponsored'),
 reviewed_at TEXT,
 provider_paid_at TEXT,
 created_at TEXT NOT NULL,
 CHECK(start_utc<end_utc),
 CHECK(status NOT IN ('provider_paid','active','ended') OR
  (contract_ref IS NOT NULL AND provider_payment_ref IS NOT NULL AND provider_paid_at IS NOT NULL)),
 CHECK(status!='active' OR (provider_settlement_ref IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS sponsor_campaign_status_dates ON sponsor_campaign(status,start_utc,end_utc);
CREATE TABLE IF NOT EXISTS sponsor_approved_creative (
 creative_id TEXT PRIMARY KEY CHECK(length(creative_id) BETWEEN 1 AND 70),
 campaign_id TEXT NOT NULL REFERENCES sponsor_campaign(campaign_id),
 product_id TEXT NOT NULL CHECK(length(product_id) BETWEEN 1 AND 70),
 image_url TEXT NOT NULL CHECK(substr(image_url,1,8)='https://'),
 landing_url TEXT NOT NULL CHECK(substr(landing_url,1,8)='https://'),
 title TEXT NOT NULL,
 image_license_ref TEXT NOT NULL,
 reviewed_by TEXT NOT NULL,
 rights_reviewed_at TEXT NOT NULL,
 product_confirmed_at TEXT NOT NULL,
 stock_status TEXT NOT NULL CHECK(stock_status IN ('verified_available','out_of_stock','unknown')),
 enabled INTEGER NOT NULL DEFAULT 0 CHECK(enabled IN (0,1)),
 UNIQUE(campaign_id,product_id,image_url)
);
CREATE INDEX IF NOT EXISTS sponsor_creative_campaign ON sponsor_approved_creative(campaign_id,enabled);
-- Provider event ids must be signature/timestamp verified BEFORE an authorized
-- Worker inserts a row. UNIQUE blocks repeated provider notifications in D1.
CREATE TABLE IF NOT EXISTS sponsor_provider_event (
 event_key TEXT PRIMARY KEY,
 campaign_id TEXT NOT NULL REFERENCES sponsor_campaign(campaign_id),
 provider TEXT NOT NULL CHECK(provider IN ('stripe','paypal')),
 event_type TEXT NOT NULL,
 processor_event_ref TEXT NOT NULL UNIQUE,
 processor_account_ref TEXT NOT NULL,
 observed_at TEXT NOT NULL,
 verified_at TEXT NOT NULL,
 amount_cents INTEGER CHECK(amount_cents>=0),
 currency TEXT NOT NULL CHECK(currency='USD'),
 reconciliation_state TEXT NOT NULL CHECK(reconciliation_state IN ('pending','settled','refunded','disputed'))
);
-- Daily aggregates are written ONLY from trusted measurement ingestion and
-- have no foreign browser IDs. Cannot be made by public card clicks.
CREATE TABLE IF NOT EXISTS sponsor_reporting_aggregate (
 campaign_id TEXT NOT NULL REFERENCES sponsor_campaign(campaign_id),
 utc_day TEXT NOT NULL,
 verified_eligible_impressions INTEGER NOT NULL DEFAULT 0 CHECK(verified_eligible_impressions>=0),
 verified_user_clicks INTEGER NOT NULL DEFAULT 0 CHECK(verified_user_clicks>=0),
 verified_conversions INTEGER NOT NULL DEFAULT 0 CHECK(verified_conversions>=0),
 measured_at TEXT NOT NULL,
 definition_version TEXT NOT NULL,
 PRIMARY KEY(campaign_id,utc_day)
);
