/*
 * Verify a possible work receipt by independent, bounded GitHub API readback.
 * The work topic, commit and CI can be authentic without satisfying the
 * owner's request. Never infer deployed or complete from a generic CI run.
 */
const REPOS=Object.freeze({
 'owner-delegation':'www-infinity4/QuantaPhi',
 'conversation-memory':'www-infinity4/QuantaPhi',
 'autonomous-building':'www-infinity4/QuantaPhi',
 'apk-web-sync':'www-infinity4/QuantaPhi',
 voice:'www-infinity4/QuantaPhi',
 recorder:'www-infinity4/RecordB',
 radio:'www-infinity4/Alien-Radio',
 'card-controls':'www-infinity4/QuantaPhi',
 wallet:'www-infinity4/QuantaPhi',
 'site-building':'www-infinity4/Omni-Phi'
});
const SHA=/^[a-f0-9]{40}$/;
const RUN=/^[1-9][0-9]{0,14}$/;

function verifiedResponse(body,status=200){return {status,...body}}
export async function readbackOwnerWorkReceipt(owner,body={},fetcher=fetch){
 if(typeof owner!=='string'||!owner)throw Error('verified_owner_required');
 const id=body.candidateId,repository=REPOS[id];
 const runId=String(body.runId||''),sha=body.commitSha;
 if(!repository||body.repository!==repository||!SHA.test(sha||'')||
  !RUN.test(runId)||!Number.isSafeInteger(Number(runId))||
  Object.keys(body).some(k=>!['mode','candidateId','repository','commitSha','runId'].includes(k)))
   return verifiedResponse({ok:false,error:'work_receipt_input_invalid'},400);
 const prefix='https://api.github.com/repos/'+repository;
 const read=async path=>{
  // All targets are pinned to the GitHub REST host and exact known repository.
  const response=await fetcher(prefix+path,{
   method:'GET',redirect:'error',headers:{Accept:'application/vnd.github+json',
    'User-Agent':'Bubbles-Work-Receipt-Readback'},
   signal:AbortSignal.timeout(12000)
  });
  if(!response?.ok)throw Error('github_source_read_unavailable');
  return response.json();
 };
 try{
  const commit=await read('/commits/'+sha);
  if(commit?.sha!==sha||!SHA.test(commit?.commit?.tree?.sha||''))
   return verifiedResponse({ok:false,error:'commit_source_unverified'},409);
  const workflow=await read('/actions/runs/'+runId);
  if(workflow?.head_sha!==sha||workflow?.repository?.full_name!==repository)
   return verifiedResponse({ok:false,error:'workflow_source_mismatch'},409);
  const basic={candidateId:id,repository,commitSha:sha,runId:Number(runId),
   workflowUrl:'https://github.com/'+repository+'/actions/runs/'+runId};
  // A failed, queued, or missing CI run is meaningful evidence but not success.
  if(workflow.status!=='completed'||workflow.conclusion!=='success')
   return verifiedResponse({ok:true,status:'commit_seen_ci_not_verified',receipt:{...basic,
    observedWorkflowStatus:String(workflow.status||'unknown').slice(0,32),
    observedConclusion:String(workflow.conclusion||'pending').slice(0,32)},
    featureImplemented:false,deploymentVerified:false,ownerApprovalGranted:false,workDispatched:false});
  const result=await read('/actions/runs/'+runId+'/jobs?per_page=100');
  const jobs=result?.jobs;
  if(!Array.isArray(jobs)||!Number.isSafeInteger(result.total_count)||result.total_count<1||
   result.total_count>100||jobs.length!==result.total_count||
   !jobs.every(j=>j.status==='completed'&&j.conclusion==='success'))
   return verifiedResponse({ok:false,error:'workflow_job_receipts_incomplete'},409);
  return verifiedResponse({ok:true,status:'commit_and_ci_readback_observed',
   receipt:{...basic,successfulJobs:jobs.length},
   // A random successful workflow is not acceptance of the owner's feature.
   // Only a separate source diff, scoped job, deployed bytes and browser/device
   // behavior can support an actual completion claim.
   featureImplemented:false,deploymentVerified:false,ownerApprovalGranted:false,workDispatched:false});
 }catch{
  return verifiedResponse({ok:false,error:'github_receipt_readback_unavailable'},503);
 }
}
