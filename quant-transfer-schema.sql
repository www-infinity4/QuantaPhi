PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS quant_wallets(wallet_id TEXT PRIMARY KEY,user_id TEXT NOT NULL UNIQUE,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS quant_transfers(transfer_id TEXT PRIMARY KEY,sender_wallet_id TEXT NOT NULL,recipient_wallet_id TEXT NOT NULL,amount INTEGER NOT NULL CHECK(amount>0),idempotency_key TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'committed',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,UNIQUE(sender_wallet_id,idempotency_key),FOREIGN KEY(sender_wallet_id) REFERENCES quant_wallets(wallet_id),FOREIGN KEY(recipient_wallet_id) REFERENCES quant_wallets(wallet_id));
CREATE TABLE IF NOT EXISTS quant_ledger_entries(entry_id TEXT PRIMARY KEY,transfer_id TEXT NOT NULL,wallet_id TEXT NOT NULL,delta INTEGER NOT NULL CHECK(delta<>0),created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(transfer_id) REFERENCES quant_transfers(transfer_id),FOREIGN KEY(wallet_id) REFERENCES quant_wallets(wallet_id));
CREATE UNIQUE INDEX IF NOT EXISTS quant_transfer_wallet_once ON quant_ledger_entries(transfer_id,wallet_id);
CREATE INDEX IF NOT EXISTS quant_ledger_wallet_time ON quant_ledger_entries(wallet_id,created_at);
