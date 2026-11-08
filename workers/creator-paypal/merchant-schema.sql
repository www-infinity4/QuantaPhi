-- DESIGN DRAFT ONLY. Do not migrate production until PayPal partner merchant
-- onboarding, signed webhooks, tax/fees, support and security review are complete.
-- Creator payables are NOT preloaded Cash Wallet USD, Star Coins or Site GITs.
-- Never store bank/routing/SSNs, PayPal access tokens, buyer identity secrets,
-- payment-card numbers or personally sensitive details in this database.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS creator_paypal_connection (
 creator_id TEXT PRIMARY KEY NOT NULL,
 provider TEXT NOT NULL DEFAULT 'paypal' CHECK(provider='paypal'),
 merchant_ref TEXT UNIQUE,
 state TEXT NOT NULL DEFAULT 'not_connected' CHECK(state IN
  ('not_connected','pending','restricted','verified','revoked')),
 verified_on TEXT,
 revoked_on TEXT,
 verified_permissions_json TEXT NOT NULL DEFAULT '[]',
 approved_by_server INTEGER NOT NULL DEFAULT 0 CHECK(approved_by_server IN (0,1)),
 updated_at TEXT NOT NULL,
 CHECK(state!='verified' OR
  (merchant_ref IS NOT NULL AND verified_on IS NOT NULL AND approved_by_server=1))
);
-- Every card remains owned by ONE verified creator. No user-submitted merchant_ref
-- can be attached to a card directly. Commerce Worker looks up creator -> merchant.
CREATE TABLE IF NOT EXISTS creator_paypal_card (
 creator_id TEXT NOT NULL REFERENCES creator_paypal_connection(creator_id),
 card_id TEXT NOT NULL,
 currency TEXT NOT NULL DEFAULT 'USD' CHECK(currency='USD'),
 price_cents INTEGER NOT NULL CHECK(price_cents>=1 AND price_cents<=9999999),
 publication_state TEXT NOT NULL DEFAULT 'draft' CHECK(publication_state IN
  ('draft','pending_review','approved','active','paused','revoked')),
 owner_authorization_ref TEXT,
 content_rights_review_ref TEXT,
 refund_terms_ref TEXT,
 paid_terms_accepted_at TEXT,
 verified_by TEXT,
 updated_at TEXT NOT NULL,
 PRIMARY KEY(creator_id,card_id),
 CHECK(publication_state NOT IN ('active') OR
  (owner_authorization_ref IS NOT NULL AND content_rights_review_ref IS NOT NULL
   AND refund_terms_ref IS NOT NULL AND verified_by IS NOT NULL AND paid_terms_accepted_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS creator_paypal_card_by_id ON creator_paypal_card(card_id);
-- Prevent 500+ card limit in server transaction by COUNT(*) for creator_id
-- inside the single writer with appropriate serialization / Durable Object.
-- The source draft cap is a UX guard only.
CREATE TABLE IF NOT EXISTS creator_paypal_onboarding_intent (
 state_hash TEXT PRIMARY KEY NOT NULL,
 creator_id TEXT NOT NULL REFERENCES creator_paypal_connection(creator_id),
 redirect_path TEXT NOT NULL,
 created_at TEXT NOT NULL,
 expires_at TEXT NOT NULL,
 consumed_at TEXT,
 intent_state TEXT NOT NULL CHECK(intent_state IN ('pending','completed','expired','cancelled'))
);
-- Created only after authenticating the provider webhook with raw signed bytes,
-- pinned partner merchant/account and timestamp. No public browser writes.
CREATE TABLE IF NOT EXISTS creator_paypal_provider_event (
 provider_event_id TEXT PRIMARY KEY NOT NULL,
 creator_id TEXT NOT NULL,
 card_id TEXT NOT NULL,
 paypal_order_ref TEXT NOT NULL,
 paypal_capture_ref TEXT,
 event_kind TEXT NOT NULL CHECK(event_kind IN
  ('created','approved','captured','denied','refunded','disputed','reversed')),
 paid_amount_cents INTEGER CHECK(paid_amount_cents>=0),
 currency TEXT NOT NULL DEFAULT 'USD' CHECK(currency='USD'),
 event_time TEXT NOT NULL,
 verified_at TEXT NOT NULL,
 reconciliation_state TEXT NOT NULL DEFAULT 'pending' CHECK(reconciliation_state IN
  ('pending','matched','reversed','exception')),
 FOREIGN KEY(creator_id,card_id) REFERENCES creator_paypal_card(creator_id,card_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS creator_paypal_capture_idem
 ON creator_paypal_provider_event(paypal_capture_ref,event_kind)
 WHERE paypal_capture_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS creator_paypal_events_by_owner
 ON creator_paypal_provider_event(creator_id,card_id,event_time);
