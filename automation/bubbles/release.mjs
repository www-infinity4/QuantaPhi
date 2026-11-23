/** This preflight emits NO commits, merges, deployments or cache invalidations. */
export function checkReleaseGate({expectedHead,actualHead,ci=[],reviews=[],prAuthor,ownerAuthorized=false,releaseAuthorized=false}={}){
 let reason='';
 const sha=/^[0-9a-f]{40}$/;
 if(!sha.test(expectedHead||'')||actualHead!==expectedHead)reason='exact_pr_head_mismatch';
 else if(!Array.isArray(ci)||!ci.length||ci.some(c=>c?.sha!==expectedHead||c.state!=='success'))reason='exact_head_ci_missing';
 else if(!ownerAuthorized||!releaseAuthorized)reason='owner_release_authorization_missing';
 else if(!Array.isArray(reviews)||!reviews.some(r=>r?.state==='APPROVED'&&r?.headSha===expectedHead&&r.author&&r.author!==prAuthor))reason='independent_exact_head_review_missing';
 return Object.freeze({status:reason?'blocked':'eligible_for_guarded_merge',reason:reason||null,
  expectedHead:expectedHead||null,merged:false,deployed:false,liveVerified:false,
  note:'GitHub independently enforces branch protection; perform a SHA-pinned merge and read back the result.'});
}
