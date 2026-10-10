const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto').webcrypto;
const TOKEN='sq_'+'a'.repeat(40);
const QUEUE='phi:pendingStarCoinReceipts:v1';
const runtime=fs.readFileSync('wallet-runtime.js','utf8');
const from=runtime.indexOf("  const REWARD_QUEUE='phi:pendingStarCoinReceipts:v1';");
const to=runtime.indexOf("  for(const event of ['load','online','focus'])window.addEventListener(event,flushStarReceipts);",from);
assert.ok(from>=0 && to>from, 'extract exact deployed payout implementation');
const implementation=runtime.slice(from,to);
function setup({tokens=true,response}={}){
 const data=new Map(),events=[],calls=[];
 const read=(key,fallback)=>JSON.parse(data.get(key)||JSON.stringify(fallback));
 const write=(key,value)=>{data.set(key,JSON.stringify(value));return true};
 const window={QuantaCloudConnection:{resolveDeviceToken:async()=>tokens?TOKEN:''},dispatchEvent:e=>events.push(e)};
 const document={title:'QuantaPhi',getElementById:()=>null};
 const fetch=async(url,opts)=>{
  calls.push({url,opts});
  return response?response(url,opts):{ok:true,status:200,json:async()=>({ok:true,credited:true,duplicate:false})};
 };
 const context={window,document,crypto,TextEncoder,Uint8Array,CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts?.detail}},AbortSignal:{timeout:()=>undefined},read,write,starQuestDeviceToken:()=>'',refreshStarCoinCloud:async()=>events.push({type:'cloud-refresh'}),console:{warn(){}},fetch,setTimeout:()=>0};
 vm.runInNewContext("const STARQUEST_ENDPOINT='https://starquest-ledger.marvaseater.workers.dev';\n"+implementation+'\nglobalThis.payout={queueStarReceipt,flushStarReceipts};',context);
 return {payout:context.payout,data,calls,events};
}
test('Collect/Star/Share payout receipts use enrolled StarQuest identity even without an Infinity wallet class',async()=>{
 const state=setup();
 state.data.set(QUEUE,JSON.stringify([{attemptId:'collect-id',contentId:'card-1',method:'collect'},{attemptId:'star-id',contentId:'card-1',method:'star'},{attemptId:'share-id',contentId:'card-1',method:'web_share_api'}]));
 const r=await state.payout.flushStarReceipts();
 assert.equal(r.ok,true);
 assert.equal(r.pending,0);
 assert.equal(state.calls.length,3);
 for(const call of state.calls){
  assert.equal(call.url,'https://starquest-ledger.marvaseater.workers.dev/v1/shares');
  assert.equal(call.opts.headers.authorization,'Bearer '+TOKEN);
 }
 assert.equal(state.events.some(e=>e.type==='cloud-refresh'),true);
});
test('A rejected or unreachable StarQuest payout never destroys a pending reward',async()=>{
 const state=setup({response:async()=>({ok:false,status:401,json:async()=>({ok:false,error:'invalid_device_token'})})});
 state.data.set(QUEUE,JSON.stringify([{attemptId:'one',contentId:'card-one',method:'collect'}]));
 const result=await state.payout.flushStarReceipts();
 assert.equal(result.ok,false);
 assert.equal(JSON.parse(state.data.get(QUEUE)).length,1);
 assert.equal(state.calls.length,1);
});
test('Retrying an already-credited idempotency key acknowledges it once and drains the outbox',async()=>{
 const state=setup({response:async()=>({ok:true,status:200,json:async()=>({ok:true,credited:false,duplicate:true})})});
 state.data.set(QUEUE,JSON.stringify([{attemptId:'same',contentId:'card-one',method:'collect'}]));
 const result=await state.payout.flushStarReceipts();
 assert.equal(result.ok,true);
 assert.equal(result.pending,0);
});
test('Without enrolled device connection the reward remains queued',async()=>{
 const state=setup({tokens:false});
 state.data.set(QUEUE,JSON.stringify([{attemptId:'one',contentId:'story',method:'star'}]));
 const result=await state.payout.flushStarReceipts();
 assert.equal(result.pending,1);
 assert.equal(state.calls.length,0);
});
