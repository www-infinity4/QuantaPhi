// Private operator download of the original Brain's JSON KV. No installer,
// credential creation, source writer fence or runtime/origin activation.
import {createHash,randomUUID} from 'node:crypto';
import {lstatSync,openSync,closeSync,writeFileSync,fsyncSync,constants} from 'node:fs';
import {join,isAbsolute} from 'node:path';
import {pathToFileURL} from 'node:url';
import {inspectPrivateBrainWorkSnapshot,validateBrainStateDocument} from './brain-private-import.mjs';
import {MAX_BRAIN_EXPORT_BYTES,validatePrivateBrainExportMetadata} from '../workers/infinity-brain-clock/private-state-export.mjs';

export const EXPORT_ENDPOINT='https://infinity-brain-clock.marvaseater.workers.dev/work/migration/state-export';
const sha=value=>createHash('sha256').update(value).digest('hex');
const blocked=()=>{throw Error('brain_private_export_blocked');};
function privateDirectory(path){
 if(typeof path!=='string'||!isAbsolute(path))blocked();
 const info=lstatSync(path);
 if(!info.isDirectory()||(info.mode&0o077)!==0||typeof process.getuid==='function'&&info.uid!==process.getuid())blocked();
}
function absent(path){try{lstatSync(path);}catch(error){if(error.code==='ENOENT')return;throw error;}blocked();}
function save(path,text){
 const fd=openSync(path,constants.O_CREAT|constants.O_EXCL|constants.O_WRONLY|constants.O_NOFOLLOW,0o600);
 try{writeFileSync(fd,text);fsyncSync(fd);}finally{closeSync(fd);}
}
function syncDirectory(path){const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW);try{fsyncSync(fd);}finally{closeSync(fd);}}
const exportHeaders={'X-Brain-KV-Snapshot':'complete','X-Brain-Source-Authority-Verified':'false',
 'X-Brain-Source-Fence-Verified':'false','X-Brain-Work-Consistency-Verified':'false','X-Brain-Production-Verified':'false'};
async function privateResponse(response,{limit=MAX_BRAIN_EXPORT_BYTES,requiredHeaders=exportHeaders}={}){
 let reader;
 try{
  if(!response.ok)blocked();
  for(const [name,value] of Object.entries(requiredHeaders))
   if(response.headers.get(name)!==value)blocked();
  if(!/^application\/json(?:\s*;|$)/i.test(response.headers.get('Content-Type')||''))blocked();
  if(Number(response.headers.get('Content-Length')||0)>limit||!response.body)blocked();
  reader=response.body.getReader();const parts=[];let bytes=0;
  for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;
   if(bytes>limit)blocked();parts.push(value);}
  const data=Buffer.concat(parts.map(part=>Buffer.from(part)));
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));
 }finally{
  // Dispose rejected and oversized responses too. Do not wait indefinitely
  // for an untrusted producer's cancellation acknowledgement.
  try{const pending=reader?reader.cancel():response.body?.cancel();pending?.catch(()=>{});}catch{}
  reader?.releaseLock();
 }
}

// Explicit control, never implicitly called by the read-only download above.
// This drain cannot attest a common D1/KV snapshot or activate another writer.
export async function requestBrainAdmission({action,migrationId,sourceSha,ownerToken,fetcher=fetch}={}){
 try{
  if(!['begin','status','cancel'].includes(action)||typeof migrationId!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(migrationId)||
   typeof sourceSha!=='string'||!/^[a-f0-9]{40}$/.test(sourceSha)||
   typeof ownerToken!=='string'||!/^[\x21-\x7e]{1,256}$/.test(ownerToken))blocked();
  const endpoint=new URL('/work/migration/admission/'+action,EXPORT_ENDPOINT).href;
  const response=await fetcher(endpoint,{method:'POST',headers:{Authorization:'Bearer '+ownerToken,'Content-Type':'application/json'},
   body:JSON.stringify({migrationId,sourceSha}),redirect:'error',signal:AbortSignal.timeout(90000)});
  if(!/\bprivate\b/i.test(response.headers.get('Cache-Control')||'')||!/\bno-store\b/i.test(response.headers.get('Cache-Control')||'')){
   try{response.body?.cancel()?.catch(()=>{});}catch{}blocked();
  }
  const report=await privateResponse(response,{limit:16384,requiredHeaders:{}});
  const allowed=['ok','format','migrationId','sourceSha','phase','startedAt','cancelledAt','claimsBlocked','alarmInFlight','inventory',
   'sourceWritesFenced','sourceFenceVerified','targetActivationAllowed','productionVerified','writerActivationPerformed'];
  if(!report||report.ok!==true||report.format!=='infinity-brain-admission/v1'||report.migrationId!==migrationId||report.sourceSha!==sourceSha||
   Object.keys(report).some(key=>!allowed.includes(key))||!['draining','cancelled'].includes(report.phase)||
   action==='begin'&&report.phase!=='draining'||action==='cancel'&&report.phase!=='cancelled'||
   !Number.isSafeInteger(report.startedAt)||report.startedAt<=0||typeof report.alarmInFlight!=='boolean'||
   report.claimsBlocked!==(report.phase==='draining')||
   (report.phase==='cancelled'? !Number.isSafeInteger(report.cancelledAt)||report.cancelledAt<report.startedAt:report.cancelledAt!==undefined)||
   ['sourceWritesFenced','sourceFenceVerified','targetActivationAllowed','productionVerified','writerActivationPerformed'].some(key=>report[key]!==false))blocked();
  const inventory=report.inventory;
  if(!inventory||typeof inventory.complete!=='boolean'||Object.keys(inventory).sort().join(',')!=='complete,repository,writer')blocked();
  for(const name of ['writer','repository']){
   const counts=inventory[name],keys=['examined','active','expiredUnresolved','pendingPublication','malformed'];
   if(counts===null&&inventory.complete===false)continue;
   if(!counts||Object.keys(counts).length!==keys.length||Object.keys(counts).some(key=>!keys.includes(key))||
    keys.some(key=>!Number.isSafeInteger(counts[key])||counts[key]<0||counts[key]>1024)||
    keys.slice(1).some(key=>counts[key]>counts.examined))blocked();
  }
  return report;
 }catch{throw Error('brain_migration_admission_blocked');}
}

export async function downloadPrivateBrainState({workDbPath,destinationDirectory,sourceSha,snapshotId,ownerToken,fetcher=fetch}={}){
 try{
  if(typeof ownerToken!=='string'||!/^[\x21-\x7e]{1,256}$/.test(ownerToken))blocked();
  privateDirectory(destinationDirectory);
  const statePath=join(destinationDirectory,'state.json'),receiptPath=join(destinationDirectory,'export-receipt.json');
  absent(statePath);absent(receiptPath);
  const ownerHash=sha(ownerToken),before=await inspectPrivateBrainWorkSnapshot(workDbPath);
  const metadata=validatePrivateBrainExportMetadata({ownerHash,sourceSha,snapshotId,workSha256:before.workSha256});
  // Fixed original authority and no redirects prevent forwarding the master
  // credential to a ticket-supplied URL or a replacement host.
  const response=await fetcher(EXPORT_ENDPOINT,{method:'POST',headers:{Authorization:'Bearer '+ownerToken,'Content-Type':'application/json'},
   redirect:'error',signal:AbortSignal.timeout(90000),body:JSON.stringify({sourceSha:metadata.sourceSha,snapshotId:metadata.snapshotId,workSha256:metadata.workSha256})});
  const document=validateBrainStateDocument(await privateResponse(response),ownerHash);
  if(document.sourceSha!==sourceSha||document.snapshotId!==snapshotId||document.workSha256!==before.workSha256)blocked();
  const after=await inspectPrivateBrainWorkSnapshot(workDbPath);if(after.workSha256!==before.workSha256)blocked();
  const serialized=JSON.stringify(document),receipt={format:'infinity-brain-private-export/v1',scope:'infinity-main-json-kv',
   stateRecords:document.entryCount,sourceSha,snapshotId,workSha256:before.workSha256,entriesSha256:document.entriesSha256,stateSha256:sha(serialized),
   kvSnapshotComplete:true,sourceAuthorityVerified:false,sourceFenceVerified:false,workSnapshotConsistencyVerified:false,
   productionVerified:false,writerActivationPerformed:false,alarmsIncluded:false,sqlTablesIncluded:false,environmentBindingsIncluded:false};
  save(statePath,serialized);syncDirectory(destinationDirectory);
  // Receipt last: a partial download is never an accepted export.
  save(receiptPath,JSON.stringify(receipt,null,2)+'\n');syncDirectory(destinationDirectory);
  return {...receipt,statePath,receiptPath};
 }catch{throw Error('brain_private_export_blocked');}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [workDbPath,destinationDirectory,sourceSha]=process.argv.slice(2);
 if(workDbPath==='admission'){
  if(process.argv.length!==6){console.error('Usage: brain-private-export.mjs admission begin|status|cancel MIGRATION_ID SOURCE_SHA');process.exitCode=2;}
  else requestBrainAdmission({action:process.argv[3],migrationId:process.argv[4],sourceSha:process.argv[5],ownerToken:process.env.BRAIN_OWNER_TOKEN})
   .then(result=>console.log(JSON.stringify(result)))
   .catch(()=>{console.error('Private Brain admission control blocked; cutover remains unavailable.');process.exitCode=1;});
 }
 else if(process.argv.length!==5){console.error('Usage: brain-private-export.mjs PRIVATE_WORK.sqlite PRIVATE_DIRECTORY SOURCE_SHA');process.exitCode=2;}
 else downloadPrivateBrainState({workDbPath,destinationDirectory,sourceSha,snapshotId:randomUUID(),ownerToken:process.env.BRAIN_OWNER_TOKEN})
  .then(result=>console.log(JSON.stringify(result)))
  .catch(()=>{console.error('Private Brain export blocked; no writer or origin activated.');process.exitCode=1;});
}
