import {needsHistoryScan,recordPacketReceipt,selectActionPackets,validPacket} from './work-packets.mjs';

// Only the authenticated coordinator can claim and settle an owner-partitioned
// cycle. No Github/Brain credential is conferred by this adapter.
const SCHEMA="CREATE TABLE IF NOT EXISTS continuity_packet_checkpoints ("+
 "owner_scope TEXT PRIMARY KEY,source_version TEXT NOT NULL,"+
 "state TEXT NOT NULL CHECK(state IN ('running','settled')),"+
 "cycle_id INTEGER NOT NULL,fence TEXT NOT NULL,updated_at INTEGER NOT NULL,"+
 "result_json TEXT NOT NULL)";
const SHA=/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i;
const MAX_CANDIDATES=100;
const packetKey=p=>[p.repo,p.issue,p.headSha].join('#');
const actionKey=p=>[p.repo,p.issue,p.headSha,p.nextAction].join('#');
const bounded=(v,n)=>typeof v==='string'?v.slice(0,n):'';

function parseLedger(row){
 if(!row)return {};
 const parsed=JSON.parse(row.result_json);
 if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw Error('checkpoint_ledger_corrupt');
 return parsed;
}
function ledgerFrom(previous={},newRevision=false){
 const list=k=>Array.isArray(previous[k])?previous[k].slice(-MAX_CANDIDATES):[];
 return {
  candidates:newRevision?[]:list('candidates'),
  inventoryLoaded:newRevision?false:previous.inventoryLoaded===true,
  exhausted:newRevision?false:previous.exhausted===true,
  attempted:newRevision?[]:list('attempted'),
  skipped:newRevision?[]:list('skipped'),
  blocked:list('blocked'),done:list('done'),receipts:list('receipts'),
  pending:previous.pending||null,
 };
}
function storeCandidate(p){
 if(!validPacket(p))return {invalid:true,issue:Number.isSafeInteger(p?.issue)?p.issue:null,
  headSha:SHA.test(p?.headSha||'')?p.headSha:null};
 return {repo:p.repo,issue:p.issue,headSha:p.headSha,nextAction:p.nextAction,
  nextSourcePath:p.nextSourcePath,priority:p.priority,state:p.state||'ready',
  blockReason:bounded(p.blockReason,240),lastActionAt:Number.isFinite(p.lastActionAt)?p.lastActionAt:0,
  requiredChecksPassed:p.requiredChecksPassed===true,
  requiredReviewsSatisfied:p.requiredReviewsSatisfied===true,
  securityHold:p.securityHold===true,
  ...(p.lease&&typeof p.lease==='object'?{lease:{
   verified:p.lease.verified===true,active:p.lease.active===true,
   holder:bounded(p.lease.holder,160)
  }}:{})
 };
}
function doneFor(ledger,p){
 const key=actionKey(p);
 if(ledger.done.includes(key))return true;
 // An older pre-migration receipt may have a legacy issue/head done key.
 // Only dedupe it when the separately recorded action matches.
 return ledger.done.includes(packetKey(p))&&ledger.receipts.some(r=>
  r.repo===p.repo&&r.issue===p.issue&&r.headSha===p.headSha&&r.action===p.nextAction);
}
function blockedFor(ledger,p,sourceVersion){
 return ledger.blocked.some(b=>b.repo===p.repo&&b.issue===p.issue&&
  b.headSha===p.headSha&&(!b.action||b.action===p.nextAction)&&
  (b.sourceVersion===sourceVersion||
   (p.state==='blocked'&&typeof p.blockReason==='string'&&p.blockReason===b.reason)));
}
function candidateAvailable(p,ledger,sourceVersion){
 return validPacket(p)&&!doneFor(ledger,p)&&!blockedFor(ledger,p,sourceVersion);
}
function skippedCandidates(candidates,selected,ledger,ownerId,sourceVersion){
 const chosen=new Set(selected.map(actionKey)),seen=new Set();
 return candidates.slice(0,MAX_CANDIDATES).flatMap(p=>{
  if(!validPacket(p))return [{issue:p?.issue??null,headSha:p?.headSha??null,reason:'invalid_packet'}];
  const key=actionKey(p),pair=packetKey(p);
  if(chosen.has(key)){seen.add(pair);return []}
  let reason='batch_limit';
  if(seen.has(pair))reason='duplicate_issue_head';
  else if(p.state==='complete'||p.state==='merged')reason='already_complete';
  else if(doneFor(ledger,p))reason='already_receipted';
  else if(blockedFor(ledger,p,sourceVersion))reason='unchanged_blocker';
  else if(p.lease?.verified&&p.lease?.active&&p.lease?.holder&&p.lease.holder!==ownerId)
   reason='foreign_active_lease';
  else if(p.nextAction==='merge_pr'&&(!p.requiredChecksPassed||!p.requiredReviewsSatisfied||p.securityHold))
   reason='merge_gate';
  else if(p.securityHold&&p.nextAction!=='write_test')reason='safety_hold';
  seen.add(pair);
  return [{repo:p.repo,issue:p.issue,headSha:p.headSha,action:p.nextAction,reason}];
 });
}
function summaryOfReceipt(r){
 const s={id:r.id,repo:r.repo,issue:r.issue,headSha:r.headSha,action:r.action,
  result:r.result,idempotencyKey:r.idempotencyKey};
 if(typeof r.reason==='string')s.reason=r.reason.slice(0,240);
 if(typeof r.mergeSha==='string')s.mergeSha=r.mergeSha;
 if(typeof r.deploymentId==='string')s.deploymentId=r.deploymentId.slice(0,160);
 if(typeof r.artifactUrl==='string'){
  try{const u=new URL(r.artifactUrl);
   if(u.protocol==='https:'&&!u.username&&!u.password&&!u.search&&!u.hash)
    s.artifactUrl=u.href.slice(0,512);
  }catch{}
 }
 if(r.providerConfirmed===true)s.providerConfirmed=true;
 return s;
}
function stamp(clock){
 const v=clock();
 if(!Number.isSafeInteger(v)||v<0)throw Error('packet_runner_clock_invalid');
 return v;
}
const ACTIVE="EXISTS (SELECT 1 FROM continuity_cycle_receipts AS live "+
 "WHERE live.cycle_id=? AND live.fence=? AND live.state='running' AND live.lease_until>?)";
async function activeClaim(db,claim,at){
 const row=await db.prepare("SELECT fence FROM continuity_cycle_receipts "+
  "WHERE cycle_id=? AND fence=? AND state='running' AND lease_until>?")
  .bind(claim.id,claim.fence,at).first();
 return Boolean(row);
}
async function saveCheckpoint(db,claim,ownerScope,sourceVersion,ledger,state,at){
 // Both the checkpoint fence AND a CURRENT coordinator lease are compared
 // inside the one atomic D1 UPDATE, not only in an earlier JavaScript check.
 const query="UPDATE continuity_packet_checkpoints SET state=?,updated_at=?,result_json=? "+
  "WHERE owner_scope=? AND source_version=? AND state='running' AND cycle_id=? AND fence=? AND "+ACTIVE;
 const r=await db.prepare(query).bind(state,at,JSON.stringify(ledger),ownerScope,
  sourceVersion,claim.id,claim.fence,claim.id,claim.fence,at).run();
 return r?.meta?.changes===1;
}
async function reserveCheckpoint(db,claim,ownerScope,sourceVersion,ledger,previous,at){
 // A stale caller cannot reserve after losing its active lease. An old
 // 'running' row can be reclaimed ONLY when no operation is in flight and
 // its former lease has expired; uncertain writes require reconciliation.
 const query="INSERT INTO continuity_packet_checkpoints "+
  "(owner_scope,source_version,state,cycle_id,fence,updated_at,result_json) "+
  "SELECT ?,?,'running',?,?,?,? FROM continuity_cycle_receipts AS current "+
  "WHERE current.cycle_id=? AND current.fence=? AND current.state='running' AND current.lease_until>? "+
  "ON CONFLICT(owner_scope) DO UPDATE SET source_version=excluded.source_version,"+
  "state='running',cycle_id=excluded.cycle_id,fence=excluded.fence,"+
  "updated_at=excluded.updated_at,result_json=excluded.result_json "+
  "WHERE continuity_packet_checkpoints.source_version=? "+
  "AND continuity_packet_checkpoints.fence=? AND continuity_packet_checkpoints.cycle_id=? "+
  "AND (continuity_packet_checkpoints.state='settled' OR ("+
  "continuity_packet_checkpoints.state='running' "+
  "AND json_extract(continuity_packet_checkpoints.result_json,'$.pending') IS NULL "+
  "AND NOT EXISTS (SELECT 1 FROM continuity_cycle_receipts AS old "+
  "WHERE old.cycle_id=continuity_packet_checkpoints.cycle_id "+
  "AND old.fence=continuity_packet_checkpoints.fence "+
  "AND old.state='running' AND old.lease_until>?))) "+
  "AND EXISTS (SELECT 1 FROM continuity_cycle_receipts AS current2 "+
  "WHERE current2.cycle_id=excluded.cycle_id AND current2.fence=excluded.fence "+
  "AND current2.state='running' AND current2.lease_until>?)";
 const r=await db.prepare(query).bind(
  ownerScope,sourceVersion,claim.id,claim.fence,at,JSON.stringify(ledger),
  claim.id,claim.fence,at,
  previous?.source_version||'',previous?.fence||'',previous?.cycle_id??-1,
  at,at
 ).run();
 return r?.meta?.changes===1;
}
export async function runPacketPass({
 db,claim,ownerScope,ownerId,sourceVersion,loadCandidates,executePacket,
 limit=3,now=Date.now
}={}){
 const clock=typeof now==='function'?now:()=>now;
 const started=stamp(clock);
 if(!db?.prepare||claim?.claimed!==true||!Number.isSafeInteger(claim.id)||
  typeof claim.fence!=='string'||!claim.fence||
  !/^[a-f0-9]{64}$/i.test(ownerScope||'')||
  typeof ownerId!=='string'||!ownerId||!SHA.test(sourceVersion||'')||
  typeof loadCandidates!=='function'||typeof executePacket!=='function'||
  !Number.isInteger(limit)||limit<2||limit>5)
  throw Error('packet_runner_arguments_invalid');
 if(!await activeClaim(db,claim,started))
  return {status:'lease_lost',scanned:false,attempted:[],skipped:[]};
 await db.prepare(SCHEMA).run();
 const previous=await db.prepare("SELECT source_version,state,cycle_id,fence,result_json "+
  "FROM continuity_packet_checkpoints WHERE owner_scope=?").bind(ownerScope).first();
 let old;
 try{old=parseLedger(previous);}catch{return {status:'reconciliation_required',scanned:false,attempted:[],skipped:[]}}
 if(previous?.state==='running'&&old.pending)
  return {status:'reconciliation_required',scanned:false,attempted:old.attempted||[],skipped:old.skipped||[]};
 const newRevision=previous?.source_version!==sourceVersion;
 const ledger=ledgerFrom(old,newRevision);
 if(!newRevision&&ledger.inventoryLoaded&&ledger.exhausted)
  return {status:'unchanged',scanned:false,attempted:ledger.attempted,skipped:ledger.skipped};
 if(!needsHistoryScan({currentVersion:sourceVersion,lastScannedVersion:newRevision?'':sourceVersion})&&
  !ledger.inventoryLoaded)ledger.exhausted=false;
 if(!await reserveCheckpoint(db,claim,ownerScope,sourceVersion,ledger,previous,stamp(clock)))
  return {status:'checkpoint_conflict',scanned:false,attempted:[],skipped:[]};
 let scanned=false;
 if(!ledger.inventoryLoaded){
  scanned=true;
  try{
   const rows=await loadCandidates({sourceVersion,limit:MAX_CANDIDATES});
   if(!Array.isArray(rows)||rows.length>MAX_CANDIDATES)throw Error('candidate_inventory_invalid');
   ledger.candidates=rows.map(storeCandidate);
   ledger.inventoryLoaded=true;ledger.exhausted=false;
   if(!await saveCheckpoint(db,claim,ownerScope,sourceVersion,ledger,'running',stamp(clock)))
    return {status:'lease_lost',scanned:true,attempted:[],skipped:[]};
  }catch{
   // No external action has run, so a source-read error is retryable.
   ledger.inventoryLoaded=false;ledger.candidates=[];ledger.exhausted=false;
   const settled=await saveCheckpoint(db,claim,ownerScope,sourceVersion,ledger,'settled',stamp(clock));
   return {status:settled?'load_failed':'reconciliation_required',scanned:true,attempted:[],skipped:[]};
  }
 }
 const pool=ledger.candidates.filter(p=>candidateAvailable(p,ledger,sourceVersion));
 const packets=selectActionPackets(pool,{blocked:[],done:[],ownerId,limit});
 ledger.skipped=skippedCandidates(ledger.candidates,packets,ledger,ownerId,sourceVersion);
 const attempted=[];
 for(const packet of packets){
  if(!await activeClaim(db,claim,stamp(clock)))
   return {status:'lease_lost',scanned,attempted,skipped:ledger.skipped};
  const idempotencyKey=[sourceVersion.slice(0,16),packet.issue,packet.headSha.slice(0,12),
   packet.nextAction].join(':');
  // Persist the operation identity BEFORE any provider side effect. If the
  // connection breaks afterwards, never automatically replay an uncertain write.
  ledger.pending={repo:packet.repo,issue:packet.issue,headSha:packet.headSha,
   action:packet.nextAction,idempotencyKey};
  if(!await saveCheckpoint(db,claim,ownerScope,sourceVersion,ledger,'running',stamp(clock)))
   return {status:'lease_lost',scanned,attempted,skipped:ledger.skipped};
  if(!await activeClaim(db,claim,stamp(clock)))
   return {status:'lease_lost',scanned,attempted,skipped:ledger.skipped};
  let received;
  try{
   const result=await executePacket(packet,{claim,idempotencyKey});
   received=result?.receipt;
   if(received?.idempotencyKey!==idempotencyKey||
      received.action!==packet.nextAction)throw Error('packet_receipt_action_mismatch');
   const all=recordPacketReceipt(ledger.receipts,packet,received);
   ledger.receipts=all.slice(-MAX_CANDIDATES).map(summaryOfReceipt);
  }catch{
   return {status:'reconciliation_required',scanned,attempted,skipped:ledger.skipped};
  }
  const event={repo:packet.repo,issue:packet.issue,headSha:packet.headSha,
   action:packet.nextAction,result:received.result};
  ledger.attempted.push(event);ledger.attempted=ledger.attempted.slice(-MAX_CANDIDATES);
  if(received.result==='blocked'||received.result==='observed'){
   ledger.blocked.push({repo:packet.repo,issue:packet.issue,headSha:packet.headSha,
    action:packet.nextAction,sourceVersion,
    reason:received.result==='blocked'?bounded(received.reason,240):'No provider-confirmed change yet'});
   ledger.blocked=ledger.blocked.slice(-MAX_CANDIDATES);
  }
  if(['changed','reviewed','merged','deployed'].includes(received.result)){
   ledger.done=[...new Set([...ledger.done,actionKey(packet)])].slice(-MAX_CANDIDATES);
  }
  ledger.pending=null;
  // Keep the actual provider result visible even if a newly expired fence
  // prevents writing its receipt. D1 still has the pending operation key,
  // so another caller must reconcile rather than replay that side effect.
  attempted.push(event);
  if(!await saveCheckpoint(db,claim,ownerScope,sourceVersion,ledger,'running',stamp(clock)))
   return {status:await activeClaim(db,claim,stamp(clock))?'reconciliation_required':'lease_lost',
    scanned,attempted,skipped:ledger.skipped};
 }
 const left=ledger.candidates.filter(p=>candidateAvailable(p,ledger,sourceVersion));
 ledger.exhausted=selectActionPackets(left,{blocked:[],done:[],ownerId,limit:1}).length===0;
 if(!await saveCheckpoint(db,claim,ownerScope,sourceVersion,ledger,'settled',stamp(clock)))
  return {status:'checkpoint_conflict',scanned,attempted,skipped:ledger.skipped};
 return {status:attempted.length?'processed':'exhausted',scanned,attempted,
  skipped:ledger.skipped,hasMore:!ledger.exhausted};
}
