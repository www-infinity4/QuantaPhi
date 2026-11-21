import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {captureBitContext,resolveBitContext,githubIteration,deliverBitCredit,retryBitCredits} from '../workers/infinity-brain-clock/iteration-credit.mjs';
import {bitCreditSchema,bitCreditStatement,validateBitCredit} from '../workers/unified-wallet/bubble-bit-credit.mjs';
import wallet from '../workers/unified-wallet/worker.js';

const owner='a'.repeat(64),requestId='11111111-1111-4111-8111-111111111111';
function storage(){const data=new Map([['bot-work-recipient',{userId:'customer_123'}]]);return {data,async get(k){return data.get(k)},async put(k,v){data.set(k,structuredClone(v))},async delete(k){data.delete(k)}};}
const env={BUBBLE_BITS_ENABLED:'1',WRITER_OWNER_HASH:owner};
async function context(s,query='Repair Bubbles chat iteration progress'){
 const c=await captureBitContext(s,env,{sessionId:'conversation_123',query});
 return resolveBitContext(s,env,{bitContext:c,sessionId:c.sessionId});
}
test('context proof is server stored, owner/session bound, expiring and recipient cannot come from the browser',async()=>{
 const s=storage(),c=await captureBitContext(s,env,{sessionId:'conversation_123',query:'Repair real chat progress'});
 assert.equal((await resolveBitContext(s,env,{bitContext:c,sessionId:c.sessionId,userId:'attacker'})).userId,'customer_123');
 assert.equal(await resolveBitContext(s,env,{bitContext:c,sessionId:'other_conversation'}),null);
 assert.equal(await resolveBitContext(s,{...env,WRITER_OWNER_HASH:'b'.repeat(64)},{bitContext:c,sessionId:c.sessionId}),null);
 assert.equal(await resolveBitContext(s,env,{bitContext:{...c,id:'ctx_forged_123456'},sessionId:c.sessionId}),null);
 const row=s.data.get('bit-context:'+c.id);row.expiresAt=0;
 assert.equal(await resolveBitContext(s,env,{bitContext:c,sessionId:c.sessionId}),null);
});
test('real read, commit and test results produce distinct stable receipts, dispatch never becomes a test',async()=>{
 const s=storage(),ctx=await context(s);
 const record={requestId,bitContext:ctx};
 const read=await githubIteration(env,record,{ok:true,sha:'c'.repeat(40)},{action:'read_file',repository:'www-infinity4/QuantaPhi',path:'app.js'},0);
 const commit=await githubIteration(env,record,{ok:true,status:'committed_unverified',commitSha:'d'.repeat(40)},{action:'commit_files',repository:'www-infinity4/QuantaPhi'},1);
 assert.equal(read.receipt.tool,'github.read_file');assert.equal(commit.receipt.tool,'github.commit');
 assert.notEqual(read.receipt.id,commit.receipt.id);
 assert.equal((await githubIteration(env,record,{ok:true,sha:'c'.repeat(40)},{action:'read_file',repository:'www-infinity4/QuantaPhi',path:'app.js'},0)).receipt.id,read.receipt.id);
 assert.equal((await githubIteration(env,record,{ok:true,sha:'c'.repeat(40)},{action:'read_file',repository:'www-infinity4/QuantaPhi',path:'app.js'},9)).receipt.id,read.receipt.id,'the same source read within a job cannot become a renamed reward');
 assert.equal(await githubIteration(env,record,{ok:true,status:'dispatch_accepted'},{action:'dispatch_workflow',repository:'www-infinity4/QuantaPhi'},2),null);
 assert.equal(await githubIteration(env,record,{ok:false,status:'blocked'},{action:'commit_files',repository:'www-infinity4/QuantaPhi'},3),null);
 assert.equal(await githubIteration(env,record,{ok:true,exists:false},{action:'read_file',repository:'www-infinity4/QuantaPhi',path:'missing.js'},4),null);
 const run=await githubIteration(env,record,{ok:true,status:'workflow_run_read',run:{status:'in_progress',conclusion:null,headSha:'d'.repeat(40)}},{action:'read_run',repository:'www-infinity4/QuantaPhi'},5);
 assert.equal(run.receipt.tool,'github.read_repository');
});
test('settlement failure preserves a pending packet; only matching wallet readback confirms one credit',async()=>{
 const s=storage(),ctx=await context(s),record={requestId,bitContext:ctx};
 const iteration=await githubIteration(env,record,{ok:true,sha:'c'.repeat(40)},{action:'read_file',repository:'www-infinity4/QuantaPhi',path:'app.js'},0);
 const down=await deliverBitCredit({...env,BOT_WORK_SECRET:'fixture',BOT_WALLET:{fetch:async()=>{throw Error('offline')}}},iteration);
 assert.equal(down.status,'pending');assert.equal(down.amount,0);
 let captured;
 const service={fetch:async(url,init)=>{captured=JSON.parse(init.body);return Response.json({ok:true,asset:'BUBBLE_BIT',receiptId:iteration.receipt.id,creditId:iteration.receipt.id,amount:1})}};
 const paid=await deliverBitCredit({...env,BOT_WORK_SECRET:'fixture',BOT_WALLET:service},iteration);
 assert.equal(paid.status,'credited');assert.equal(paid.amount,1);assert.equal(captured.userId,'customer_123');
 assert.equal(validateBitCredit(captured).receiptId,iteration.receipt.id);
 const wrong={fetch:async()=>Response.json({ok:true,asset:'BUBBLE_BIT',receiptId:'wrong_receipt_123',amount:1})};
 assert.equal((await deliverBitCredit({...env,BOT_WORK_SECRET:'fixture',BOT_WALLET:wrong},iteration)).status,'pending');
});
test('actual SQLite ledger credits each receipt once, isolates users and refuses a renamed recipient replay',async()=>{
 const s=storage(),ctx=await context(s),record={requestId,bitContext:ctx};
 const it=await githubIteration(env,record,{ok:true,sha:'c'.repeat(40)},{action:'read_file',repository:'www-infinity4/QuantaPhi',path:'app.js'},0);
 const input=validateBitCredit(it.credit),one=bitCreditStatement(input,10);
 const other=bitCreditStatement({...input,receiptId:'bb_'+'b'.repeat(64),userId:'other_customer'},11);
 const conflict=bitCreditStatement({...input,userId:'other_customer'},12);
 const result=JSON.parse(execFileSync('python3',['-c',`import sqlite3,json,sys
p=json.load(sys.stdin);d=sqlite3.connect(':memory:')
for sql in p['schema']:d.execute(sql)
for plan in [p['one'],p['one'],p['other'],p['conflict']]:
 with d:d.execute(plan['sql'],plan['params'])
print(json.dumps(dict(d.execute('SELECT user_id,COUNT(*) FROM bubble_bit_credits GROUP BY user_id').fetchall())))
`],{input:JSON.stringify({schema:bitCreditSchema,one,other,conflict}),encoding:'utf8'}));
 assert.deepEqual(result,{customer_123:1,other_customer:1});
});
test('public and disabled callers cannot issue a Bubble Bit',async()=>{
 const req=()=>new Request('https://wallet/internal/bubble-bit-credit',{method:'POST',body:'{}'});
 const r=await wallet.fetch(req(),{BOT_WORK_SECRET:'fixture'});
 assert.equal(r.status,401);
 const disabled=await wallet.fetch(new Request('https://wallet/internal/bubble-bit-credit',{method:'POST',headers:{'X-Bot-Work-Key':'fixture'},body:'{}'}),{BOT_WORK_SECRET:'fixture'});
 assert.equal(disabled.status,503);
});
test('alarm retries retain pending work on an outage and save a per-receipt proof without rewriting source steps',async()=>{
 const s=storage(),ctx=await context(s),record={requestId,bitContext:ctx};
 const iteration=await githubIteration(env,record,{ok:true,sha:'c'.repeat(40)},{action:'read_file',repository:'www-infinity4/QuantaPhi',path:'app.js'},0);
 const recordKey='direct-github:'+requestId;
 await s.put(recordKey,{receipts:[{receipt:iteration.receipt,bit:iteration.bit,bitCredit:iteration.credit}]});
 await s.put('bit-credit-retry:0000000000000000:'+iteration.receipt.id,{recordKey,receiptId:iteration.receipt.id,retryAfter:0});
 s.list=async({prefix,limit})=>new Map([...s.data].filter(([key])=>key.startsWith(prefix)).sort().slice(0,limit));
 await retryBitCredits(s,env);
 const queued=[...s.data].find(([key])=>key.startsWith('bit-credit-retry:'));
 assert.ok(queued,'an unavailable wallet must retain delivery');
 queued[1].retryAfter=0;
 const walletEnv={...env,BOT_WORK_SECRET:'fixture',BOT_WALLET:{fetch:async()=>Response.json({ok:true,asset:'BUBBLE_BIT',amount:1,receiptId:iteration.receipt.id,creditId:iteration.receipt.id})}};
 await retryBitCredits(s,walletEnv);
 assert.equal((await s.get('bit-credit-proof:'+iteration.receipt.id)).status,'credited');
 assert.equal((await s.get(recordKey)).receipts.length,1);
 assert.equal([...s.data].filter(([key])=>key.startsWith('bit-credit-retry:')).length,0);
});

test('verified GitHub research and PR receipts pass the same Bubble Bits wallet validator',async()=>{
 const s=storage(),ctx=await context(s);
 const record={requestId,repository:'www-infinity4/QuantaPhi',bitContext:ctx};
 const cases=[
  [{action:'capabilities',repository:record.repository},{ok:true,status:'credential_verified_read'},'github.capabilities'],
  [{action:'list_workflows',repository:record.repository},{ok:true,complete:true,workflows:[]},'github.list_workflows'],
  [{action:'list_runs',repository:record.repository},{ok:true,status:'runs_read_only',runs:[],complete:true},'github.list_runs'],
  [{action:'create_pr',repository:record.repository},{ok:true,status:'pull_request_open',number:1845},'github.create_pr']
 ];
 for(const [operation,result,expectedTool] of cases){
  const step=await githubIteration(env,record,result,operation,0);
  assert.equal(step?.receipt?.tool,expectedTool);
  assert.equal(step?.credit?.tool,expectedTool);
  assert.equal(validateBitCredit(step.credit).receiptId,step.receipt.id,
   expectedTool+' should be accepted by the wallet credit schema');
 }
});
test('workflow dispatch acceptance remains observation-only, not an earned Bubble Bit',async()=>{
 const s=storage(),ctx=await context(s),record={requestId,repository:'www-infinity4/QuantaPhi',bitContext:ctx};
 const item=await githubIteration(env,record,{ok:true,status:'dispatch_accepted',completed:false},
  {action:'dispatch_workflow',repository:record.repository},0);
 assert.equal(item?.receipt?.tool,'github.dispatch_workflow');
 assert.equal(item?.credit,undefined,'dispatch is not proof that the job executed');
 assert.equal(item?.bit?.amount,0);
});
