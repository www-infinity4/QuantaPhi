CREATE TABLE IF NOT EXISTS gpt_coin_imports (
 issuer TEXT NOT NULL,
 receipt_id TEXT NOT NULL,
 user_id TEXT NOT NULL,
 amount INTEGER NOT NULL CHECK (amount BETWEEN 1 AND 1000000000),
 signed_payload TEXT NOT NULL,
 imported_at INTEGER NOT NULL,
 PRIMARY KEY (issuer, receipt_id)
);
CREATE INDEX IF NOT EXISTS gpt_coin_imports_user ON gpt_coin_imports(user_id);
CREATE TRIGGER IF NOT EXISTS gpt_coin_imports_no_update BEFORE UPDATE ON gpt_coin_imports
BEGIN SELECT RAISE(ABORT,'immutable_gpt_coin_receipt'); END;
CREATE TRIGGER IF NOT EXISTS gpt_coin_imports_no_delete BEFORE DELETE ON gpt_coin_imports
BEGIN SELECT RAISE(ABORT,'immutable_gpt_coin_receipt'); END;
