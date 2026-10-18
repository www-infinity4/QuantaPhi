/*
 * A Pink verification job is read-only. A successful repository merge is
 * not another Green assignment and cannot be re-implemented indefinitely.
 * Owner-authenticated OIDC is still required by the Worker route.
 */
const SHA=/^[a-f0-9]{40}$/;
const REPO=/^www-infinity4\/[A-Za-z0-9_.-]+$/;
const GITHUB_PR=/^https:\/\/github\.com\/www-infinity4\/([A-Za-z0-9_.-]+)\/pull\/([1-9][0-9]*)$/;
const TECH_CATEGORIES=new Set(['source-routing','implementation','runner-connection']);
const depIdFromJob=job=>String(job?.instructions||'').match(/^After (TASK-[0-9]+), independently verify\b/)?.[1]||null;
export function pinnedPinkReview(context,job){
 if(job?.agent!=='pink-panther'||!REPO.test(job.repository||''))return null;
 const primaryId=depIdFromJob(job);
 if(!primaryId||!Array.isArray(job.dependencies)||!job.dependencies.includes(primaryId))return null;
 const jobs=context?.color_jobs||[],primary=jobs.find(j=>j.id===primaryId);
 const proof=primary?.progress||{},link=GITHUB_PR.exec(proof.prUrl||'');
 if(!primary||primary.agent!=='greenbeans'||primary.repository!==job.repository||
   primary.status!=='merged_verified'||proof.testsPassed!==true||
   !SHA.test(proof.mergeSha||'')||!link||'www-infinity4/'+link[1]!==job.repository)
  return null;
 const repaired=new Set(),handoffs=context.technical_handoffs||[];
 let changed=true;
 while(changed){
  changed=false;
  for(const h of handoffs){
   if(h.sourceJobId!==job.id&&!repaired.has(h.sourceJobId))continue;
   if(!TECH_CATEGORIES.has(h.category))return null; // no privilege/owner block bypass
   const repair=jobs.find(x=>x.id===h.repairJobId);
   if(!repair||repair.agent!=='greenbeans'||repair.repository!==job.repository||
    !String(repair.instructions||'').startsWith('Diagnose and repair the authenticated ')||
    !String(repair.title||'').startsWith('Repair '))return null;
   if(!repaired.has(repair.id)){repaired.add(repair.id);changed=true;}
  }
  if(repaired.size>6)return null;
 }
 if(job.dependencies.some(id=>id!==primaryId&&!repaired.has(id)))return null;
 // This grant is only to REVIEW existing code: no source writes or reward mint.
 return {kind:'source_review_only',primaryId,repository:job.repository,
  mergeSha:proof.mergeSha,sourceCommitSha:proof.commitSha||null,
  prNumber:Number(link[2]),prUrl:proof.prUrl,repairIds:[...repaired].sort(),
  testsPreviouslyPassed:true,sourceDeployedVerified:false,mayWrite:false};
}
export function validatePinkSourceReceipt({review,job,body}){
 if(review?.kind!=='source_review_only'||review?.mayWrite!==false||
  job?.agent!=='pink-panther'||!REPO.test(review.repository||'')||
  job.repository!==review.repository||body?.status!=='source_verified'||
  body.testsPassed!==true||body.reviewedMergeSha!==review.mergeSha||
  !SHA.test(body.commitSha||'')||!Array.isArray(body.testPaths)||
  body.testPaths.length<1||body.testPaths.length>8||
  body.testPaths.some(x=>typeof x!=='string'||
   !/^(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+\.(?:test|spec)\.(?:js|mjs|cjs)$/.test(x))||
  new Set(body.testPaths).size!==body.testPaths.length||
  body.productionVerified===true||body.ownerApprovalGranted===true||
  body.mergedNewCode===true)throw Error('source_review_receipt_invalid');
 return {sourceSha:body.commitSha,mergeSha:review.mergeSha,prNumber:review.prNumber,
  repository:review.repository,testPaths:body.testPaths,repairIds:review.repairIds,
  sourceOnly:true,productionVerified:false,noNewCommit:true,noReward:true};
}
export function completePinkReviewInContext(context,jobId,verification,when,runUrl){
 const clone=structuredClone(context),job=clone.color_jobs?.find(j=>j.id===jobId);
 if(!job||job.agent!=='pink-panther'||job.repository!==verification.repository)throw Error('source_review_ticket_changed');
 job.status='complete';
 job.progress={...job.progress,summary:'Independent Pink source verification passed for merged PR #'+verification.prNumber+
   ' and '+verification.testPaths.length+' actual focused test files. No new commit, wallet payout, or production acceptance was claimed.',
  resultKind:'source_verified',reviewedMergeSha:verification.mergeSha,
  checkedSourceSha:verification.sourceSha,testPaths:verification.testPaths,
  attemptedAt:when,verifiedAt:when,runUrl,
  blocker:'deployment_not_verified',next:'Merged source and native tests verified; live site/device acceptance remains separate.'};
 for(const id of verification.repairIds){
  const generated=clone.color_jobs.find(j=>j.id===id);
  if(generated&&generated.agent==='greenbeans'&&
   generated.instructions?.startsWith('Diagnose and repair the authenticated ')){
    generated.status='superseded';
    generated.progress={...generated.progress,summary:'Superseded by verified Pink review of the original merged source. Preserved for audit; not replayed.',resultKind:'superseded_by_source_review',
     supersededBy:jobId,verifiedAt:when,runUrl};
  }
 }
 return clone;
}
