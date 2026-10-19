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
