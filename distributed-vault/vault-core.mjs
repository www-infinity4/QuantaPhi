// Infinity Consent Shards v1 — owner-side file encryption and fragment planning.
// Node 22 built-ins only; no network, automatic device storage, or public key upload.
import {createCipheriv,createDecipheriv,createHash,randomBytes,randomInt,randomUUID} from 'node:crypto';
const SCHEME='encrypted-n-of-n/v1';
const MAX_SHARDS=4096;
const MAX_FILE_BYTES=64*1024*1024;
const sha256=b=>createHash('sha256').update(b).digest('hex');
const fail=msg=>{throw new Error(msg)};
const asBuffer=value=>Buffer.isBuffer(value)?value: value instanceof Uint8Array?Buffer.from(value):fail('expected binary bytes');
const validCount=n=>Number.isSafeInteger(n)&&n>=2&&n<=MAX_SHARDS;
const base64value=text=>typeof text==='string'&&/^[A-Za-z0-9+/]*={0,2}$/.test(text)&&text.length%4===0;
const decode=(text,label)=>{
 if(!base64value(text))fail(label+' invalid base64');
 return Buffer.from(text,'base64');
};
const sliceBoundary=(bytes,index,total)=>Math.floor(bytes*index/total);
function validateManifest(m){
 if(!m||m.scheme!==SCHEME||m.algorithm!=='aes-256-gcm'||
    !validCount(m.requiredShards)||!Number.isSafeInteger(m.originalBytes)||
    m.originalBytes<0||m.originalBytes>MAX_FILE_BYTES||
    !Number.isSafeInteger(m.ciphertextBytes)||
    m.ciphertextBytes!==Math.max(m.originalBytes,m.requiredShards)+16||
    typeof m.fileId!=='string'||!/^[0-9a-f-]{36}$/.test(m.fileId)||
    decode(m.iv,'iv').length!==12||
    !/^[0-9a-f]{64}$/.test(m.ciphertextSha256||'')||
    !Array.isArray(m.shardSha256)||m.shardSha256.length!==m.requiredShards||
    !m.shardSha256.every(s=>typeof s==='string'&&/^[0-9a-f]{64}$/.test(s)))fail('invalid manifest');
 return m;
}
/**
 * Full file encryption first, then N distinct cipher fragments. The owner-held
 * key is NEVER put in the manifest or any fragment. All N indices are required.
 * No claim of fault tolerance, threshold secret sharing, or remote persistence.
 */
export function packFile(bytes,{shards=1000}={}){
 const plain=asBuffer(bytes);
 if(!validCount(shards))fail('shards must be from 2 to 4096');
 if(plain.length>MAX_FILE_BYTES)fail('file exceeds 64 MiB prototype bound');
 const key=randomBytes(32),iv=randomBytes(12),fileId=randomUUID();
 const padded=Buffer.alloc(Math.max(plain.length,shards));
 plain.copy(padded);
 const cipher=createCipheriv('aes-256-gcm',key,iv);
 const encrypted=Buffer.concat([cipher.update(padded),cipher.final(),cipher.getAuthTag()]);
 const fragments=[],hashes=[];
 for(let index=0;index<shards;index++){
  const data=encrypted.subarray(sliceBoundary(encrypted.length,index,shards),sliceBoundary(encrypted.length,index+1,shards));
  const digest=sha256(data);
  hashes.push(digest);
  fragments.push({fileId,index,total:shards,sha256:digest,data:data.toString('base64')});
 }
 const manifest=validateManifest({
  scheme:SCHEME,algorithm:'aes-256-gcm',fileId,requiredShards:shards,
  originalBytes:plain.length,ciphertextBytes:encrypted.length,
  iv:iv.toString('base64'),ciphertextSha256:sha256(encrypted),shardSha256:hashes
 });
 return {manifest,fragments,key};
}
export function restoreFile(manifest,fragments,keyBytes){
 const m=validateManifest(manifest);
 const key=asBuffer(keyBytes);
 if(key.length!==32)fail('key must contain exactly 32 bytes');
 if(!Array.isArray(fragments))fail('missing shard fragments');
 const received=new Map();
 for(const item of fragments){
  if(!item||item.fileId!==m.fileId)fail('fileId mismatch');
  if(!Number.isInteger(item.index)||item.index<0||item.index>=m.requiredShards||
     item.total!==m.requiredShards)fail('invalid shard index or total');
  if(received.has(item.index))fail('duplicate shard '+item.index);
  const bytes=decode(item.data,'shard');
  const expectedLength=sliceBoundary(m.ciphertextBytes,item.index+1,m.requiredShards)-
   sliceBoundary(m.ciphertextBytes,item.index,m.requiredShards);
  if(bytes.length!==expectedLength||sha256(bytes)!==m.shardSha256[item.index]||
     item.sha256!==m.shardSha256[item.index])fail('shard integrity mismatch '+item.index);
  received.set(item.index,bytes);
 }
 for(let i=0;i<m.requiredShards;i++)if(!received.has(i))fail('missing shard '+i);
 const encrypted=Buffer.concat(Array.from({length:m.requiredShards},(_,i)=>received.get(i)));
 if(sha256(encrypted)!==m.ciphertextSha256)fail('ciphertext integrity mismatch');
 const iv=decode(m.iv,'iv'),decipher=createDecipheriv('aes-256-gcm',key,iv);
 decipher.setAuthTag(encrypted.subarray(encrypted.length-16));
 try{
  const plaintext=Buffer.concat([decipher.update(encrypted.subarray(0,-16)),decipher.final()]);
  return plaintext.subarray(0,m.originalBytes);
 }catch{fail('ciphertext authentication failed');}
}
/**
 * App-owned cache instances only (like ordinary app data, not user files).
 * A device receives at most one shard per file, even with replicas. No network send occurs.
 * The coordinator must verify real app installations and their reported capacity.
 */
export function planPlacement(manifest,volunteers,{replicas=1}={}){
 const m=validateManifest(manifest);
 if(!Number.isSafeInteger(replicas)||replicas<1||replicas>4)fail('replicas must be 1 to 4');
 if(!Array.isArray(volunteers))fail('volunteers must be a list');
 const maxBytes=Math.ceil(m.ciphertextBytes/m.requiredShards);
 const seen=new Set(),eligible=[];
 for(const device of volunteers){
  if(!device||device.appCacheReady!==true)continue;
  const id=device.id;
  if(typeof id!=='string'||!/^[a-zA-Z0-9_.:-]{1,96}$/.test(id))fail('invalid device id');
  if(seen.has(id))fail('duplicate device id');
  seen.add(id);
  if(Number.isSafeInteger(device.maxShardBytes)&&device.maxShardBytes>=maxBytes)
   eligible.push(id);
 }
 const needed=m.requiredShards*replicas;
 if(eligible.length<needed)fail('not enough app-cache eligible devices: need '+needed+', have '+eligible.length);
 // Cryptographically randomized assignment; never assign two shards to one device.
 for(let i=eligible.length-1;i>0;i--){
  const j=randomInt(i+1);
  [eligible[i],eligible[j]]=[eligible[j],eligible[i]];
 }
 const assignments=Array.from({length:m.requiredShards},(_,index)=>({
  shardIndex:index,deviceIds:eligible.slice(index*replicas,(index+1)*replicas)
 }));
 return {scheme:'app-cache-placement/v1',fileId:m.fileId,requiredShards:m.requiredShards,replicas,assignments};
}
