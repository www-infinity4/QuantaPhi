-- Source of truth: deployed quantaphi-business-directory D1, Nov 1 2026.
-- Wallet/ledger schema intentionally excluded. Apply only to a new isolated D1 DB.
CREATE TABLE business_ingest_receipts (
 receipt_id TEXT PRIMARY KEY,
 source TEXT NOT NULL,
 dataset_version TEXT NOT NULL,
 city TEXT NOT NULL,
 state TEXT NOT NULL,
 inspected INTEGER NOT NULL,
 accepted INTEGER NOT NULL,
 duplicates INTEGER NOT NULL,
 rejected INTEGER NOT NULL,
 job_id TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE businesses (
 id TEXT PRIMARY KEY,
 source_id TEXT NOT NULL,
 name TEXT NOT NULL,
 city TEXT NOT NULL,
 state TEXT NOT NULL CHECK(length(state)=2),
 category TEXT NOT NULL,
 address TEXT NOT NULL DEFAULT '',
 latitude REAL,
 longitude REAL,
 website TEXT NOT NULL DEFAULT '',
 source_url TEXT NOT NULL,
 source_name TEXT NOT NULL,
 source_license TEXT NOT NULL DEFAULT '',
 confidence REAL,
 image_url TEXT NOT NULL DEFAULT '',
 image_rights TEXT NOT NULL DEFAULT '',
 attribution TEXT NOT NULL DEFAULT '',
 status TEXT NOT NULL DEFAULT 'listed' CHECK(status IN ('listed','review','suppressed')),
 ad_status TEXT NOT NULL DEFAULT 'not_sponsored' CHECK(ad_status IN ('not_sponsored','approved_partner')),
 claimed INTEGER NOT NULL DEFAULT 0 CHECK(claimed IN (0,1)),
 last_seen TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 UNIQUE(source_name,source_id)
);

CREATE TABLE city_import_jobs (
 job_id TEXT PRIMARY KEY,
 city TEXT NOT NULL,
 state TEXT NOT NULL,
 priority INTEGER NOT NULL DEFAULT 2,
 phase TEXT NOT NULL DEFAULT 'discovery' CHECK(phase IN ('discovery','import','review','expand')),
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','blocked','complete')),
 source TEXT NOT NULL DEFAULT 'overture-places',
 dataset_version TEXT NOT NULL DEFAULT '',
 cursor TEXT NOT NULL DEFAULT '',
 imported INTEGER NOT NULL DEFAULT 0,
 attempts INTEGER NOT NULL DEFAULT 0,
 last_error TEXT NOT NULL DEFAULT '',
 next_run TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, bbox TEXT NOT NULL DEFAULT '',
 UNIQUE(city,state)
);

CREATE TABLE directory_meta (
 name TEXT PRIMARY KEY,value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_businesses_location ON businesses(state,city,category,name);

CREATE INDEX idx_businesses_name ON businesses(name);

CREATE INDEX idx_businesses_source ON businesses(source_name,source_id);
