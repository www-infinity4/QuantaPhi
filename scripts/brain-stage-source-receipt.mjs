// Source-only Brain staging provenance. No secrets are emitted or persisted.
// This script must run after Wrangler --dry-run and before any Cloudflare write.
import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,mkdirSync,writeFileSync,appendFileSync,statSync} from 'node:fs';
import {join,relative,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

export const BUNDLE_DIR='/tmp/brain-clock-staged-build';
export const RECEIPT_PATH='repository-receipts/brain-clock-staged-version.json';
const SHA=/^[a-f0-9]{40}$/;
const ACCOUNT=/^[a-f0-9]{32}$/;
const VALID_EVENTS=new Set(['push','workflow_dispatch']);

export function stageDecision({eventName,operation,accountId,hasToken}){
 if(!VALID_EVENTS.has(eventName)||!['dry_run','stage_version'].includes(operation))
  throw Error('brain_stage_event_or_operation_invalid');
 const credentialsReady=ACCOUNT.test(accountId||'')&&hasToken===true;
 if(operation==='dry_run')return {stageReady:false,status:'source_verified_dry_run_only'};
 if(credentialsReady)return {stageReady:true,status:'source_verified_cloudflare_stage_pending'};
 if(eventName==='workflow_dispatch')
  return {stageReady:false,status:'source_verified_explicit_stage_blocked_missing_credentials',mustFail:true};
 return {stageReady:false,status:'source_verified_stage_blocked_missing_credentials'};
}

export function bundleFingerprint(directory){
 const base=resolve(directory),files=[],hash=createHash('sha256');
 function visit(folder){
  for(const e of readdirSync(folder,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
   const full=join(folder,e.name);
   if(e.isSymbolicLink())throw Error('brain_dry_run_bundle_symlink_disallowed');
   if(e.isDirectory()){visit(full);continue;}
   if(!e.isFile())throw Error('brain_dry_run_bundle_entry_invalid');
   files.push(full);
   if(files.length>100)throw Error('brain_dry_run_bundle_file_limit');
  }
 }
 visit(base);
 if(!files.length)throw Error('brain_dry_run_bundle_missing');
 let totalBytes=0;
 for(const file of files){
  const size=statSync(file).size;
  totalBytes+=size;
  if(totalBytes>25*1024*1024)throw Error('brain_dry_run_bundle_oversized');
  const name=relative(base,file).replaceAll('\\','/');
  hash.update(name+'\0');
  hash.update(readFileSync(file));
 }
 return {digest:hash.digest('hex'),fileCount:files.length,bundleBytes:totalBytes};
}

export function sourceStageReceipt({directory=BUNDLE_DIR,sha,eventName,operation,accountId,hasToken}){
 if(!SHA.test(sha||''))throw Error('brain_stage_git_sha_required');
 const fingerprint=bundleFingerprint(directory),decision=stageDecision({eventName,operation,accountId,hasToken});
 return {status:decision.status,githubSha:sha,sourceBundleSha256:fingerprint.digest,
  sourceBundleBytes:fingerprint.bundleBytes,sourceBundleFiles:fingerprint.fileCount,
  sourceDryRunVerified:true,stageRequested:operation==='stage_version',
  stageUploadAttempted:false,stageVersionVerified:false,productionUnchanged:null,
  canaryPromoted:false,credentialsAvailable:decision.stageReady,stageReady:decision.stageReady,
  ...(decision.mustFail?{releaseBlocked:'cloudflare_staging_account_or_token_missing'}:{})};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(process.argv[2]!=='gate')throw Error('brain_stage_gate_command_required');
 const eventName=process.env.GITHUB_EVENT_NAME||'';
 const operation=eventName==='push'?'stage_version':process.env.BRAIN_REQUESTED_OPERATION||'dry_run';
 const receipt=sourceStageReceipt({sha:process.env.GITHUB_SHA,eventName,operation,
  accountId:process.env.CLOUDFLARE_ACCOUNT_ID,hasToken:!!process.env.CLOUDFLARE_API_TOKEN});
 mkdirSync('repository-receipts',{recursive:true});
 writeFileSync(RECEIPT_PATH,JSON.stringify(receipt,null,2)+'\n',{mode:0o600});
 if(process.env.GITHUB_OUTPUT)
  appendFileSync(process.env.GITHUB_OUTPUT,'stage_ready='+(receipt.stageReady?'true':'false')+'\n');
 if(process.env.GITHUB_STEP_SUMMARY)
  appendFileSync(process.env.GITHUB_STEP_SUMMARY,'## Brain staging gate\n'+
   'Source bundle SHA-256: \`'+receipt.sourceBundleSha256+'\`\n'+
   'Source verification: passed. Cloudflare staging: **'+(receipt.stageReady?'authorized, awaiting version verification':receipt.status.replaceAll('_',' '))+'**.\n'+
   'No deployment or production traffic change is certified here.\n');
 console.log('Brain source-only staging receipt: '+receipt.status+'; bundle='+receipt.sourceBundleSha256);
 if(receipt.releaseBlocked)throw Error('cloudflare_stage_requested_but_owner_credential_unavailable');
}
