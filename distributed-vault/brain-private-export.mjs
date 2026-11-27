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
async function privateResponse(response){
 let reader;
 try{
  if(!response.ok)blocked();
  for(const [name,value] of Object.entries({'X-Brain-KV-Snapshot':'complete','X-Brain-Source-Authority-Verified':'false',
   'X-Brain-Source-Fence-Verified':'false','X-Brain-Work-Consistency-Verified':'false','X-Brain-Production-Verified':'false'}))
   if(response.headers.get(name)!==value)blocked();
  if(!/^application\/json(?:\s*;|$)/i.test(response.headers.get('Content-Type')||''))blocked();
  if(Number(response.headers.get('Content-Length')||0)>MAX_BRAIN_EXPORT_BYTES||!response.body)blocked();
  reader=response.body.getReader();const parts=[];let bytes=0;
  for(;;){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;
   if(bytes>MAX_BRAIN_EXPORT_BYTES)blocked();parts.push(value);}
  const data=Buffer.concat(parts.map(part=>Buffer.from(part)));
  return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(data));
 }finally{
  // Dispose rejected and oversized responses too. Do not wait indefinitely
  // for an untrusted producer's cancellation acknowledgement.
  try{const pending=reader?reader.cancel():response.body?.cancel();pending?.catch(()=>{});}catch{}
  reader?.releaseLock();
 }
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
 if(process.argv.length!==5){console.error('Usage: brain-private-export.mjs PRIVATE_WORK.sqlite PRIVATE_DIRECTORY SOURCE_SHA');process.exitCode=2;}
 else downloadPrivateBrainState({workDbPath,destinationDirectory,sourceSha,snapshotId:randomUUID(),ownerToken:process.env.BRAIN_OWNER_TOKEN})
  .then(result=>console.log(JSON.stringify(result)))
  .catch(()=>{console.error('Private Brain export blocked; no writer or origin activated.');process.exitCode=1;});
}
