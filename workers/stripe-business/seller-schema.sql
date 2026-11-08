-- Stripe Business Studio D1 DESIGN ONLY — never deploy/migrate without
-- verified Connect platform approval, authenticated seller identity and a
-- security/privacy review. No live Stripe API is connected by these tables.
--
-- No bank numbers, routing numbers, API tokens, identity documents, SSNs,
-- Stripe customer secrets or personally identifying payment details here.
-- Customer Cash Wallet stays in existing issue #1773 and its licensed provider.
PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS stripe_seller_connection (
 seller_id TEXT PRIMARY KEY NOT NULL,
 stripe_connected_account_ref TEXT UNIQUE,
 provider TEXT NOT NULL DEFAULT 'stripe_connect' CHECK(provider='stripe_connect'),
 connection_state TEXT NOT NULL DEFAULT 'not_connected' CHECK(connection_state IN
   ('not_connected','pending','requirements_due','verified','restricted','revoked')),
 charges_enabled INTEGER NOT NULL DEFAULT 0 CHECK(charges_enabled IN (0,1)),
 payouts_enabled INTEGER NOT NULL DEFAULT 0 CHECK(payouts_enabled IN (0,1)),
 stripe_capabilities_verified_at TEXT,
 server_verified_at TEXT,
 last_reconciled_at TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 CHECK(connection_state!='verified' OR
  (stripe_connected_account_ref IS NOT NULL AND server_verified_at IS NOT NULL
   AND stripe_capabilities_verified_at IS NOT NULL))
);
-- One seller can have many Shop Phi or Quick Cards. The seller_id comes from
-- the signed QuantaPhi session, NOT an untrusted public seller slug.
-- Merchant ID is resolved through stripe_seller_connection server-side.
CREATE TABLE IF NOT EXISTS stripe_seller_card_binding (
 seller_id TEXT NOT NULL REFERENCES stripe_seller_connection(seller_id),
 card_id TEXT NOT NULL UNIQUE,
 business_kind TEXT NOT NULL CHECK(business_kind IN ('coins','services','products')),
 price_cents INTEGER NOT NULL CHECK(price_cents>0 AND price_cents<=9999999),
 currency TEXT NOT NULL DEFAULT 'USD' CHECK(currency='USD'),
 state TEXT NOT NULL DEFAULT 'draft' CHECK(state IN
  ('draft','owner_review','rights_review','approved','published','paused','revoked')),
 ownership_proof_ref TEXT,
 media_rights_ref TEXT,
 price_owner_approval_ref TEXT,
 refund_delivery_terms_ref TEXT,
 reviewed_by TEXT,
 reviewed_at TEXT,
 updated_at TEXT NOT NULL,
 PRIMARY KEY(seller_id,card_id),
 CHECK(state NOT IN ('approved','published') OR (
  ownership_proof_ref IS NOT NULL AND media_rights_ref IS NOT NULL
  AND price_owner_approval_ref IS NOT NULL AND refund_delivery_terms_ref IS NOT NULL
  AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS stripe_seller_cards_by_owner
 ON stripe_seller_card_binding(seller_id,state,updated_at);
-- OAuth/hosted onboarding intents must be authenticated and short lived.
-- These are hashes of single-use state; never store hosted onboarding link
-- (it expires and can grant account modification privileges) or tokens.
CREATE TABLE IF NOT EXISTS stripe_seller_onboarding_intent (
 state_hash TEXT PRIMARY KEY,
 seller_id TEXT NOT NULL REFERENCES stripe_seller_connection(seller_id),
 created_at TEXT NOT NULL,
 expires_at TEXT NOT NULL,
 consumed_at TEXT,
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN
  ('pending','completed','expired','cancelled'))
);
-- A payment event's id is NOT its value. Future checkout backend needs
-- signed Stripe webhook checks, merchant matching and separate custody ledger.
-- No customer balance/transfer tables are created by this schema.
