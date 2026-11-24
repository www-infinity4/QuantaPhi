// Offline rehearsal of the Brain's existing durable reservation storage API.
// Only a dedicated private database and trusted in-process callbacks; not an
// authentication adapter, queue writer, network service or production lease.
import {DatabaseSync} from 'node:sqlite';
import {lstatSync,openSync,closeSync,constants} from 'node:fs';

export function openPortableBrainState(dbPath){
 if(typeof dbPath!=='string'||!dbPath||dbPath===':memory:')throw Error('private_state_path_required');
 try{closeSync(openSync(dbPath,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY,0o600));}
 catch(error){if(error.code!=='EEXIST')throw error;}
 const info=lstatSync(dbPath);
 if(!info.isFile()||(info.mode&0o077)!==0)throw Error('private_state_file_required');
 const db=new DatabaseSync(dbPath);
 try{
  // A separate state file only; never add a table to a live ticket/mesh DB.
  if(db.prepare("SELECT name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' AND NOT (type='table' AND name='portable_brain_state') LIMIT 1").get())throw Error('dedicated_state_database_required');
  db.exec('PRAGMA busy_timeout=0; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS portable_brain_state (key TEXT PRIMARY KEY,value TEXT NOT NULL)');
 }catch(error){db.close();throw error;}
 let tail=Promise.resolve(),closed=false;
 const enqueue=fn=>{const result=tail.then(fn);tail=result.catch(()=>{});return result;};
 const ensureOpen=()=>{if(closed)throw Error('state_closed');};
 const validKey=key=>{if(typeof key!=='string'||!key||key.length>1024)throw Error('invalid_state_key');return key;};
 const get=key=>{const row=db.prepare('SELECT value FROM portable_brain_state WHERE key=?').get(validKey(key));return row?JSON.parse(row.value):undefined;};
 const put=(key,value)=>{const json=JSON.stringify(value);if(typeof json!=='string')throw Error('invalid_state_value');db.prepare('INSERT INTO portable_brain_state(key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(validKey(key),json);};
 const del=key=>db.prepare('DELETE FROM portable_brain_state WHERE key=?').run(validKey(key)).changes>0;
 const list=({prefix=''}={})=>{if(typeof prefix!=='string'||prefix.length>1024)throw Error('invalid_state_prefix');return new Map(db.prepare('SELECT key,value FROM portable_brain_state WHERE substr(key,1,length(?))=? ORDER BY key').all(prefix,prefix).map(row=>[row.key,JSON.parse(row.value)]));};
 const ops={get,put,delete:del,list};
 const state=Object.fromEntries(Object.entries(ops).map(([name,fn])=>[name,(...args)=>enqueue(()=>{ensureOpen();return fn(...args);})]));
 // Callbacks must use only tx methods, never outer state or network calls.
 // BEGIN IMMEDIATE serializes reservation writes; a competing connection
 // fails closed on SQLITE_BUSY instead of waiting inside an async callback.
 state.transaction=callback=>enqueue(async()=>{
  ensureOpen();db.exec('BEGIN IMMEDIATE');let active=true;
  const tx=Object.freeze(Object.fromEntries(Object.entries(ops).map(([name,fn])=>[name,async(...args)=>{if(!active)throw Error('transaction_closed');return fn(...args);}])));
  try{const result=await callback(tx);active=false;db.exec('COMMIT');return result;}
  catch(error){active=false;try{db.exec('ROLLBACK');}catch{closed=true;db.close();}throw error;}
 });
 state.close=()=>enqueue(()=>{if(!closed){closed=true;db.close();}});
 return Object.freeze(state);
}
