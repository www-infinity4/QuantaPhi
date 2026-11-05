import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {buildManifest} from '../gitcoin/line-receipts.mjs';
import {evaluateClaim} from '../gitcoin/verification.mjs';
import {gitCreditStatements,settleGitClaim} from '../gitcoin/settlement.mjs';
const diff='diff --git a/app.js b/app.js\n--- a/app.js\n+++ b/app.js\n@@ -0,0 +1,2 @@\n+const enabled = true;\n+export const ready = enabled;\n';
const manifest=(sha='a'.repeat(40))=>buildManifest(diff,{repo:'user/project',commit:sha,intent:'repair',builderClaim:'human',githubLoginClaim:'developer'});
const principal={id:'authenticated-developer',walletId:'customer-wallet'};
const adapters={principal,github:{getDiff:async()=>diff,containsCommitOnDefault:async()=>true,checksPassed:async()=>true,
 resolveAttribution:async()=>({valid:true,source:'verified_human_authorization',recipient:principal.walletId,evidenceId:'signed_authorization_123'})},
 quantAI:{review:async({lines})=>({reviewId:'quant_review_123',decisions:lines.map(l=>({id:l.id,approved:true,reason:'Useful source for the customer request'}))})}};
test('real SQLite ledger gives one GIT per verified line, rejects recipient replay and prevents delete/re-add reminting',async()=>{
 const first=manifest(),verified=await evaluateClaim(first,adapters);
 const readded=manifest('b'.repeat(40)),second=await evaluateClaim(readded,adapters);
 const plans=[gitCreditStatements(first,verified,principal),gitCreditStatements(first,verified,principal),gitCreditStatements(readded,second,principal)];
 const bad=gitCreditStatements(first,{...verified,recipient_wallet_id:'different-wallet'},principal);
 const result=JSON.parse(execFileSync('python3',['-c',`import sqlite3,json,sys
p=json.load(sys.stdin);d=sqlite3.connect(':memory:');d.executescript(p['schema'])
for batch in p['plans']:
 with d:
  for q in batch:d.execute(q['sql'],q['params'])
blocked=False
try:
 with d:
  for q in p['bad']:d.execute(q['sql'],q['params'])
except sqlite3.IntegrityError:blocked=True
print(json.dumps(dict(balance=d.execute('SELECT COALESCE(SUM(amount),0) FROM gitcoin_awards WHERE wallet_id=?',('customer-wallet',)).fetchone()[0],
 awards=d.execute('SELECT COUNT(*) FROM gitcoin_awards').fetchone()[0],history=d.execute('SELECT COUNT(*) FROM gitcoin_line_history').fetchone()[0],blocked=blocked)))
`],{input:JSON.stringify({schema:readFileSync(new URL('../gitcoin/schema.sql',import.meta.url),'utf8'),plans,bad}),encoding:'utf8'}));
 assert.deepEqual(result,{balance:2,awards:2,history:2,blocked:true});
});
test('settlement runs independent verification before any database write',async()=>{
 let writes=0;
 const db={prepare:()=>{throw Error('must_not_read')},batch:async()=>{writes++;throw Error('must_not_write')}};
 await assert.rejects(settleGitClaim(manifest(),{...adapters,github:{...adapters.github,checksPassed:async()=>false},db}),/ci_not_passing/);
 await assert.rejects(settleGitClaim(manifest(),{...adapters,github:{...adapters.github,resolveAttribution:async()=>({valid:true,source:'signed_agent_job',recipient:'operator-wallet',server_signature_verified:false})},db}),/attribution_unverified/);
 await assert.rejects(settleGitClaim(manifest(),{...adapters,github:{...adapters.github,resolveAttribution:async()=>({valid:true,source:'verified_human_authorization',recipient:principal.walletId})},db}),/attribution_receipt_required/);
 assert.equal(writes,0);
});
test('the complete server settlement executes and reads back real SQLite receipts, including replay and historical dedupe',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'git-settlement-')),path=join(dir,'ledger.sqlite');
 const run=payload=>JSON.parse(execFileSync('python3',['-c',`import sqlite3,json,sys
p=json.load(sys.stdin);d=sqlite3.connect(sys.argv[1]);d.row_factory=sqlite3.Row
if 'schema' in p:d.executescript(p['schema']);print('{}')
elif 'batch' in p:
 rows=[]
 with d:
  for q in p['batch']:
   d.execute(q['sql'],q['params']);rows.append(dict(meta=dict(changes=d.execute('SELECT changes()').fetchone()[0])))
 print(json.dumps(rows))
else:print(json.dumps(dict(results=[dict(x) for x in d.execute(p['sql'],p['params']).fetchall()])))
`,path],{input:JSON.stringify(payload),encoding:'utf8'}));
 try{
  run({schema:readFileSync(new URL('../gitcoin/schema.sql',import.meta.url),'utf8')});
  const db={prepare(sql){return {bind(...params){return {sql,params,async all(){return run({sql,params})}}}}},async batch(batch){return run({batch})}};
  const first=await settleGitClaim(manifest(),{...adapters,db});
  const replay=await settleGitClaim(manifest(),{...adapters,db});
  const readded=await settleGitClaim(manifest('b'.repeat(40)),{...adapters,db});
  assert.equal(first.credited,2);assert.equal(first.receiptIds.length,2);
  assert.equal(replay.credited,0);assert.equal(replay.alreadyCredited,2);
  assert.equal(readded.credited,0);assert.equal(readded.excludedHistorical.length,2);
  assert.equal(first.cashPaid,false);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
