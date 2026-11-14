/* Pure packet selection; not a GitHub/Cloudflare executor or authentication grant. */
const STATES=new Set(['ready','running','blocked','review','merged','complete']);
const ACTIONS=new Set(['write_test','edit_code','fix_ci','reply_review','request_review','merge_pr','verify_deploy']);
const key=p=>[p.repo,p.issue,p.headSha].join('#');
export function validPacket(p){
 return Boolean(p&&typeof p.repo==='string'&&/^[-\w.]+\/[-\w.]+$/.test(p.repo)&&
 Number.isSafeInteger(p.issue)&&p.issue>0&&typeof p.headSha==='string'&&/^[a-f0-9]{40}$/i.test(p.headSha)&&
 ACTIONS.has(p.nextAction)&&STATES.has(p.state||'ready')&&Number.isFinite(p.priority)&&p.priority>=0&&p.priority<=100&&
 typeof p.nextSourcePath==='string'&&p.nextSourcePath.length>0&&p.nextSourcePath.length<512);
}
export function needsHistoryScan({currentVersion='',lastScannedVersion=''}={}){
 return Boolean(currentVersion&&currentVersion!==lastScannedVersion);
}
export function selectActionPackets(candidates,{blocked=[],done=[],ownerId='',limit=3}={}){
 if(!Array.isArray(candidates)||!Number.isInteger(limit)||limit<1||limit>5)return [];
 const keys=new Set(),complete=new Set(done);
 return candidates.filter(p=>{
  if(!validPacket(p)||p.state==='complete'||p.state==='merged'||keys.has(key(p)))return false;
  keys.add(key(p));
  if(complete.has(key(p)))return false;
  if(p.lease?.verified===true&&p.lease?.active===true&&p.lease?.holder&&p.lease.holder!==ownerId)return false;
  if(p.state==='blocked'&&blocked.some(b=>b.repo===p.repo&&b.issue===p.issue&&b.headSha===p.headSha&&b.reason===p.blockReason))return false;
  if(p.nextAction==='merge_pr'&&(!p.requiredChecksPassed||!p.requiredReviewsSatisfied||p.securityHold===true))return false;
  if(p.securityHold===true&&p.nextAction!=='write_test')return false;
  return true;
 }).sort((a,b)=>b.priority-a.priority||((a.lastActionAt||0)-(b.lastActionAt||0))||a.issue-b.issue).slice(0,limit).map(p=>Object.freeze({...p}));
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
