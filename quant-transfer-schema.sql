PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS quant_wallets(
  wallet_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quant_transfers(
  transfer_id TEXT PRIMARY KEY,
  sender_wallet_id TEXT NOT NULL,
  recipient_wallet_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK(amount>0),
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'committed',
  reversal_of TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sender_wallet_id,idempotency_key),
  FOREIGN KEY(sender_wallet_id) REFERENCES quant_wallets(wallet_id),
  FOREIGN KEY(recipient_wallet_id) REFERENCES quant_wallets(wallet_id)
);

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

CREATE TABLE IF NOT EXISTS quant_ledger_entries(
  entry_id TEXT PRIMARY KEY,
  reference_id TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK(entry_type IN ('mint','transfer','reversal','migration')),
  wallet_id TEXT NOT NULL,
  delta INTEGER NOT NULL CHECK(delta<>0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(wallet_id) REFERENCES quant_wallets(wallet_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS quant_one_reversal_per_transfer ON quant_transfers(reversal_of) WHERE reversal_of IS NOT NULL;

CREATE INDEX IF NOT EXISTS quant_ledger_wallet_time ON quant_ledger_entries(wallet_id,created_at);
CREATE INDEX IF NOT EXISTS quant_mints_wallet_time ON quant_mints(wallet_id,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS quant_transfer_wallet_once ON quant_ledger_entries(reference_id,wallet_id) WHERE entry_type IN ('transfer','reversal');
CREATE UNIQUE INDEX IF NOT EXISTS quant_mint_ledger_once ON quant_ledger_entries(reference_id) WHERE entry_type='mint';

CREATE TRIGGER IF NOT EXISTS quant_no_overdraft
BEFORE INSERT ON quant_ledger_entries WHEN NEW.delta<0
BEGIN
  SELECT RAISE(ABORT,'insufficient_quant_balance')
  WHERE (SELECT COALESCE(SUM(delta),0) FROM quant_ledger_entries WHERE wallet_id=NEW.wallet_id)+NEW.delta<0;
END;

CREATE TRIGGER IF NOT EXISTS quant_validate_mint_credit
BEFORE INSERT ON quant_ledger_entries WHEN NEW.entry_type='mint'
BEGIN
  SELECT RAISE(ABORT,'invalid_quant_mint_credit')
  WHERE NEW.delta<>1 OR NOT EXISTS(
    SELECT 1 FROM quant_mints m
    WHERE m.mint_id=NEW.reference_id AND m.wallet_id=NEW.wallet_id AND m.amount=1
  );
END;

CREATE TRIGGER IF NOT EXISTS quant_validate_transfer_entry
BEFORE INSERT ON quant_ledger_entries WHEN NEW.entry_type='transfer'
BEGIN
  SELECT RAISE(ABORT,'invalid_quant_transfer_entry')
  WHERE NOT EXISTS(
    SELECT 1 FROM quant_transfers t
    WHERE t.transfer_id=NEW.reference_id
      AND ((NEW.wallet_id=t.sender_wallet_id AND NEW.delta=-t.amount)
        OR (NEW.wallet_id=t.recipient_wallet_id AND NEW.delta=t.amount))
  );
END;

CREATE TRIGGER IF NOT EXISTS quant_validate_reversal_entry
BEFORE INSERT ON quant_ledger_entries WHEN NEW.entry_type='reversal'
BEGIN
  SELECT RAISE(ABORT,'invalid_quant_reversal_entry')
  WHERE NOT EXISTS(
    SELECT 1 FROM quant_transfers t
    JOIN quant_transfers original ON original.transfer_id=t.reversal_of
    WHERE t.transfer_id=NEW.reference_id
      AND t.reversal_of IS NOT NULL
      AND t.amount=original.amount
      AND t.sender_wallet_id=original.recipient_wallet_id
      AND t.recipient_wallet_id=original.sender_wallet_id
      AND ((NEW.wallet_id=t.sender_wallet_id AND NEW.delta=-t.amount)
        OR (NEW.wallet_id=t.recipient_wallet_id AND NEW.delta=t.amount))
  );
END;

CREATE TRIGGER IF NOT EXISTS quant_ledger_no_update
BEFORE UPDATE ON quant_ledger_entries
BEGIN SELECT RAISE(ABORT,'immutable_quant_ledger'); END;

CREATE TRIGGER IF NOT EXISTS quant_ledger_no_delete
BEFORE DELETE ON quant_ledger_entries
BEGIN SELECT RAISE(ABORT,'immutable_quant_ledger'); END;


CREATE TRIGGER IF NOT EXISTS quant_transfers_no_update
BEFORE UPDATE ON quant_transfers
BEGIN SELECT RAISE(ABORT,'immutable_quant_transfer'); END;

CREATE TRIGGER IF NOT EXISTS quant_transfers_no_delete
BEFORE DELETE ON quant_transfers
BEGIN SELECT RAISE(ABORT,'immutable_quant_transfer'); END;

CREATE TRIGGER IF NOT EXISTS quant_mints_no_update
BEFORE UPDATE ON quant_mints
BEGIN SELECT RAISE(ABORT,'immutable_quant_mint'); END;

CREATE TRIGGER IF NOT EXISTS quant_mints_no_delete
BEFORE DELETE ON quant_mints
BEGIN SELECT RAISE(ABORT,'immutable_quant_mint'); END;


CREATE TABLE IF NOT EXISTS quant_legacy_migrations(
  migration_id TEXT PRIMARY KEY,
  wallet_id TEXT NOT NULL UNIQUE,
  legacy_amount INTEGER NOT NULL CHECK(legacy_amount>=0),
  provenance_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(wallet_id) REFERENCES quant_wallets(wallet_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS quant_legacy_migration_ledger_once
ON quant_ledger_entries(reference_id)
WHERE entry_type='migration';

CREATE TRIGGER IF NOT EXISTS quant_validate_migration_credit
BEFORE INSERT ON quant_ledger_entries WHEN NEW.entry_type='migration'
BEGIN
  SELECT RAISE(ABORT,'invalid_quant_migration_credit')
  WHERE NOT EXISTS(
    SELECT 1 FROM quant_legacy_migrations m
    WHERE m.migration_id=NEW.reference_id
      AND m.wallet_id=NEW.wallet_id
      AND NEW.delta=m.legacy_amount
      AND NEW.delta>0
  );
END;

CREATE TRIGGER IF NOT EXISTS quant_legacy_migrations_no_update
BEFORE UPDATE ON quant_legacy_migrations
BEGIN SELECT RAISE(ABORT,'immutable_quant_legacy_migration'); END;

CREATE TRIGGER IF NOT EXISTS quant_legacy_migrations_no_delete
BEFORE DELETE ON quant_legacy_migrations
BEGIN SELECT RAISE(ABORT,'immutable_quant_legacy_migration'); END;
