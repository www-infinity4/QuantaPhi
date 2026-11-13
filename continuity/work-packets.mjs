/* Pure packet selection; not a GitHub/Cloudflare executor or authentication grant. */
const STATES=new Set(['ready','running','blocked','review','merged','complete']);
const ACTIONS=new Set(['write_test','edit_code','fix_ci','reply_review','request_review','merge_pr','verify_deploy']);
const key=p=>[p.repo,p.issue,p.headSha].join('#');
// Existing issue identity is stable across sessions. A dependency is *not*
// satisfied by an unverified PR, model response or an in-memory claim.
const DEPENDENCY=/^[-\w.]+\/[-\w.]+#[1-9][0-9]*$/;
const issueId=p=>p.repo+'#'+p.issue;
// A declared file scope cannot omit the actual target of an execution.
const sourcePaths=p=>[...(Array.isArray(p.scopePaths)?p.scopePaths:[]),p.nextSourcePath];
const pathOverlap=(a,b)=>a===b||a.startsWith(b.replace(/\/$/,'')+'/')||b.startsWith(a.replace(/\/$/,'')+'/');
export function scopesOverlap(a,b){
 return sourcePaths(a).some(x=>sourcePaths(b).some(y=>pathOverlap(x,y)));
}
export function validPacket(p){
 return Boolean(p&&typeof p.repo==='string'&&/^[-\w.]+\/[-\w.]+$/.test(p.repo)&&
 Number.isSafeInteger(p.issue)&&p.issue>0&&typeof p.headSha==='string'&&/^[a-f0-9]{40}$/i.test(p.headSha)&&
 ACTIONS.has(p.nextAction)&&STATES.has(p.state||'ready')&&Number.isFinite(p.priority)&&p.priority>=0&&p.priority<=100&&
 typeof p.nextSourcePath==='string'&&p.nextSourcePath.length>0&&p.nextSourcePath.length<512&&
 !p.nextSourcePath.startsWith('/')&&!p.nextSourcePath.includes('\\')&&
 p.nextSourcePath.split('/').every(segment=>segment&&segment!=='.'&&segment!=='..')&&
 (p.estimatedMinutes===undefined||(Number.isSafeInteger(p.estimatedMinutes)&&p.estimatedMinutes>0&&p.estimatedMinutes<=480))&&
 (p.dependencies===undefined||(Array.isArray(p.dependencies)&&p.dependencies.length<=24&&
 new Set(p.dependencies).size===p.dependencies.length&&p.dependencies.every(d=>typeof d==='string'&&DEPENDENCY.test(d)&&d!==issueId(p))))&&
 (p.scopePaths===undefined||(Array.isArray(p.scopePaths)&&p.scopePaths.length>0&&p.scopePaths.length<=24&&
 p.scopePaths.every(s=>typeof s==='string'&&s.length>0&&s.length<512&&!s.startsWith('/')&&!s.includes('..')&&!s.includes('\\\\')))));
}
export function needsHistoryScan({currentVersion='',lastScannedVersion=''}={}){
 return Boolean(currentVersion&&currentVersion!==lastScannedVersion);
}
export function selectActionPackets(candidates,{blocked=[],done=[],ownerId='',limit=3,completedDependencies=[]}={}){
 if(!Array.isArray(candidates)||!Number.isInteger(limit)||limit<1||limit>5||
  !Array.isArray(completedDependencies)||completedDependencies.length>2500)return [];
 const keys=new Set(),complete=new Set(done),resolved=new Set(completedDependencies),selected=[];
 const prioritized=candidates.filter(validPacket).sort((a,b)=>
  b.priority-a.priority||((a.lastActionAt||0)-(b.lastActionAt||0))||a.issue-b.issue);
 for(const p of prioritized){
  if(selected.length>=limit)break;
  const k=key(p);
  if(p.state==='complete'||p.state==='merged'||keys.has(k))continue;
  keys.add(k);
  if(complete.has(k))continue;
  if(p.lease?.verified===true&&p.lease?.active===true&&p.lease?.holder&&p.lease.holder!==ownerId)continue;
  if(p.state==='blocked'&&blocked.some(b=>b.repo===p.repo&&b.issue===p.issue&&b.headSha===p.headSha&&b.reason===p.blockReason))continue;
  if(p.nextAction==='merge_pr'&&(!p.requiredChecksPassed||!p.requiredReviewsSatisfied||p.securityHold===true))continue;
  if(p.securityHold===true&&p.nextAction!=='write_test')continue;
  if((p.dependencies||[]).some(d=>!resolved.has(d)))continue;
  // Parallel-selected lanes are disjoint. The existing D1 executor may still
  // process these serially; selection does not create additional writers.
  if(selected.some(other=>other.repo===p.repo&&scopesOverlap(other,p)))continue;
  selected.push(Object.freeze({...p}));
 }
 return selected;
}
export function recordPacketReceipt(existing,packet,receipt){
 if(!validPacket(packet)||!receipt||receipt.repo!==packet.repo||receipt.issue!==packet.issue||receipt.headSha!==packet.headSha)throw Error('receipt_packet_mismatch');
 if(!ACTIONS.has(receipt.action)||!['blocked','changed','reviewed','merged','deployed','observed'].includes(receipt.result))throw Error('receipt_invalid');
 if(typeof receipt.idempotencyKey!=='string'||!receipt.idempotencyKey.trim()||receipt.idempotencyKey.length>128)throw Error('idempotency_key_required');
 if(receipt.result==='merged'&&(!/^[a-f0-9]{40}$/i.test(receipt.mergeSha||'')||receipt.action!=='merge_pr'||receipt.providerConfirmed!==true))throw Error('merge_unverified');
 if(receipt.result==='deployed'&&(!receipt.deploymentId||receipt.providerConfirmed!==true||receipt.action!=='verify_deploy'))throw Error('deployment_unverified');
 if(['changed','reviewed'].includes(receipt.result)&&(!receipt.artifactUrl||receipt.providerConfirmed!==true))throw Error('write_unverified');
 if(receipt.result==='blocked'&&(!receipt.reason||receipt.reason.length<5))throw Error('blocker_missing');
 const prior=Array.isArray(existing)?existing:[];
 const id=[receipt.repo,receipt.issue,receipt.headSha,receipt.action,receipt.idempotencyKey].join('#');
 if(prior.some(r=>r.id===id))return prior;
 return [...prior,Object.freeze({...receipt,id})];
}
export function summarizedProgress(receipts){
 const rows=Array.isArray(receipts)?receipts:[],count=result=>rows.filter(r=>r.result===result&&r.providerConfirmed===true).length;
 return Object.freeze({merged:count('merged'),changed:count('changed'),reviewed:count('reviewed'),deployed:count('deployed'),blocked:rows.filter(x=>x.result==='blocked').length});
}
