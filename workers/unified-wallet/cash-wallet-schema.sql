-- Cash Wallet (USD only) — DESIGN MIGRATION, NOT APPLIED TO PRODUCTION.
-- Intentionally separate from unified_wallet_state, StarQuest, Quant and coupon tables.
-- Partner-owned funds are authoritative. No browser or operator-supplied "top up".
-- Never apply until an approved provider has been configured and independently audited.
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS cash_wallet_accounts (
  user_id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_customer_id TEXT NOT NULL UNIQUE,
  provider_wallet_id TEXT NOT NULL UNIQUE,
  currency TEXT NOT NULL DEFAULT 'USD' CHECK(currency='USD'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','suspended','closed')),
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

-- A transaction journal: events are inserted only after verified provider callbacks
-- or authenticated server-side checkout reservation, never from client-supplied amounts.
CREATE TABLE IF NOT EXISTS cash_wallet_events (
  event_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES cash_wallet_accounts(user_id),
  provider TEXT NOT NULL,
  provider_event_id TEXT UNIQUE, -- replay guard, absent only on local reservations
  idempotency_key TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN (
    'deposit_pending','deposit_settled','deposit_reversed',
    'spend_reserved','spend_captured','spend_released','refund_settled'
  )),
  amount_cents INTEGER NOT NULL CHECK(amount_cents>0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK(currency='USD'),
  merchant_id TEXT, -- approved merchant registry identifier
  order_id TEXT,
  provider_reference TEXT,
  created_at_ms INTEGER NOT NULL,
  UNIQUE(user_id,idempotency_key,event_type)
);

CREATE INDEX IF NOT EXISTS idx_cash_wallet_events_account_time
ON cash_wallet_events(user_id,created_at_ms DESC);

-- Reservations must be created against a verified quote and user-scoped wallet.
-- The active provider / merchant adapter must atomically enforce insufficient
-- funds, expiration, per-order idempotency, final capture and release.
CREATE TABLE IF NOT EXISTS cash_wallet_reservations (
  reservation_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES cash_wallet_accounts(user_id),
  merchant_id TEXT NOT NULL,
  order_id TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK(amount_cents>0),
  currency TEXT NOT NULL DEFAULT 'USD' CHECK(currency='USD'),
  state TEXT NOT NULL CHECK(state IN ('reserved','captured','released','expired')),
  expires_at_ms INTEGER NOT NULL,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  UNIQUE(user_id,merchant_id,order_id)
);

-- Do not derive a spendable balance by trusting client snapshots or counting
-- deposits while pending. Provider settlement and reconciliation are mandatory.
-- Do not execute this file as part of a default GitHub Pages deploy.
