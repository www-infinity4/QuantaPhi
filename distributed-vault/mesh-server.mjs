// Owner-hosted Infinity encrypted-fragment coordinator.
// SOURCE lives in GitHub; private SQLite state lives on the owner's machine.
// Node >=22 with built-in node:sqlite (experimental in Node 22); no npm.
// No D1, wallet, OAuth, domain or secret values are changed by this module.
import {createServer as createHttpServer} from 'node:http';
import {createServer as createHttpsServer} from 'node:https';
import {DatabaseSync} from 'node:sqlite';
import {randomBytes,randomUUID,createHash,timingSafeEqual} from 'node:crypto';
import {mkdirSync,readFileSync} from 'node:fs';
import {dirname} from 'node:path';

const MAX_BODY=1_400_000; // Encrypted shard request bound; use small source chunks
const MAX_FILE_BYTES=64*1024*1024;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEX=/^[0-9a-f]{64}$/;
const LOOPBACK=new Set(['127.0.0.1','::1','localhost']);
const digest=value=>createHash('sha256').update(value).digest('hex');
const hashToken=token=>digest(Buffer.from(token,'utf8'));
const matches=(stored,provided)=>{
 if(typeof stored!=='string'||typeof provided!=='string'||!HEX.test(stored))return false;
 const a=Buffer.from(stored,'hex'),b=Buffer.from(hashToken(provided),'hex');
 return timingSafeEqual(a,b);
};
const requireTrue=(ok,message,status=422)=>{if(!ok)throw Object.assign(Error(message),{status});};
const definedKeys=(record,allow)=>record&&typeof record==='object'&&!Array.isArray(record)&&Object.keys(record).every(k=>allow.includes(k));
const exactBase64=value=>typeof value==='string'&&value.length%4===0&&/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value);
const partSize=(total,index,number)=>Math.floor(total*(index+1)/number)-Math.floor(total*index/number);
function validManifest(m){
 requireTrue(definedKeys(m,['scheme','algorithm','fileId','requiredShards','originalBytes','ciphertextBytes','iv','ciphertextSha256','shardSha256']),'invalid manifest');
 requireTrue(m.scheme==='encrypted-n-of-n/v1'&&m.algorithm==='aes-256-gcm'&&UUID.test(m.fileId||''),'invalid manifest');
 requireTrue(Number.isSafeInteger(m.requiredShards)&&m.requiredShards>=2&&m.requiredShards<=4096,'invalid manifest');
 requireTrue(Number.isSafeInteger(m.originalBytes)&&m.originalBytes>=0&&m.originalBytes<=MAX_FILE_BYTES,'invalid manifest');
 requireTrue(m.ciphertextBytes===Math.max(m.originalBytes,m.requiredShards)+16,'invalid manifest');
 requireTrue(exactBase64(m.iv)&&Buffer.from(m.iv,'base64').length===12,'invalid manifest');
 requireTrue(HEX.test(m.ciphertextSha256||'')&&Array.isArray(m.shardSha256)&&
  m.shardSha256.length===m.requiredShards&&m.shardSha256.every(x=>HEX.test(x)),'invalid manifest');
 return m;
}
async function jsonBody(req){
 requireTrue(String(req.headers['content-type']||'').startsWith('application/json'),'JSON body required',415);
 const parts=[];let length=0;
 for await(const chunk of req){
  length+=chunk.length;
  requireTrue(length<=MAX_BODY,'request size limit exceeded',413);
  parts.push(chunk);
 }
 try{return JSON.parse(Buffer.concat(parts).toString('utf8'))}
 catch{throw Object.assign(Error('invalid JSON'),{status:400})}
}
function send(res,status,data){
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
 res.end(JSON.stringify(data));
}
export function createMeshServer({dbPath,ownerToken,host='127.0.0.1',replicas=2,peerTtlMs=120000,now=Date.now,tls=null}={}){
 requireTrue(typeof dbPath==='string'&&dbPath.length>0,'dbPath required');
 requireTrue(typeof ownerToken==='string'&&Buffer.byteLength(ownerToken)>=32,'owner token must have 32+ bytes');
 requireTrue(Number.isInteger(replicas)&&replicas>=1&&replicas<=4,'replicas must be 1..4');
 requireTrue(Number.isSafeInteger(peerTtlMs)&&peerTtlMs>=1000,'invalid peer TTL');
 requireTrue(typeof now==='function','invalid clock');
 requireTrue(LOOPBACK.has(host)||Boolean(tls?.key&&tls?.cert),'TLS required for non-loopback server');
 if(dbPath!==':memory:')mkdirSync(dirname(dbPath),{recursive:true,mode:0o700});
 const db=new DatabaseSync(dbPath);
 db.exec(`
 PRAGMA journal_mode=WAL;
 PRAGMA foreign_keys=ON;
 CREATE TABLE IF NOT EXISTS mesh_files (
  file_id TEXT PRIMARY KEY, manifest TEXT NOT NULL, created_at INTEGER NOT NULL
 );
 CREATE TABLE IF NOT EXISTS mesh_shards (
  file_id TEXT NOT NULL, shard_index INTEGER NOT NULL, hash TEXT NOT NULL,
  data TEXT NOT NULL, bytes INTEGER NOT NULL,
  PRIMARY KEY(file_id,shard_index),
  FOREIGN KEY(file_id) REFERENCES mesh_files(file_id)
 );
 CREATE TABLE IF NOT EXISTS mesh_nodes (
  node_id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE,
  capacity INTEGER NOT NULL, online INTEGER NOT NULL, last_seen INTEGER NOT NULL
 );
 CREATE TABLE IF NOT EXISTS mesh_placements (
  file_id TEXT NOT NULL, shard_index INTEGER NOT NULL, node_id TEXT NOT NULL,
  acked INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(file_id,shard_index,node_id),
  FOREIGN KEY(file_id,shard_index) REFERENCES mesh_shards(file_id,shard_index),
  FOREIGN KEY(node_id) REFERENCES mesh_nodes(node_id)
 );
 CREATE INDEX IF NOT EXISTS idx_mesh_place_node ON mesh_placements(node_id,acked);
 CREATE TABLE IF NOT EXISTS mesh_avoid (
   file_id TEXT NOT NULL, node_id TEXT NOT NULL, until_ms INTEGER NOT NULL,
   PRIMARY KEY(file_id,node_id)
 );
 `);
 const ownerHash=hashToken(ownerToken);
 function tokenFrom(req){
  const raw=req.headers.authorization;
  return typeof raw==='string'&&raw.startsWith('Bearer ')?raw.slice(7):'';
 }
 function authorize(req,kind){
  const provided=tokenFrom(req);
  requireTrue(provided.length>0,'unauthorized',401);
  if(kind==='owner'){
   requireTrue(matches(ownerHash,provided),'unauthorized',401);
   return {owner:true};
  }
  const row=db.prepare('SELECT * FROM mesh_nodes WHERE token_hash=?').get(hashToken(provided));
  requireTrue(row&&row.online===1,'unauthorized node',401);
  return row;
 }
 const readManifest=fileId=>{
  const row=db.prepare('SELECT manifest FROM mesh_files WHERE file_id=?').get(fileId);
  requireTrue(row,'unknown file',404);
  return JSON.parse(row.manifest);
 };
 const activeCutoff=()=>now()-peerTtlMs;
 function repair(){
  const cutoff=activeCutoff();
  db.prepare('DELETE FROM mesh_placements WHERE node_id IN (SELECT node_id FROM mesh_nodes WHERE online=0 OR last_seen<?)').run(cutoff);
  db.prepare('DELETE FROM mesh_avoid WHERE until_ms<=?').run(now());
  const nodes=db.prepare('SELECT node_id, capacity FROM mesh_nodes WHERE online=1 AND last_seen>=? ORDER BY rowid').all(cutoff);
  const files=db.prepare('SELECT file_id,manifest FROM mesh_files ORDER BY created_at').all();
  for(const row of files){
   const manifest=JSON.parse(row.manifest);
   const count=db.prepare('SELECT count(*) n FROM mesh_shards WHERE file_id=?').get(row.file_id).n;
   if(count!==manifest.requiredShards)continue; // no partial encrypted file
   const placements=db.prepare('SELECT node_id,shard_index FROM mesh_placements WHERE file_id=?').all(row.file_id);
   // When a phone reports that it dumped one file's cache, do not immediately
   // place the same file back on that phone. Prefer another live app instance.
   const avoided=db.prepare('SELECT node_id FROM mesh_avoid WHERE file_id=? AND until_ms>?')
     .all(row.file_id,now()).map(x=>x.node_id);
   const used=new Set([...placements.map(x=>x.node_id),...avoided]);
   const counts=Array(manifest.requiredShards).fill(0);
   for(const p of placements)counts[p.shard_index]++;
   const bytes=db.prepare('SELECT shard_index,bytes FROM mesh_shards WHERE file_id=?').all(row.file_id);
   for(const shard of bytes){
    for(let i=counts[shard.shard_index];i<replicas;i++){
     const node=nodes.find(n=>!used.has(n.node_id)&&n.capacity>=shard.bytes);
     if(!node)break;
     db.prepare('INSERT OR IGNORE INTO mesh_placements(file_id,shard_index,node_id) VALUES(?,?,?)').run(row.file_id,shard.shard_index,node.node_id);
     used.add(node.node_id);
    }
   }
  }
 }
 function stats(){
  repair();
  const files=db.prepare('SELECT file_id,manifest FROM mesh_files ORDER BY created_at').all();
  return files.map(row=>{
   const m=JSON.parse(row.manifest);
   const slots=db.prepare('SELECT shard_index,acked FROM mesh_placements WHERE file_id=?').all(row.file_id);
   const acked=Array(m.requiredShards).fill(0);
   for(const s of slots)if(s.acked===1)acked[s.shard_index]++;
   const shardCount=db.prepare('SELECT count(*) n FROM mesh_shards WHERE file_id=?').get(row.file_id).n;
   return {fileId:row.file_id,expectedShards:m.requiredShards,uploadedShards:shardCount,
    ackedReplicas:acked.reduce((a,b)=>a+b,0),
    underReplicated:acked.reduce((n,c)=>n+Math.max(0,replicas-c),0),targetReplicas:replicas};
  });
 }
 async function handle(req,res){
  const path=new URL(req.url||'/', 'http://loopback.invalid').pathname;
  if(req.method==='GET'&&path==='/health')return send(res,200,{ok:true,service:'infinity-mesh-local-v1'});
  // Same-origin installed app page and modules; no public cross-origin
  // credential access. CSP blocks inline scripts and third-party code.
  const staticFiles={
    '/app': ['mesh-app.html','text/html; charset=utf-8'],
    '/app/mesh-peer.mjs': ['mesh-peer.mjs','text/javascript; charset=utf-8'],
    '/app/app-cache.mjs': ['app-cache.mjs','text/javascript; charset=utf-8']
  };
  if(req.method==='GET'&&Object.hasOwn(staticFiles,path)){
   const [file,contentType]=staticFiles[path];
   const bytes=readFileSync(new URL('./'+file,import.meta.url));
   res.writeHead(200,{'Content-Type':contentType,'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
    'Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"});
   res.end(bytes);return;
  }
  const isOwner=path.startsWith('/v1/owner/');
  const isNode=path.startsWith('/v1/node/');
  requireTrue(isOwner||isNode,'not found',404);
  const caller=authorize(req,isOwner?'owner':'node');
  if(req.method==='POST'&&path==='/v1/owner/nodes'){
   const body=await jsonBody(req);
   requireTrue(definedKeys(body,['capacityBytes'])&&Number.isSafeInteger(body.capacityBytes)&&
    body.capacityBytes>=1&&body.capacityBytes<=64*1024*1024,'invalid node capacity');
   const token=randomBytes(32).toString('base64url'),nodeId=randomUUID();
   db.prepare('INSERT INTO mesh_nodes(node_id,token_hash,capacity,online,last_seen) VALUES(?,?,?,?,?)')
    .run(nodeId,hashToken(token),body.capacityBytes,1,now());
   repair();
   return send(res,201,{nodeId,token,warning:'Deliver token privately. Not for GitHub, logs, or public page.'});
  }
  if(req.method==='POST'&&path==='/v1/owner/manifests'){
   const manifest=validManifest(await jsonBody(req));
   const original=db.prepare('SELECT manifest FROM mesh_files WHERE file_id=?').get(manifest.fileId);
   if(original){
    requireTrue(original.manifest===JSON.stringify(manifest),'file manifest conflict',409);
    return send(res,200,{fileId:manifest.fileId,alreadyExists:true});
   }
   db.prepare('INSERT INTO mesh_files(file_id,manifest,created_at) VALUES(?,?,?)')
    .run(manifest.fileId,JSON.stringify(manifest),now());
   return send(res,201,{fileId:manifest.fileId});
  }
  const shardMatch=path.match(/^\/v1\/owner\/shards\/([0-9a-f-]{36})\/(\d{1,4})$/);
  if(req.method==='PUT'&&shardMatch){
   const [_,fileId,encodedIndex]=shardMatch;
   const m=readManifest(fileId),index=Number(encodedIndex);
   requireTrue(index>=0&&index<m.requiredShards,'invalid shard index');
   const part=await jsonBody(req);
   requireTrue(definedKeys(part,['fileId','index','total','sha256','data'])&&
    part.fileId===fileId&&part.index===index&&part.total===m.requiredShards&&
    part.sha256===m.shardSha256[index]&&exactBase64(part.data),'shard integrity invalid');
   const blob=Buffer.from(part.data,'base64'),expected=partSize(m.ciphertextBytes,index,m.requiredShards);
   requireTrue(blob.length===expected&&digest(blob)===part.sha256,'shard integrity invalid');
   const original=db.prepare('SELECT hash FROM mesh_shards WHERE file_id=? AND shard_index=?').get(fileId,index);
   if(original){
    requireTrue(original.hash===part.sha256,'shard conflict',409);
    return send(res,200,{stored:true,alreadyExists:true});
   }
   db.prepare('INSERT INTO mesh_shards(file_id,shard_index,hash,data,bytes) VALUES(?,?,?,?,?)')
    .run(fileId,index,part.sha256,part.data,blob.length);
   repair();
   return send(res,201,{stored:true,fileId,index});
  }
  const getFile=path.match(/^\/v1\/owner\/files\/([0-9a-f-]{36})$/);
  if(req.method==='GET'&&getFile){
   const fileId=getFile[1],manifest=readManifest(fileId);
   const records=db.prepare('SELECT shard_index,hash,data FROM mesh_shards WHERE file_id=? ORDER BY shard_index').all(fileId);
   requireTrue(records.length===manifest.requiredShards,'incomplete encrypted file',409);
   return send(res,200,{manifest,fragments:records.map(x=>({fileId,index:x.shard_index,
     total:manifest.requiredShards,sha256:x.hash,data:x.data}))});
  }
  if(req.method==='GET'&&path==='/v1/owner/status')
   return send(res,200,{files:stats(),storage:'owner-private-SQLite',network:'live-only-while-app-open'});
  if(req.method==='POST'&&path==='/v1/owner/repair'){
   repair();return send(res,200,{files:stats()});
  }
  if(req.method==='POST'&&path==='/v1/node/heartbeat'){
   const body=await jsonBody(req);
   requireTrue(definedKeys(body,['inventory'])&&Array.isArray(body.inventory)&&body.inventory.length<=4096,'invalid inventory');
   const listed=new Set();
   for(const x of body.inventory){
    requireTrue(definedKeys(x,['fileId','index','sha256'])&&UUID.test(x.fileId||'')&&
     Number.isInteger(x.index)&&x.index>=0&&x.index<4096&&HEX.test(x.sha256||''),'invalid inventory');
    listed.add(x.fileId+':'+x.index+':'+x.sha256);
   }
   const receipts=db.prepare('SELECT p.file_id,p.shard_index,s.hash FROM mesh_placements p JOIN mesh_shards s ON s.file_id=p.file_id AND s.shard_index=p.shard_index WHERE p.node_id=?').all(caller.node_id);
   let invalidated=0;
   for(const receipt of receipts)
    if(!listed.has(receipt.file_id+':'+receipt.shard_index+':'+receipt.hash)){
     db.prepare('DELETE FROM mesh_placements WHERE node_id=? AND file_id=? AND shard_index=?')
      .run(caller.node_id,receipt.file_id,receipt.shard_index);
     db.prepare('INSERT INTO mesh_avoid(file_id,node_id,until_ms) VALUES(?,?,?) ON CONFLICT(file_id,node_id) DO UPDATE SET until_ms=excluded.until_ms')
      .run(receipt.file_id,caller.node_id,now()+peerTtlMs);
     invalidated++;
    }
   db.prepare('UPDATE mesh_nodes SET last_seen=? WHERE node_id=?').run(now(),caller.node_id);
   repair();
   return send(res,200,{active:true,invalidated});
  }
  if(req.method==='GET'&&path==='/v1/node/next'){
   db.prepare('UPDATE mesh_nodes SET last_seen=? WHERE node_id=?').run(now(),caller.node_id);
   repair();
   const row=db.prepare(`SELECT s.file_id,s.shard_index,s.hash,s.data,m.manifest FROM mesh_placements p
     JOIN mesh_shards s ON s.file_id=p.file_id AND s.shard_index=p.shard_index
     JOIN mesh_files m ON m.file_id=s.file_id
     WHERE p.node_id=? AND p.acked=0 ORDER BY s.file_id,s.shard_index LIMIT 1`).get(caller.node_id);
   if(!row)return send(res,200,{fragment:null});
   return send(res,200,{fragment:{fileId:row.file_id,index:row.shard_index,
    total:JSON.parse(row.manifest).requiredShards,sha256:row.hash,data:row.data}});
  }
  if(req.method==='POST'&&path==='/v1/node/ack'){
   const body=await jsonBody(req);
   requireTrue(definedKeys(body,['fileId','index','sha256'])&&UUID.test(body.fileId||'')&&
    Number.isInteger(body.index)&&body.index>=0&&body.index<4096&&HEX.test(body.sha256||''),'invalid receipt');
   const row=db.prepare(`SELECT s.hash FROM mesh_placements p JOIN mesh_shards s
    ON s.file_id=p.file_id AND s.shard_index=p.shard_index
    WHERE p.node_id=? AND p.file_id=? AND p.shard_index=?`).get(caller.node_id,body.fileId,body.index);
   requireTrue(row&&row.hash===body.sha256,'unassigned or invalid receipt',409);
   db.prepare('UPDATE mesh_placements SET acked=1 WHERE node_id=? AND file_id=? AND shard_index=?')
    .run(caller.node_id,body.fileId,body.index);
   return send(res,200,{acknowledged:true});
  }
  throw Object.assign(Error('not found'),{status:404});
 }
 const server=(tls?createHttpsServer(tls,(req,res)=>void handle(req,res).catch(e=>send(res,e.status||500,{error:e.status?e.message:'internal error'}))):
  createHttpServer((req,res)=>void handle(req,res).catch(e=>send(res,e.status||500,{error:e.status?e.message:'internal error'}))));
 let closed=false,started=false;
 return {
  server,
  async listen(port=0){
   requireTrue(!closed&&!started,'server not available');
   await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,()=>{server.off('error',reject);resolve()})});
   started=true;
   const address=server.address();
   return (tls?'https':'http')+'://'+(host==='::1'?'[::1]':host)+':'+address.port;
  },
  async close(){
   if(closed)return;
   if(started)await new Promise((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
   db.close();closed=true;
  }
 };
}
