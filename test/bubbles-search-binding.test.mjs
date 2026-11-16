import test from 'node:test';
import assert from 'node:assert/strict';
import {webSearch} from '../workers/bubbles-tools/search.mjs';
test('SearXNG service binding is preferred and retains its receiver and search options',async()=>{
 let calls=0;
 const SEARCH={async fetch(input,options){
  assert.equal(this,SEARCH);calls++;
  const url=new URL(input);assert.equal(url.hostname,'orange-brook-a2ac.marvaseater.workers.dev');
  assert.equal(url.searchParams.get('q'),'Lovilia Iowa');assert.equal(url.searchParams.get('format'),'json');
  assert.equal(options.redirect,'manual');assert.ok(options.signal);
  return Response.json({results:[{title:'Lovilia',url:'https://example.org/lovilia',content:'An Iowa city.',engine:'google cse'}]});
 }};
 const r=await webSearch('search Lovilia Iowa',{SEARCH},()=>{throw Error('public fetch must not run')});
 assert.equal(r.ok,true);assert.equal(r.results[0].snippet,'An Iowa city.');assert.equal(calls,1);
});
test('unavailable bound service yields failed search without invented results',async()=>{
 const r=await webSearch('search Lovilia',{SEARCH:{fetch:async()=>new Response('unavailable',{status:502})}});
 assert.equal(r.ok,false);assert.deepEqual(r.results,[]);assert.ok(r.attempts.includes('infinity_search_unavailable'));
});


test('temporary 503 in the existing Infinity search binding retries once and returns real verified rows',async()=>{
 let calls=0;
 const SEARCH={async fetch(input,options){
  calls++;
  assert.equal(this,SEARCH);
  assert.equal(options.redirect,'manual');
  if(calls===1)return new Response('temporarily unavailable',{status:503});
  return Response.json({results:[{title:'Actual retrieved document',url:'https://example.org/public/report',content:'Verified broker excerpt.',engine:'brave'}]});
 }};
 const answer=await webSearch('search public document',{SEARCH},()=>{throw Error('must use existing service binding')});
 assert.equal(calls,2);
 assert.equal(answer.ok,true);
 assert.equal(answer.results[0].title,'Actual retrieved document');
 assert.equal(answer.results[0].url,'https://example.org/public/report');
 assert.equal(answer.provider,'Infinity Phi / QuantaPhi search');
 assert.deepEqual(answer.attempts,[]);
});

test('search never retries authorization errors and never invents results when the broker stays down',async()=>{
 let forbiddenCalls=0;
 const forbidden=await webSearch('search public document',{SEARCH:{fetch:async()=>{forbiddenCalls++;return new Response('forbidden',{status:403})}}});
 assert.equal(forbiddenCalls,1,'authorization failures are not temporary');
 assert.equal(forbidden.ok,false);
 assert.equal(forbidden.results.length,0);
 let unavailableCalls=0;
 const unavailable=await webSearch('search public document',{SEARCH:{fetch:async()=>{unavailableCalls++;return new Response('outage',{status:503})}}});
 assert.equal(unavailableCalls,2,'no unbounded retries during downtime');
 assert.equal(unavailable.ok,false);
 assert.deepEqual(unavailable.results,[]);
 assert.ok(unavailable.attempts.includes('infinity_search_unavailable'));
});
