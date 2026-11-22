// Application-owned encrypted fragment cache. No network sends, no global phone
// storage access, no user file reads, no polling/background execution.
// Fragment content is encrypted by vault-core BEFORE this module sees it.
const DEFAULT_LIMIT=8*1024*1024;
const DEFAULT_RETENTION=7*24*3600*1000;
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HASH=/^[0-9a-f]{64}$/;
const ALLOWED=['fileId','index','total','sha256','data'];
const fail=s=>{throw new Error(s)};
function toBytes(text){
 if(typeof text!=='string'||!text.length||text.length%4!==0||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text))fail('invalid encrypted shard base64');
 try{return Uint8Array.from(atob(text),x=>x.charCodeAt(0));}
 catch{fail('invalid encrypted shard base64');}
}
function recordPart(r){
 return {fileId:r.fileId,index:r.index,total:r.total,sha256:r.sha256,data:r.data};
}
async function verifiedFragment(f){
 if(!f||typeof f!=='object'||Array.isArray(f)||Object.keys(f).some(k=>!ALLOWED.includes(k)))fail('unexpected field on encrypted fragment');
 if(!ID.test(f.fileId||'')||!Number.isSafeInteger(f.index)||!Number.isSafeInteger(f.total)||
    f.total<2||f.total>4096||f.index<0||f.index>=f.total||!HASH.test(f.sha256||''))fail('invalid encrypted shard');
 const bytes=toBytes(f.data);
 if(bytes.byteLength<1)fail('invalid empty shard');
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 if(digest!==f.sha256)fail('encrypted shard integrity mismatch');
 return bytes.byteLength;
}
export function createMemoryShardStore(){
 const records=new Map();
 return {
  async list(){return [...records.values()].map(r=>({...r}));},
  async get(key){const value=records.get(key);return value?{...value}:null;},
  async put(record){records.set(record.key,{...record});},
  async delete(key){records.delete(key);},
  async clear(){records.clear();}
 };
}
/**
 * IndexedDB is sandboxed by browser origin. An installed PWA gets the same
 * origin-scoped application data, cleared with normal Clear Site/App Storage.
 * No contact, camera, photos, location, device file system, or network access.
 */
export async function openBrowserShardStore({indexedDB=globalThis.indexedDB,dbName='infinity-app-fragments-v1'}={}){
 if(!indexedDB||typeof indexedDB.open!=='function')fail('IndexedDB unavailable');
 const db=await new Promise((resolve,reject)=>{
  const req=indexedDB.open(dbName,1);
  req.onupgradeneeded=()=>{
   if(!req.result.objectStoreNames.contains('fragments'))req.result.createObjectStore('fragments',{keyPath:'key'});
  };
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error('indexeddb open failed'));
  req.onblocked=()=>reject(Error('indexeddb upgrade blocked'));
 });
 const perform=(mode,op)=>new Promise((resolve,reject)=>{
  let result;
  const tx=db.transaction('fragments',mode);
  const request=op(tx.objectStore('fragments'));
  request.onsuccess=()=>{result=request.result;};
  tx.oncomplete=()=>resolve(result);
  tx.onerror=()=>reject(tx.error||Error('indexeddb transaction failed'));
  tx.onabort=()=>reject(tx.error||Error('indexeddb transaction aborted'));
 });
 return {
  list:()=>perform('readonly',s=>s.getAll()),
  get:key=>perform('readonly',s=>s.get(key)),
  put:record=>perform('readwrite',s=>s.put(record)),
  delete:key=>perform('readwrite',s=>s.delete(key)),
  clear:()=>perform('readwrite',s=>s.clear()),
  close:()=>db.close()
 };
}
/**
 * App-cache policy (normal application-managed local data):
 * - app instance chooses enabled/disabled as an app setting;
 * - each fragment is bounded and expires; users can clear app storage;
 * - never record plaintext or decryption keys;
 * - no per-fragment prompts or background phone activity.
 * A coordinator may later use usage() to advertise capacity, but this module
 * never uploads or receives anything over a network on its own.
 */
export class AppShardCache {
 constructor({store,limitBytes=DEFAULT_LIMIT,retentionMs=DEFAULT_RETENTION,now=Date.now,enabled=true}={}){
  if(!store||!['list','get','put','delete','clear'].every(k=>typeof store[k]==='function'))fail('invalid app cache store');
  if(!Number.isSafeInteger(limitBytes)||limitBytes<1||limitBytes>1024*1024*1024)fail('invalid app cache size limit');
  if(!Number.isSafeInteger(retentionMs)||retentionMs<1)fail('invalid app cache retention');
  if(typeof now!=='function')fail('invalid app cache clock');
  this.store=store;this.limitBytes=limitBytes;this.retentionMs=retentionMs;this.now=now;this.enabled=enabled===true;
 }
 async sweep(){
  const stamp=this.now();
  for(const entry of await this.store.list())
   if(!Number.isFinite(entry.storedAt)||entry.storedAt+this.retentionMs<=stamp||entry.storedAt>stamp+60000)
    await this.store.delete(entry.key);
 }
 async usage(){
  await this.sweep();
  const all=await this.store.list();
  return {entries:all.length,bytes:all.reduce((sum,r)=>sum+r.bytes,0),limitBytes:this.limitBytes,enabled:this.enabled};
 }
 async put(fragment){
  if(!this.enabled)return {stored:false,reason:'app-cache-disabled'};
  const size=await verifiedFragment(fragment);
  if(size>this.limitBytes)fail('encrypted shard exceeds app cache capacity');
  await this.sweep();
  const key=fragment.fileId+':'+fragment.index;
  const previous=await this.store.get(key);
  if(previous&&previous.sha256!==fragment.sha256)fail('encrypted shard conflict');
  const others=(await this.store.list()).filter(r=>r.key!==key)
   .sort((a,b)=>a.storedAt-b.storedAt||a.key.localeCompare(b.key));
  let usage=others.reduce((sum,r)=>sum+r.bytes,0);
  for(const entry of others){
   if(usage+size<=this.limitBytes)break;
   await this.store.delete(entry.key);
   usage-=entry.bytes;
  }
  await this.store.put({key,...recordPart(fragment),storedAt:this.now(),bytes:size});
  return {stored:true,fileId:fragment.fileId,index:fragment.index,bytes:size};
 }
 async get(fileId,index){
  if(!this.enabled)return null;
  await this.sweep();
  const entry=await this.store.get(fileId+':'+index);
  if(!entry)return null;
  try{await verifiedFragment(recordPart(entry));}catch{await this.store.delete(entry.key);return null;}
  return recordPart(entry);
 }
 async clear(){await this.store.clear();}
}
