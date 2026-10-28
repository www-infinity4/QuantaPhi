-- Run once on the existing production D1 before deploying the updated publisher.
-- Existing cards keep their working interactive default.
ALTER TABLE quick_cards ADD COLUMN preview_mode TEXT NOT NULL DEFAULT 'interactive' CHECK(preview_mode IN ('interactive','visual'));
