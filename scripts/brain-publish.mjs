/*
 * The autonomous writer must never bypass GitHub PR review just because main
 * happens to accept direct pushes. An accepted push is NOT CI or deployment.
 */
export async function publishReviewed({repository,base,commitSha,jobId,runId,push,api}){
 if(repository!=='www-infinity4/QuantaPhi'||base!=='main'||
  !/^[a-f0-9]{40}$/.test(commitSha||'')||
  typeof jobId!=='string'||!/^[-A-Za-z0-9_/]{1,150}$/.test(jobId)||
  !/^[1-9][0-9]{0,15}$/.test(String(runId))||
  typeof push!=='function'||typeof api!=='function')
  throw Error('invalid_reviewed_publish');
 const branch='robot/'+jobId.replace(/[^a-zA-Z0-9_-]/g,'-').slice(0,90)+'/'+runId;
 // Never attempt HEAD:main, not even if branch protection is off.
 await push('HEAD:refs/heads/'+branch);
 const pr=await api('repos/'+repository+'/pulls',{
  method:'POST',
  body:{title:'Robot repair: '+jobId,base:'main',head:branch,draft:true,
   body:'Bubbles autonomous writer proposal for owner-approved job '+jobId+
    '. Source commit: '+commitSha+'\\n'+
    'A model proposed the patch and separate review and local regressions passed. '+
    'This is a DRAFT requiring actual GitHub CI, owner-scoped review and explicit release acceptance. '+
    'No deployed site, APK/device behavior or wallet reward is verified by this PR.'}
 });
 if(!pr?.html_url||!/^https:\/\/github\.com\/www-infinity4\/QuantaPhi\/pull\/[1-9][0-9]*$/.test(pr.html_url)||
  pr.head?.sha!==commitSha||pr.head?.ref!==branch||
  pr.base?.ref!=='main'||pr.draft!==true||!Number.isSafeInteger(pr.number))
  throw Error('reviewed_draft_pr_receipt_mismatch');
 return {status:'committed_unverified',commitSha,publishedToDefault:false,
  draft:true,ciVerified:false,deploymentVerified:false,ownerMergeApproved:false,
  prUrl:pr.html_url,prNumber:pr.number,branch};
}
