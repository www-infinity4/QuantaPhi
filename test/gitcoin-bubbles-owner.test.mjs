import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {buildManifest} from '../gitcoin/line-receipts.mjs';
import {evaluateClaim,createSettlementPlan} from '../gitcoin/verification.mjs';
import {gitCreditStatements,settleGitClaim} from '../gitcoin/settlement.mjs';
const diff='diff --git a/app.js b/app.js\n--- /dev/null\n+++ b/app.js\n@@ -0,0 +1 @@\n+export const useful = true;';
const binding={bindingId:'bubbles_owner_binding',walletId:'wallet/kris-fixture',ownerSubject:'verified-owner-fixture',active:true,ownerVerified:true};
const source=(builder='bubbles')=>buildManifest(diff,{repo:'customer/project',commit:'a'.repeat(40),intent:'app',builderClaim:builder});
function context(customer='customer-A'){
 const principal={id:customer,walletId:'wallet/'+customer,executionChannel:'bubbles'};
 const attribution={valid:true,source:'signed_agent_job',server_signature_verified:true,executionChannel:'bubbles',
  customerId:customer,customerWalletId:principal.walletId,customerAuthorizationVerified:true,
  executorBindingId:binding.bindingId,recipient:binding.walletId,evidenceId:'signed_job_'+customer};
 return {principal,github:{getDiff:async()=>diff,containsCommitOnDefault:async()=>true,checksPassed:async()=>true,resolveAttribution:async()=>attribution},
  quantAI:{review:async({lines})=>({reviewId:'review_owner_123',decisions:lines.map(l=>({id:l.id,approved:true,reason:'Verified useful customer code'}))})},
  bubblesExecutor:{resolve:async()=>binding},attribution};
}
test('every customer using Bubbles earns GIT only for the configured owner executor',async()=>{
 for(const customer of ['customer-A','customer-B']){
  const result=await evaluateClaim(source(),context(customer));
  assert.equal(result.recipient_wallet_id,binding.walletId);
  assert.equal(result.recipient_policy,'bubbles_owner_executor_v1');
  assert.equal(result.customer_id,customer);
  assert.equal(createSettlementPlan(result)[0].wallet_id,binding.walletId);
 }
});
test('Bubbles rejects a signed customer-recipient receipt, absent owner binding and wrong operator binding',async()=>{
 const c=context();
 c.attribution.recipient=c.principal.walletId;
 await assert.rejects(evaluateClaim(source(),c),/bubbles_owner_recipient_required/);
 const absent=context();absent.bubblesExecutor.resolve=async()=>null;
 await assert.rejects(evaluateClaim(source(),absent),/bubbles_executor_not_configured/);
 const wrong=context();wrong.attribution.executorBindingId='different_binding';
 await assert.rejects(evaluateClaim(source(),wrong),/bubbles_executor_binding_mismatch/);
});
test('customer builder labels cannot bypass the authenticated Bubbles execution channel',async()=>{
 const c=context();
 const result=await evaluateClaim(source('human'),c);
 assert.equal(result.recipient_wallet_id,binding.walletId);
 c.attribution.executionChannel='github_cli';
 await assert.rejects(evaluateClaim(source('human'),c),/execution_channel_mismatch/);
 const disguised=context();disguised.attribution.customerId='different-customer';
 await assert.rejects(evaluateClaim(source(),disguised),/bubbles_customer_authorization_required/);
});
test('Bubbles settlement cannot use a caller-supplied owner binding or write without server configuration',async()=>{
 const c=context();let writes=0,reads=0;
 const db={prepare(){reads++;return {async first(){return null;}}},async batch(){writes++;}};
 await assert.rejects(settleGitClaim(source(),{...c,db}),/bubbles_executor_not_configured/);
 assert.equal(reads,1);assert.equal(writes,0);
});
test('the SQL award guard rejects customer credit even if an internal settlement result is forged',async()=>{
 const c=context(),claim=source(),verified=await evaluateClaim(claim,c);
 const forged={...verified,recipient_wallet_id:c.principal.walletId,executor_wallet_id:c.principal.walletId};
 const plan=gitCreditStatements(claim,forged,c.principal);
 const result=JSON.parse(execFileSync('python3',['-c',`import sqlite3,json,sys
p=json.load(sys.stdin);d=sqlite3.connect(':memory:');d.executescript(p['schema'])
d.execute('INSERT INTO gitcoin_bubbles_executor VALUES(1,?,?,?,?,?)',p['binding']);d.commit()
blocked=False
try:
 with d:
  for q in p['plan']:d.execute(q['sql'],q['params'])
except sqlite3.IntegrityError:blocked=True
print(json.dumps(dict(blocked=blocked,awards=d.execute('SELECT COUNT(*) FROM gitcoin_awards').fetchone()[0],claims=d.execute('SELECT COUNT(*) FROM gitcoin_line_claims').fetchone()[0])))
`],{input:JSON.stringify({schema:readFileSync(new URL('../gitcoin/schema.sql',import.meta.url),'utf8'),binding:[binding.bindingId,binding.walletId,binding.ownerSubject,1,1],plan}),encoding:'utf8'}));
 assert.deepEqual(result,{blocked:true,awards:0,claims:0});
});
