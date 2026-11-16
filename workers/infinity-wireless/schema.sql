-- Infinity Wireless: planning only, deliberately isolated from user identity,
-- Bubbles owner tokens, wallet, cellular radio control and any SIM credentials.
CREATE TABLE IF NOT EXISTS wireless_orders (
 id TEXT PRIMARY KEY,
 token_hash TEXT NOT NULL UNIQUE,
 city TEXT NOT NULL,
 state TEXT NOT NULL,
 goal TEXT NOT NULL CHECK(goal IN ('home','community','business','pilot')),
 backhaul TEXT NOT NULL CHECK(backhaul IN ('unknown','fiber','fixed-wireless','carrier-partner')),
 created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_wireless_state ON wireless_orders(state,city,created_at);
CREATE TABLE IF NOT EXISTS wireless_events (
 order_id TEXT NOT NULL REFERENCES wireless_orders(id),
 kind TEXT NOT NULL CHECK(kind IN ('request_received','preliminary_screening_pending')),
 at TEXT NOT NULL,
 source TEXT NOT NULL,
 PRIMARY KEY(order_id,kind)
);
CREATE TABLE IF NOT EXISTS wireless_daily_limits (
 day TEXT NOT NULL,
 ip_hash TEXT NOT NULL,
 count INTEGER NOT NULL,
 PRIMARY KEY(day,ip_hash)
);
