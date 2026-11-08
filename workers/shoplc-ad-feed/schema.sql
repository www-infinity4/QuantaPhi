-- Shop LC approved product-ad catalog; isolated from wallet, click and identity databases.
-- Deploy only after verified merchant program approval and reviewed feed/media license.
CREATE TABLE IF NOT EXISTS shoplc_ads (
  id TEXT PRIMARY KEY,
  product_code TEXT NOT NULL,
  title TEXT NOT NULL,
  href TEXT NOT NULL,
  image TEXT NOT NULL,
  price REAL,
  category TEXT NOT NULL,
  checked_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  on_air INTEGER NOT NULL DEFAULT 0 CHECK(on_air IN (0,1)),
  sale_verified INTEGER NOT NULL DEFAULT 0 CHECK(sale_verified IN (0,1))
);
CREATE INDEX IF NOT EXISTS idx_shoplc_ads_fresh ON shoplc_ads(expires_at, checked_at);
CREATE TABLE IF NOT EXISTS shoplc_sync_status (
  id INTEGER PRIMARY KEY CHECK (id=1),
  synced_at INTEGER NOT NULL,
  count INTEGER NOT NULL CHECK (count>=0)
);
