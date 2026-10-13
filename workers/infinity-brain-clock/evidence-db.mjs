export const evidenceSchema=`CREATE TABLE IF NOT EXISTS robot_visual_evidence(object_key TEXT PRIMARY KEY,payload_hash TEXT NOT NULL,metadata_json TEXT NOT NULL,binary INTEGER NOT NULL,complete INTEGER NOT NULL DEFAULT 0,size INTEGER NOT NULL,created_at INTEGER NOT NULL); CREATE TABLE IF NOT EXISTS robot_visual_evidence_chunks(object_key TEXT NOT NULL,part INTEGER NOT NULL,data TEXT NOT NULL,PRIMARY KEY(object_key,part));`;
export class D1EvidenceBucket {
 constructor(db){this.db=db;}
 async head(key){const row=await this.db.prepare('SELECT size,metadata_json FROM robot_visual_evidence WHERE object_key=? AND complete=1').bind(key).first();return row?{key,size:row.size,...JSON.parse(row.metadata_json)}:null;}
 async put(key,value,metadata={}){
  const binary=typeof value!=='string',bytes=binary?new Uint8Array(value):new TextEncoder().encode(value);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
  let raw;if(binary){let chars='';for(const b of bytes)chars+=String.fromCharCode(b);raw=btoa(chars);}else raw=value;
  await this.db.prepare('INSERT OR IGNORE INTO robot_visual_evidence(object_key,payload_hash,metadata_json,binary,size,created_at) VALUES(?,?,?,?,?,?)').bind(key,hash,JSON.stringify(metadata),Number(binary),bytes.length,Date.now()).run();
  const row=await this.db.prepare('SELECT payload_hash,complete FROM robot_visual_evidence WHERE object_key=?').bind(key).first();if(row.payload_hash!==hash)throw Error('immutable_evidence_conflict');if(row.complete)return;
  const parts=[];for(let i=0;i<raw.length;i+=200000)parts.push(this.db.prepare('INSERT OR IGNORE INTO robot_visual_evidence_chunks(object_key,part,data) VALUES(?,?,?)').bind(key,Math.floor(i/200000),raw.slice(i,i+200000)));
  parts.push(this.db.prepare('UPDATE robot_visual_evidence SET complete=1 WHERE object_key=? AND payload_hash=?').bind(key,hash));await this.db.batch(parts);
 }
 async get(key){
  const row=await this.db.prepare('SELECT binary,metadata_json FROM robot_visual_evidence WHERE object_key=? AND complete=1').bind(key).first();if(!row)return null;
  const {results}=await this.db.prepare('SELECT data FROM robot_visual_evidence_chunks WHERE object_key=? ORDER BY part').bind(key).all();const raw=results.map(x=>x.data).join(''),bytes=row.binary?Uint8Array.from(atob(raw),c=>c.charCodeAt(0)):new TextEncoder().encode(raw),meta=JSON.parse(row.metadata_json);
  return {body:bytes,httpMetadata:meta.httpMetadata,customMetadata:meta.customMetadata,arrayBuffer:async()=>bytes.buffer};
 }
 async list({prefix='',limit=1000,cursor}={}){
  const {results}=await this.db.prepare('SELECT object_key AS key,size,metadata_json FROM robot_visual_evidence WHERE complete=1 AND object_key LIKE ? AND object_key>? ORDER BY object_key LIMIT ?').bind(prefix+'%',cursor||'',limit+1).all();const truncated=results.length>limit,rows=results.slice(0,limit);return {objects:rows.map(x=>({...x,...JSON.parse(x.metadata_json)})),truncated,cursor:truncated?rows.at(-1).key:undefined};
 }
}
export const evidenceBucket=env=>env.EVIDENCE||new D1EvidenceBucket(env.WORK_DB);
