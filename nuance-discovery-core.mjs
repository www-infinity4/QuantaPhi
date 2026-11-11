/* Cart 004 nuances: bounded view model over already wallet-authorized audit results.
 * This module never authenticates, sends data, infers approval or dispatches a runner.
 */
const ID=/^[A-Za-z0-9_-]{8,100}$/;
const REPO=/^www-infinity4\/[A-Za-z0-9_.-]+$/;
const TOPIC=/^[a-z][a-z-]{2,48}$/;
const improvements=Object.freeze({
 'infinity-nuances':'Recover Cart 003/004 source and the 41+41 cart registry; compare the exact old decisions with current Bubbles modules before planning the smallest missing import.',
 'conversation-memory':'Connect only owner-authorized archived user turns, retaining later corrections and source IDs; keep private data out of public tickets.',
 'autonomous-building':'Deduplicate against existing verified issues and checkpoints, then route one scoped source-backed job to the signed runner with independent review.',
 'card-controls':'Preserve the Oracle Octaves Quick Card controls and Android interaction before proposing any new component.',
 'site-building':'Reuse the existing C13B0 and QuantaPhi publishing spine; identify only missing approved imports.',
 'apk-web-sync':'Verify Android and website state independently before proposing a shared-session repair.',
 'voice':'Compare current voice controls with earlier accessibility preferences, then test the missing interaction.',
 'radio':'Inspect the existing Infinity Radio player and playback regressions rather than replacing it.',
 'wallet':'Audit receipt boundaries before suggesting a wallet-related feature; never mint or transfer from discovery.',
 'owner-delegation':'Check the existing signed owner bridge and authorization state before suggesting any additional execution.',
 'recorder':'Map native recording to current RecordB sources and device permission tests; do not claim phone access.'
});
const priority=['infinity-nuances','conversation-memory','autonomous-building','card-controls','site-building'];
export function suggestNuances(response){
 if(!response||!['work-audit-reconcile','work-audit-sweep'].includes(response.mode)||!Array.isArray(response.candidates))return [];
 const reconciled=response.mode==='work-audit-reconcile'&&response.ticketInventoryTruncated===false;
 return response.candidates.filter(c=>c&&TOPIC.test(c.id||'')&&c.status==='candidate_needs_repository_inspection')
  .map(c=>{
   const ids=[...new Set((Array.isArray(c.evidence)?c.evidence:[])
    .map(e=>e?.messageId).filter(id=>ID.test(id||'')))].slice(0,8);
   const constraints=(Array.isArray(c.constraints)?c.constraints:[]).filter(x=>typeof x==='string')
     .map(x=>x.slice(0,220)).slice(0,5);
   const linked=Array.isArray(c.linkedTickets)?c.linkedTickets.length:0;
   const repo=String(c.repositorySuggestion||'');
   const canDraft=reconciled&&c.repositoryVerified===false&&REPO.test(repo)
     &&Array.isArray(c.linkedTickets)&&!linked&&ids.length>0;
   return {id:c.id,title:String(c.title||c.id).slice(0,100),repository:repo,
    repositoryVerified:false,verified:false,mentions:Math.max(0,Number(c.mentions)||0),
    evidenceCount:ids.length,evidenceIds:ids,
    excerpts:(Array.isArray(c.evidence)?c.evidence:[]).slice(0,3).map(e=>String(e?.excerpt||'').slice(0,320)),
    constraints,linkedTickets:linked,canDraft,
    improvement:improvements[c.id]||'Review these earlier owner requests against the exact repository, newer corrections and existing tickets before proposing a change.',
    status:'proposal_not_source_verified'};
  }).sort((a,b)=>{
   const pa=priority.indexOf(a.id),pb=priority.indexOf(b.id);
   return (pa<0?100:pa)-(pb<0?100:pb)||b.mentions-a.mentions||a.id.localeCompare(b.id);
  }).slice(0,10);
}
export function reviewDraftRequest(suggestion){
 if(!suggestion||suggestion.canDraft!==true||!TOPIC.test(suggestion.id||'')||
  !REPO.test(suggestion.repository||'')||
  !Array.isArray(suggestion.evidenceIds)||suggestion.evidenceIds.length<1||
  suggestion.evidenceIds.length>8||suggestion.evidenceIds.some(id=>!ID.test(id))||
  new Set(suggestion.evidenceIds).size!==suggestion.evidenceIds.length)return null;
 return {from_work_audit:true,start_immediately:false,
  auditCandidateId:suggestion.id,sourceMessageIds:[...suggestion.evidenceIds],
  repository:suggestion.repository};
}
