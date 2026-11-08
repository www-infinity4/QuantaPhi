-- STRIPE TEST MODE ONLY, NOT A PRODUCTION PAYMENT LEDGER.
-- Apply only to isolated SPONSOR_SANDBOX_DB D1 after independent review.
-- Do not mix into sponsor_campaign, customer Cash Wallet, reward tokens,
-- creator PayPal receipts, or an existing production DB.
-- Only authenticated Stripe-signature-verified worker requests may insert.
CREATE TABLE IF NOT EXISTS sponsor_stripe_sandbox_receipt (
 event_id TEXT PRIMARY KEY NOT NULL CHECK(event_id LIKE 'evt_%'),
 session_id TEXT UNIQUE NOT NULL CHECK(session_id LIKE 'cs_test_%'),
 payment_link_id TEXT NOT NULL CHECK(payment_link_id LIKE 'plink_%'),
 amount_cents INTEGER NOT NULL CHECK(amount_cents=10000),
 currency TEXT NOT NULL CHECK(currency='usd'),
 recorded_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS stripe_sandbox_receipt_by_payment_link
 ON sponsor_stripe_sandbox_receipt(payment_link_id,recorded_at);
