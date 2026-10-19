import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const worker=readFileSync(new URL('../workers/infinity-brain-clock/worker.js',import.meta.url),'utf8');
const client=readFileSync(new URL('../bubbles-ai.js',import.meta.url),'utf8');
const start=worker.indexOf(' async directGithub(body){');
const end=worker.indexOf(' async fetch(request){',start);

test('direct GitHub creates one durable receipt and responds before a slow operation finishes',async()=>{
 assert.ok(start>=0&&end>start,'Durable Object GitHub methods exist');
 const methods=worker.slice(start,end);
 const factory=new Function('validateRepository','githubEnvironment','githubOperation','directGithubAgent',
  'return class Harness {'+methods+'}');
 let finish,executions=0;
 const gate=new Promise(resolve=>{finish=resolve;});
 const Harness=factory(value=>{assert.equal(value,'www-infinity4/QuantaPhi');return value;},
  async env=>env,async()=>{executions++;return gate;},async()=>{throw Error('unexpected agent');});
 const data=new Map(),waited=[];
 const app=new Harness();
 app.env={};
 app.ctx={storage:{get:async k=>data.get(k),put:async(k,v)=>{data.set(k,v);},delete:async k=>data.delete(k)},
  blockConcurrencyWhile:async fn=>fn(),waitUntil:promise=>waited.push(promise)};
 app.emit=async()=>{};
 const requestId='ad99f94b-75bd-4557-aaee-793a18004c3b';
 const body={repository:'www-infinity4/QuantaPhi',action:'capabilities',requestId};
 const accepted=await app.directGithub(body);
 assert.equal(accepted.status,'working');
 assert.equal(accepted.requestId,requestId);
 assert.equal(waited.length,1);
 assert.equal((await app.directGithub({action:'receipt',requestId})).status,'working');
 assert.equal((await app.directGithub(body)).status,'working');
 assert.equal(waited.length,1,'replay never launches a second executor');
 finish({ok:true,status:'credential_verified_read',push:true});
 await waited[0];
 const receipt=await app.directGithub({action:'receipt',requestId});
 assert.equal(receipt.status,'credential_verified_read');
 assert.equal(receipt.receipts.length,1);
 assert.ok(receipt.finishedAt);
 assert.equal(executions,1);
 assert.equal(data.has('repository-lease:www-infinity4/QuantaPhi'),false);
});

test('the website preserves and polls the original request ID; no false merge or deployment claim',()=>{
 assert.ok(client.includes("body:JSON.stringify({action:'receipt',requestId})"));
 assert.ok(client.includes('watchDirectGithubReceipt(requestId)'));
 assert.ok(client.includes('operation.requestId||crypto.randomUUID()'));
 assert.ok(client.includes('Testing, merge and deployment require separate verified receipts'));
 assert.ok(worker.includes('this.ctx.waitUntil(this.completeDirectGithub('));
});
