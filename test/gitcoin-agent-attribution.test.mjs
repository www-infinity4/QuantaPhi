import test from 'node:test';
import assert from 'node:assert/strict';
import {stageBubblesBuildClaim} from '../gitcoin/agent-attribution.mjs';
const sha='a'.repeat(40);
const request={customerId:'customer-7',jobId:'job-signed-12345',repo:'customer/project',
  commit:sha,requestedRecipientWallet:'owner-wallet',builder:'bubbles'};
const grant={customerId:'customer-7',jobId:'job-signed-12345',repo:'customer/project',
  recipientWallet:'owner-wallet',asset:'GIT',permission:'earn_from_agent_built_code'};
const job={jobId:'job-signed-12345',customerId:'customer-7',repo:'customer/project',
  commit:sha,builder:'bubbles',result:'commit_written'};
const approved={verifyCustomerGrant:async()=>true,verifyAgentJob:async()=>true,
  verifyOwnerWallet:async()=>true};
test('valid signed multi-party evidence stages only a pending Bubbles GIT claim',async()=>{
 const x=await stageBubblesBuildClaim({request,grant,job,...approved});
 assert.equal(x.status,'pending_independent_gitcoin_review');
 assert.equal(x.recipientWallet,'owner-wallet');
 assert.equal(x.creditedGits,0);
 assert.equal(x.commit,sha);
});
test('no customer consent means no attribution',async()=>{
 await assert.rejects(stageBubblesBuildClaim({request,grant:null,job,...approved}),/consent/);
 await assert.rejects(stageBubblesBuildClaim({request,grant,job,...approved,verifyCustomerGrant:async()=>false}),/consent/);
});
test('reject cross-user, cross-repo, cross-wallet and cross-job reuse',async()=>{
 for(const changes of [{request:{...request,customerId:'victim'}},
   {grant:{...grant,recipientWallet:'other-wallet'}},
   {job:{...job,commit:'b'.repeat(40)}},
   {grant:{...grant,jobId:'another-job'}}]){
    await assert.rejects(stageBubblesBuildClaim({request,grant,job,...approved,...changes}),/mismatch/);
 }
});
test('independently signed job and wallet evidence is required',async()=>{
 await assert.rejects(stageBubblesBuildClaim({request,grant,job,...approved,verifyAgentJob:async()=>false}),/signed_job/);
 await assert.rejects(stageBubblesBuildClaim({request,grant,job,...approved,verifyOwnerWallet:async()=>false}),/wallet/);
});
test('a GPT or Copilot job is not relabeled as Bubbles',async()=>{
 await assert.rejects(stageBubblesBuildClaim({request,grant,job:{...job,builder:'gpt'},...approved}),/builder/);
});