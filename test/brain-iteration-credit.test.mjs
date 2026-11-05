import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workerUrl=new URL('../workers/infinity-brain-clock/worker.js',import.meta.url);
const source=readFileSync(workerUrl,'utf8')
 .replace("import { DurableObject } from 'cloudflare:workers';",'class DurableObject {constructor(){}}')
 .replace(/(['"])(\.\.?\/[^'"\n]+\.mjs)\1/g,(_,quote,path)=>quote+new URL(path,workerUrl).href+quote);
const {BrainClock}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

async function runBrainCredit({outboxFailure=false}={}){
 const data=new Map([['bot-work-recipient',{userId:'customer_123'}]]),tasks=[];
 const storage={get:async k=>structuredClone(data.get(k)),delete:async k=>data.delete(k),async put(key,value){
  if(typeof key==='string'){data.set(key,structuredClone(value));return;}
  const entries=Object.entries(key);
  assert.ok(entries.some(([key])=>key.startsWith('bit-credit-retry:')));
  assert.ok(entries.some(([key])=>key.startsWith('direct-github:')));
  if(outboxFailure)throw Error('fixture_atomic_storage_failure');
  for(const [key,value] of entries)data.set(key,structuredClone(value));
 }};
 const WORK_DB={prepare:()=>({bind(){return this},run:async()=>({}),all:async()=>({results:[]}),first:async()=>null})};
 const head='c'.repeat(40),steps=[{action:'read_repository'},{action:'read_file',args:{path:'app.js',ref:head}},{action:'finish',summary:'Read repository and source.'}];
 let githubCalls=0,walletCalls=0,online=false;
 const env={BUBBLE_BITS_ENABLED:'1',WRITER_OWNER_HASH:'a'.repeat(64),GITHUB_TOKEN:'synthetic-github-fixture',BOT_WORK_SECRET:'synthetic-service-fixture',
  WORK_DB,WRITER_AI:{run:async()=>({response:JSON.stringify(steps.shift())})},
  BOT_WALLET:{async fetch(url,init){walletCalls++;if(!online)throw Error('offline');const input=JSON.parse(init.body);return Response.json({ok:true,asset:'BUBBLE_BIT',amount:1,receiptId:input.receiptId,creditId:input.receiptId});}}};
 const ctx={storage,blockConcurrencyWhile:async f=>f(),waitUntil:p=>tasks.push(p)};
 const clock=new BrainClock(ctx,env);
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async url=>{
  githubCalls++;
  assert.match(String(url),/^https:\/\/api.github.com\/repos\/www-infinity4\/QuantaPhi/);
  if(url.includes('/contents/app.js'))return Response.json({type:'file',size:18,encoding:'base64',content:btoa('const ready=true;'),sha:'b'.repeat(40)});
  if(url.includes('/git/ref/heads/'))return Response.json({object:{sha:head}});
  return Response.json({default_branch:'main',full_name:'www-infinity4/QuantaPhi'});
 };
 try{
  const requestId='22222222-2222-4222-8222-222222222222';
  const body={action:'assist',repository:'www-infinity4/QuantaPhi',mode:'read',request:'Read the source before repairing chat progress',
   requestId,sessionId:'conversation_123',bitContext:{goal:'Unrelated replay'},userId:'wrong_customer'};
  assert.equal((await clock.directGithub(body)).status,'working');
  await Promise.all(tasks);
  let saved=await clock.directGithub({action:'receipt',requestId});
  if(outboxFailure){
   assert.equal(saved.status,'blocked');
   assert.equal(saved.error,'fixture_atomic_storage_failure');
   assert.equal(saved.receipts.length,0,'a failed atomic save cannot expose an orphan pending receipt');
   assert.equal(walletCalls,0);
   assert.ok(![...data.keys()].some(key=>key.startsWith('bit-credit-retry:')));
   return;
  }
  assert.equal(saved.status,'inspected');
  assert.deepEqual(saved.receipts.map(x=>x.receipt.tool),['github.read_repository','github.read_file']);
  assert.ok(saved.receipts.every(x=>x.bit.status==='pending'));
  assert.ok(saved.receipts.every(x=>x.bitCredit.goal===body.request&&x.bitCredit.userId==='customer_123'));
  assert.equal([...data.keys()].filter(key=>key.startsWith('bit-credit-retry:')).length,2);
  const sourceCalls=githubCalls;
  online=true;
  saved=await clock.directGithub({action:'receipt',requestId});
  assert.ok(saved.receipts.every(x=>x.bit.status==='credited'&&x.bit.amount===1&&x.receipt.id===x.bit.creditId));
  const paidCalls=walletCalls;
  saved=await clock.directGithub({action:'receipt',requestId});
  await clock.directGithub(body);
  assert.equal(githubCalls,sourceCalls);assert.equal(walletCalls,paidCalls);
  assert.ok(!JSON.stringify(saved.receipts).includes('const ready'));
 }finally{globalThis.fetch=originalFetch;}
}
test('real Brain direct execution persists pending Bits and settles without rerunning GitHub',()=>runBrainCredit());
test('an interrupted receipt and outbox multi-put leaves no partial credit',()=>runBrainCredit({outboxFailure:true}));
