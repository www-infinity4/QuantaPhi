"""Neutral merchant connection placeholder backfill must never authorize inventory."""
import sqlite3
import unittest
from pathlib import Path

SQL = Path(__file__).resolve().parents[1] / 'workers/cannabis-directory-inventory-default-backfill.sql'

def database():
    db = sqlite3.connect(':memory:')
    db.execute('PRAGMA foreign_keys=ON')
    db.executescript("""
    CREATE TABLE store_sources(id TEXT PRIMARY KEY,record_status TEXT,official_source INTEGER,paid_sponsor INTEGER);
    CREATE TABLE store_inventory_connections(
      store_id TEXT NOT NULL REFERENCES store_sources(id) ON DELETE CASCADE,
      provider TEXT NOT NULL CHECK(provider IN ('weedmaps','dutchie','jane','merchant','other')),
      connection_state TEXT NOT NULL DEFAULT 'not_connected' CHECK(connection_state IN ('not_connected','requested','authorized','paused','disabled')),
      license_review_state TEXT NOT NULL DEFAULT 'unreviewed' CHECK(license_review_state IN ('unreviewed','under_review','verified','rejected')),
      permission_evidence_url TEXT NOT NULL DEFAULT '',
      source_menu_url TEXT NOT NULL DEFAULT '',
      last_sync_at TEXT NOT NULL DEFAULT '',
      last_items_seen INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(store_id,provider)
    );
    INSERT INTO store_sources VALUES('nv:1','listed',1,0),('ct:1','listed',1,0),('co:1','listed',1,0),('draft:1','review',1,0),('sponsored:1','listed',1,1),('unofficial:1','listed',0,0);
    INSERT INTO store_inventory_connections(store_id,provider,connection_state,license_review_state)
      VALUES('co:1','merchant','requested','under_review');
    """)
    return db

class InventoryBackfill(unittest.TestCase):
    def test_idempotent_and_preserves_existing_pending_authorization(self):
        db = database()
        for _ in range(2):
            db.executescript(SQL.read_text())
        rows = db.execute('SELECT store_id,provider,connection_state,license_review_state FROM store_inventory_connections ORDER BY store_id').fetchall()
        self.assertEqual(rows, [
          ('co:1','merchant','requested','under_review'),
          ('ct:1','merchant','not_connected','unreviewed'),
          ('nv:1','merchant','not_connected','unreviewed')
        ])
        self.assertEqual(db.execute("SELECT COUNT(*) FROM store_inventory_connections WHERE connection_state='authorized'").fetchone()[0], 0)

    def test_unlisted_and_sponsored_and_unofficial_never_seeded(self):
        db = database()
        db.executescript(SQL.read_text())
        ids = {r[0] for r in db.execute('SELECT store_id FROM store_inventory_connections')}
        self.assertFalse({'draft:1','sponsored:1','unofficial:1'} & ids)

if __name__ == '__main__':
    unittest.main()
