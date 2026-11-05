/* Server-only proposed Bubbles GIT attribution handoff.
 * Customer opts in to owner-provider credit. Backend verifies signed task,
 * job and wallet grant independently. No wallet mint, transfer or network I/O.
 */
const valid=v=>typeof v==='string'&&v.length>=3&&v.length<=180;
const sha=v=>typeof v==='string'&&/^[a-f0-9]{40}$|^[a-f0-9]{64}$/.test(v);
const repo=v=>valid(v)&&/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(v)&&!v.split('/').some(x=>x==='.'||x==='..');
const fail=msg=>{throw new Error(msg)};
export async function stageBubblesBuildClaim({request,grant,job,verifyCustomerGrant,verifyAgentJob,verifyOwnerWallet}={}){
 if(!grant||!request||!job)fail('customer_consent_required');
 if(!valid(request.customerId)||!valid(request.jobId)||!repo(request.repo)||!sha(request.commit)||
    !valid(request.requestedRecipientWallet)||request.builder!=='bubbles')fail('invalid_build_request');
 if(!valid(grant.customerId)||!valid(grant.jobId)||!repo(grant.repo)||!valid(grant.recipientWallet)||
    grant.asset!=='GIT'||grant.permission!=='earn_from_agent_built_code')fail('customer_consent_required');
 if(grant.customerId!==request.customerId||grant.jobId!==request.jobId||grant.repo!==request.repo||
    grant.recipientWallet!==request.requestedRecipientWallet||job.jobId!==request.jobId||
    job.customerId!==request.customerId||job.repo!==request.repo||job.commit!==request.commit)fail('provenance_mismatch');
 if(job.builder!=='bubbles'||job.result!=='commit_written')fail('builder_job_mismatch');
 if(typeof verifyCustomerGrant!=='function'||await verifyCustomerGrant(grant,request)!==true)fail('customer_consent_unverified');
 if(typeof verifyAgentJob!=='function'||await verifyAgentJob(job,request)!==true)fail('signed_job_unverified');
 if(typeof verifyOwnerWallet!=='function'||await verifyOwnerWallet(request.requestedRecipientWallet,request)!==true)fail('wallet_recipient_unverified');
 return Object.freeze({version:1,asset:'GIT',builder:'bubbles',customerId:request.customerId,
  jobId:request.jobId,repo:request.repo,commit:request.commit,recipientWallet:request.requestedRecipientWallet,
  status:'pending_independent_gitcoin_review',creditedGits:0});
}