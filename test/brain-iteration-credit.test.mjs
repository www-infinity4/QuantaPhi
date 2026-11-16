import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {captureBitContext} from '../workers/infinity-brain-clock/iteration-credit.mjs';

const workerUrl=new URL('../workers/infinity-brain-clock/worker.js',import.meta.url);
const source=readFileSync(workerUrl,'utf8')
 .replace("import { DurableObject } from 'cloudflare:workers';",'class DurableObject {constructor(){}}')
 .replace(/(['"])(\.\.?\/[^'"\n]+\.mjs)\1/g,(_,quote,path)=>quote+new URL(path,workerUrl).href+quote);
const {BrainClock}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));

test('real Brain direct execution persists a pending Bit, retries settlement without rerunning GitHub, and recovers after response loss',async()=>{
 const data=new Map([['bot-work-recipient',{userId:'customer_123'}]]),tasks=[];
 const storage={get:async k=>structuredClone(data.get(k)),put:async(k,v)=>data.set(k,structuredClone(v)),delete:async k=>data.delete(k)};
 let githubCalls=0,walletCalls=0,online=false;
 const env={BUBBLE_BITS_ENABLED:'1',WRITER_OWNER_HASH:'a'.repeat(64),GITHUB_TOKEN:'synthetic-github-fixture',BOT_WORK_SECRET:'synthetic-service-fixture',
  BOT_WALLET:{async fetch(url,init){walletCalls++;if(!online)throw Error('offline');const input=JSON.parse(init.body);return Response.json({ok:true,asset:'BUBBLE_BIT',amount:1,receiptId:input.receiptId,creditId:input.receiptId});}}};
 const ctx={storage,blockConcurrencyWhile:async f=>f(),waitUntil:p=>tasks.push(p)};
 const clock=new BrainClock(ctx,env);
 const proof=await captureBitContext(storage,env,{sessionId:'conversation_123',query:'Read Bubbles source before repairing chat progress'});
 const originalFetch=globalThis.fetch;
 globalThis.fetch=async url=>{githubCalls++;assert.match(String(url),/api.github.com\/repos\/www-infinity4\/QuantaPhi\/contents\/app.js/);return Response.json({type:'file',size:18,encoding:'base64',content:btoa('const ready=true;'),sha:'b'.repeat(40)});};
 try{
  const requestId='22222222-2222-4222-8222-222222222222';
  const body={action:'read_file',repository:'www-infinity4/QuantaPhi',path:'app.js',ref:'main',requestId,sessionId:proof.sessionId,bitContext:proof};
  assert.equal((await clock.directGithub(body)).status,'working');
  await Promise.all(tasks);
  let saved=await clock.directGithub({action:'receipt',requestId});
  assert.equal(saved.receipts.length,1);assert.equal(saved.receipts[0].receipt.tool,'github.read_file');
  assert.equal(saved.receipts[0].bit.status,'pending');assert.equal(githubCalls,1);
  online=true;
  saved=await clock.directGithub({action:'receipt',requestId});
  assert.equal(saved.receipts[0].bit.status,'credited');assert.equal(saved.receipts[0].bit.amount,1);
  const paidCalls=walletCalls;
  saved=await clock.directGithub({action:'receipt',requestId});
  await clock.directGithub(body);
  assert.equal(githubCalls,1);assert.equal(walletCalls,paidCalls);
  assert.equal(saved.receipts[0].receipt.id,saved.receipts[0].bit.creditId);
  assert.ok(!JSON.stringify(saved.receipts).includes('const ready'));
 }finally{globalThis.fetch=originalFetch;}
});
