-- Apply to the Quant and StarQuest D1 databases. Credit and balance update
-- use the same database transaction for the selected asset.
CREATE TABLE IF NOT EXISTS bot_work_rewards (
 reward_id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL,
 asset TEXT NOT NULL CHECK(asset IN ('QUANT','STARCOIN')),
 amount INTEGER NOT NULL CHECK(amount=1),
 metadata_json TEXT NOT NULL,
 paid INTEGER NOT NULL DEFAULT 0,
 created_at INTEGER NOT NULL
);
