PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS quant_wallets(wallet_id TEXT PRIMARY KEY,user_id TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS quant_transfers(transfer_id TEXT PRIMARY KEY,sender_wallet_id TEXT NOT NULL,recipient_wallet_id TEXT NOT NULL,amount INTEGER NOT NULL CHECK(amount>0),idempotency_key TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'committed',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(sender_wallet_id,idempotency_key),FOREIGN KEY(sender_wallet_id) REFERENCES quant_wallets(wallet_id),FOREIGN KEY(recipient_wallet_id) REFERENCES quant_wallets(wallet_id));
CREATE TABLE IF NOT EXISTS quant_ledger_entries(entry_id TEXT PRIMARY KEY,transfer_id TEXT NOT NULL,wallet_id TEXT NOT NULL,delta INTEGER NOT NULL CHECK(delta<>0),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(transfer_id) REFERENCES quant_transfers(transfer_id),FOREIGN KEY(wallet_id) REFERENCES quant_wallets(wallet_id));
CREATE UNIQUE INDEX IF NOT EXISTS quant_transfer_wallet_once ON quant_ledger_entries(transfer_id,wallet_id);
CREATE INDEX IF NOT EXISTS quant_ledger_wallet_time ON quant_ledger_entries(wallet_id,created_at);


CREATE TABLE IF NOT EXISTS quant_mints(
  mint_id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL,
  provenance_hash TEXT NOT NULL UNIQUE,
  source_key TEXT NOT NULL UNIQUE,
  query_text TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 1 CHECK(amount=1),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(wallet_id) REFERENCES quant_wallets(wallet_id)
);
CREATE INDEX IF NOT EXISTS quant_mints_wallet_time ON quant_mints(wallet_id,created_at);

CREATE TRIGGER IF NOT EXISTS quant_no_overdraft
BEFORE INSERT ON quant_ledger_entries
WHEN NEW.delta < 0
BEGIN
  SELECT RAISE(ABORT, 'insufficient_quant_balance')
  WHERE (SELECT COALESCE(SUM(delta),0)
         FROM quant_ledger_entries
         WHERE wallet_id = NEW.wallet_id) + NEW.delta < 0;
END;

CREATE UNIQUE INDEX IF NOT EXISTS quant_mint_ledger_once
ON quant_ledger_entries(transfer_id)
WHERE delta > 0 AND transfer_id LIKE 'qm_%';

CREATE TRIGGER IF NOT EXISTS quant_validate_mint_credit
BEFORE INSERT ON quant_ledger_entries
WHEN NEW.transfer_id LIKE 'qm_%'
BEGIN
  SELECT RAISE(ABORT, 'invalid_quant_mint_credit')
  WHERE NEW.delta <> 1
     OR NOT EXISTS (
       SELECT 1 FROM quant_mints m
       WHERE m.mint_id = NEW.transfer_id
         AND m.wallet_id = NEW.wallet_id
         AND m.amount = 1
     );
END;
