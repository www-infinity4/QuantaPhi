CREATE TABLE IF NOT EXISTS robot_visual_evidence(object_key TEXT PRIMARY KEY,payload_hash TEXT NOT NULL,metadata_json TEXT NOT NULL,binary INTEGER NOT NULL,complete INTEGER NOT NULL DEFAULT 0,size INTEGER NOT NULL,created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS robot_visual_evidence_chunks(object_key TEXT NOT NULL,part INTEGER NOT NULL,data TEXT NOT NULL,PRIMARY KEY(object_key,part));
