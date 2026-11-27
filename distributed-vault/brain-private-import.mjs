// Private, offline staging for the existing Brain. No remote export, source
// writer fence, credential renewal, service installation or activation occurs.
import {DatabaseSync} from 'node:sqlite';
import {createHash} from 'node:crypto';
import {createReadStream,createWriteStream,openSync,closeSync,fstatSync,lstatSync,readSync,
 mkdirSync,rmSync,writeFileSync,fsyncSync,constants} from 'node:fs';
import {join} from 'node:path';
import {pipeline} from 'node:stream/promises';
import {pathToFileURL} from 'node:url';
import {openPortableBrainState} from './portable-brain-state.mjs';

const FORMAT='infinity-brain-private-state/v1',RECEIPT='infinity-brain-private-import/v1';
const sha=value=>createHash('sha256').update(value).digest('hex');
const isHash=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const ownerRequired=value=>{if(!isHash(value))throw Error('brain_import_owner_required');};
function privateDirectory(directory){
 let info;try{info=lstatSync(directory);}catch{throw Error('private_directory_required');}
 if(!info.isDirectory()||(info.mode&0o077)!==0)throw Error('private_directory_required');
}
function privateFile(file){
 let fd;
 try{
  if(typeof file!=='string'||!lstatSync(file).isFile())throw Error();
  fd=openSync(file,constants.O_RDONLY|constants.O_NOFOLLOW);
  const info=fstatSync(fd);
  if(!info.isFile()||(info.mode&0o077)!==0)throw Error();
  return fd;
 }catch{if(fd!==undefined)closeSync(fd);throw Error('private_snapshot_required');}
}
function offline(file){
 for(const suffix of ['-wal','-shm','-journal']){
  try{lstatSync(file+suffix);}catch(error){if(error.code==='ENOENT')continue;throw error;}
  throw Error('offline_snapshot_required');
 }
}
function privateJson(file,maxBytes){
 const fd=privateFile(file),chunks=[];let total=0;
 try{
  if(fstatSync(fd).size>maxBytes)throw Error('brain_import_document_too_large');
  while(true){
   const part=Buffer.alloc(Math.min(65536,maxBytes+1-total)),count=readSync(fd,part,0,part.length,null);
   if(!count)break;
   total+=count;if(total>maxBytes)throw Error('brain_import_document_too_large');chunks.push(part.subarray(0,count));
  }
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
 }catch(error){
  if(error.message==='brain_import_document_too_large')throw error;
  throw Error('brain_import_document_invalid');
 }finally{closeSync(fd);}
}
async function hashFd(fd){
 const digest=createHash('sha256');
 for await(const part of createReadStream('',{fd,autoClose:false,start:0}))digest.update(part);
 return digest.digest('hex');
}
async function privateHash(file){const fd=privateFile(file);try{return await hashFd(fd);}finally{closeSync(fd);}}
function syncFile(file){const fd=openSync(file,constants.O_RDONLY|constants.O_NOFOLLOW);try{fsyncSync(fd);}finally{closeSync(fd);}}
function jsonValues(value){
 const pending=[[value,0]];
 while(pending.length){
  const [next,depth]=pending.pop();if(depth>128)throw Error('brain_import_value_unsupported');
  if(typeof next==='number'&&!Number.isFinite(next))throw Error('brain_import_value_unsupported');
  if(next&&typeof next==='object')for(const item of Object.values(next))pending.push([item,depth+1]);
 }
}
export function validateBrainStateDocument(document,ownerHash){
 const fields=['format','ownerHash','sourceSha','snapshotId','complete','entryCount','entriesSha256','workSha256','entries'];
 if(!document||typeof document!=='object'||Array.isArray(document)||Object.keys(document).some(key=>!fields.includes(key))||
  document.format!==FORMAT||document.ownerHash!==ownerHash||document.complete!==true||
  !/^[a-f0-9]{40}$/.test(document.sourceSha||'')||!/^[A-Za-z0-9_-]{1,80}$/.test(document.snapshotId||'')||
  !isHash(document.workSha256)||!isHash(document.entriesSha256)||!Array.isArray(document.entries)||
  document.entries.length>100000||document.entryCount!==document.entries.length)throw Error('brain_import_snapshot_invalid');
 const keys=new Set();
 for(const entry of document.entries){
  if(!Array.isArray(entry)||entry.length!==2||typeof entry[0]!=='string'||!entry[0]||entry[0].length>1024||keys.has(entry[0]))
   throw Error('brain_import_snapshot_invalid');
  keys.add(entry[0]);jsonValues(entry[1]);
 }
 if(sha(JSON.stringify(document.entries))!==document.entriesSha256)throw Error('brain_import_snapshot_invalid');
 return document;
}
function workFacts(file){
 const db=new DatabaseSync(file,{readOnly:true});
 try{
  if(db.prepare('PRAGMA journal_mode').get().journal_mode!=='delete')throw Error('standalone_sqlite_snapshot_required');
  if(db.prepare('PRAGMA quick_check').get().quick_check!=='ok')throw Error('brain_import_database_invalid');
  const columns=new Set(db.prepare('PRAGMA table_info(work_tickets)').all().map(x=>x.name));
  if(['id','owner_hash','context_json','request','created_at','updated_at','status'].some(key=>!columns.has(key)))
   throw Error('brain_import_database_invalid');
  return {workTickets:db.prepare('SELECT COUNT(*) AS amount FROM work_tickets').get().amount};
 }finally{db.close();}
}
export async function inspectPrivateBrainWorkSnapshot(file){
 offline(file);const fd=privateFile(file);
 try{
  const before=fstatSync(fd);
  if(typeof process.getuid==='function'&&before.uid!==process.getuid())throw Error('private_snapshot_required');
  const facts=workFacts(file),workSha256=await hashFd(fd),after=lstatSync(file);
  offline(file);
  if(!after.isFile()||after.dev!==before.dev||after.ino!==before.ino||after.size!==before.size||
     after.mtimeMs!==before.mtimeMs)throw Error('brain_import_work_snapshot_changed');
  return {...facts,workSha256};
 }finally{closeSync(fd);}
}
function stateFacts(file,entries){
 const db=new DatabaseSync(file,{readOnly:true});
 try{
  if(db.prepare('PRAGMA quick_check').get().quick_check!=='ok')throw Error('brain_import_database_invalid');
  const amount=db.prepare('SELECT COUNT(*) AS amount FROM portable_brain_state').get().amount;
  if(entries){
   if(amount!==entries.length)throw Error('brain_import_state_mismatch');
   const get=db.prepare('SELECT value FROM portable_brain_state WHERE key=?');
   for(const [key,value] of entries)if(get.get(key)?.value!==JSON.stringify(value))throw Error('brain_import_state_mismatch');
  }
  return {stateRecords:amount};
 }finally{db.close();}
}
function bundleId(document){
 return sha(JSON.stringify([RECEIPT,document.ownerHash,document.sourceSha,document.snapshotId,document.workSha256,document.entriesSha256]));
}
function publicReceipt(directory,record,reused=false){
 return {ok:true,verified:true,status:'private_brain_import_staged',directory,workDbPath:join(directory,'work.sqlite'),statePath:join(directory,'state.sqlite'),
  bundleId:record.bundleId,workTickets:record.workTickets,stateRecords:record.stateRecords,reused,
  sourceAuthorityVerified:false,sourceFenceVerified:false,productionVerified:false,writerEnabled:false};
}
export async function verifyBrainImport({directory,ownerHash}={}){
 ownerRequired(ownerHash);
 try{
  privateDirectory(directory);
  const record=privateJson(join(directory,'receipt.json'),16384);
  if(record?.format!==RECEIPT||record.ownerHash!==ownerHash||!isHash(record.bundleId)||
   !/^[a-f0-9]{40}$/.test(record.sourceSha||'')||!/^[A-Za-z0-9_-]{1,80}$/.test(record.snapshotId||'')||
   !isHash(record.workSha256)||!isHash(record.stateSha256)||!isHash(record.entriesSha256)||
   record.sourceAuthorityVerified!==false||record.sourceFenceVerified!==false||record.productionVerified!==false||record.writerEnabled!==false||
   !Number.isSafeInteger(record.workTickets)||record.workTickets<0||!Number.isSafeInteger(record.stateRecords)||record.stateRecords<0||
   record.bundleId!==bundleId(record))throw Error();
  const work=join(directory,'work.sqlite'),state=join(directory,'state.sqlite');offline(work);offline(state);
  if(await privateHash(work)!==record.workSha256||await privateHash(state)!==record.stateSha256||
   workFacts(work).workTickets!==record.workTickets||stateFacts(state).stateRecords!==record.stateRecords)throw Error();
  return publicReceipt(directory,record);
 }catch{throw Error('brain_import_verification_failed');}
}
export async function stageBrainImport({workDbPath,exportPath,destinationRoot,ownerHash}={}){
 ownerRequired(ownerHash);privateDirectory(destinationRoot);offline(workDbPath);
 const document=validateBrainStateDocument(privateJson(exportPath,32*1024*1024),ownerHash);
 const source=privateFile(workDbPath);let directory,owned=false,state;
 try{
  if(await hashFd(source)!==document.workSha256)throw Error('brain_import_work_snapshot_mismatch');
  const expectedBundleId=bundleId(document);
  directory=join(destinationRoot,'brain-'+expectedBundleId);
  try{mkdirSync(directory,{mode:0o700});owned=true;}
  catch(error){
   if(error.code!=='EEXIST')throw error;
   const result=await verifyBrainImport({directory,ownerHash});
   if(result.bundleId!==expectedBundleId)throw Error('brain_import_verification_failed');
   return {...result,reused:true};
  }
  const work=join(directory,'work.sqlite'),statePath=join(directory,'state.sqlite');
  await pipeline(createReadStream('',{fd:source,autoClose:false,start:0}),createWriteStream(work,{flags:'wx',mode:0o600}));
  offline(workDbPath);
  if(await hashFd(source)!==document.workSha256||await privateHash(work)!==document.workSha256)throw Error('brain_import_work_snapshot_changed');
  const facts=workFacts(work);
  state=openPortableBrainState(statePath);
  await state.transaction(async tx=>{for(const [key,value] of document.entries)await tx.put(key,value);});
  await state.close();state=null;
  const counts=stateFacts(statePath,document.entries);syncFile(work);syncFile(statePath);
  const record={format:RECEIPT,ownerHash,sourceSha:document.sourceSha,snapshotId:document.snapshotId,
   bundleId:bundleId(document),workSha256:document.workSha256,stateSha256:await privateHash(statePath),entriesSha256:document.entriesSha256,
   ...facts,...counts,stagedAt:new Date().toISOString(),sourceAuthorityVerified:false,sourceFenceVerified:false,productionVerified:false,writerEnabled:false};
  // The completion marker is written last. A crash beforehand cannot produce
  // an accepted bundle; an existing incomplete directory is never overwritten.
  writeFileSync(join(directory,'receipt.json'),JSON.stringify(record,null,2)+'\n',{flag:'wx',mode:0o600});
  syncFile(join(directory,'receipt.json'));syncFile(directory);syncFile(destinationRoot);
  const verified=await verifyBrainImport({directory,ownerHash});owned=false;return verified;
 }catch(error){
  if(state)await state.close().catch(()=>{});
  if(owned)rmSync(directory,{recursive:true,force:true});
  throw error;
 }finally{closeSync(source);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [operation,...args]=process.argv.slice(2);
 const task=operation==='stage'&&args.length===3
  ?()=>stageBrainImport({workDbPath:args[0],exportPath:args[1],destinationRoot:args[2],ownerHash:process.env.WRITER_OWNER_HASH})
  :operation==='verify'&&args.length===1?()=>verifyBrainImport({directory:args[0],ownerHash:process.env.WRITER_OWNER_HASH}):null;
 if(!task){console.error('Usage: brain-private-import.mjs stage WORK_DB PRIVATE_STATE_EXPORT PRIVATE_DIRECTORY | verify BUNDLE_DIRECTORY');process.exitCode=2;}
 else task().then(result=>console.log(JSON.stringify(result))).catch(()=>{console.error('Private Brain import blocked; no activation or source overwrite performed.');process.exitCode=1;});
}
