import test from 'node:test';
import assert from 'node:assert/strict';
import {handleTrafficRequest} from '../workers/site-traffic/worker.mjs';

const now=new Date('2026-11-22T18:00:00.000Z');
const records=[{date:'2026-11-22',requests:1234,page_views:567,verified_at:now.toISOString()}];
function memoryCache(){
 const values=new Map();
 return {async match(key){return values.get(key.url)?.clone();},async put(key,value){values.set(key.url,value.clone());}};
}
function ledger(){
 const state={reads:0,fail:false};
 state.db={prepare(){return {async all(){state.reads++;if(state.fail)throw Error("D1_ERROR: Your account has exceeded D1's free tier daily row read limit. Upgrade");return {results:records};}};}};
 return state;
}
const request=()=>new Request('https://quantaphi.org/api/site-traffic');
test('repeated public traffic reads share one verified snapshot without rescanning D1',async()=>{
 const cache=memoryCache(),state=ledger();
 const first=await handleTrafficRequest(request(),{TRAFFIC_LEDGER:state.db},{now,cache});
 const second=await handleTrafficRequest(new Request(request().url+'?ignored=unique'),{TRAFFIC_LEDGER:state.db},{now,cache});
 assert.equal(first.status,200);assert.equal(second.status,200);
 assert.equal((await second.json()).pageViews,567);
 assert.equal(state.reads,1,'arbitrary query strings must not multiply ledger scans');
});
test('database quota outage retains a verified snapshot and reports refresh failure honestly',async()=>{
 const cache=memoryCache(),state=ledger();
 await handleTrafficRequest(request(),{TRAFFIC_LEDGER:state.db},{now,cache});
 state.fail=true;
 const later=new Date(now.getTime()+10*60*1000);
 const response=await handleTrafficRequest(new Request(request().url+'?refresh=1'),{
  TRAFFIC_LEDGER:state.db,SITE_TRAFFIC_CLOUDFLARE_TOKEN:'test-only-not-a-real-token'
 },{now:later,cache});
 assert.equal(response.status,200);
 const result=await response.json();
 assert.equal(result.pageViews,567);
 assert.equal(result.fetchedAt,now.toISOString());
 assert.equal(result.refreshStatus,'failed');
 assert.equal(result.storageStatus,'unavailable');
 assert.equal(result.retryAt,'2026-11-23T00:00:00.000Z');
 assert.equal(response.headers.get('Cache-Control'),'no-store');
 assert.ok(!JSON.stringify(result).includes('Upgrade'),'provider billing details are not a public error message');
});
test('quota outage without a verified snapshot remains unavailable instead of inventing totals',async()=>{
 const state=ledger();state.fail=true;
 const response=await handleTrafficRequest(request(),{TRAFFIC_LEDGER:state.db},{now,cache:memoryCache()});
 assert.equal(response.status,503);
 assert.equal((await response.json()).error,'traffic_ledger_unavailable');
});
test('cache failures do not prevent reading the existing durable ledger',async()=>{
 const state=ledger();
 const cache={async match(){throw Error('cache offline');},async put(){throw Error('cache offline');}};
 const response=await handleTrafficRequest(request(),{TRAFFIC_LEDGER:state.db},{now,cache});
 assert.equal(response.status,200);assert.equal((await response.json()).pageViews,567);
});
test('manual provider refresh is not replaced by a cached success older than its cooldown',async()=>{
 const cache=memoryCache(),state=ledger();
 await handleTrafficRequest(request(),{TRAFFIC_LEDGER:state.db},{now,cache});
 let calls=0;
 const response=await handleTrafficRequest(new Request(request().url+'?refresh=1'),{
  TRAFFIC_LEDGER:state.db,SITE_TRAFFIC_CLOUDFLARE_TOKEN:'test-only-not-a-real-token'
 },{now:new Date(now.getTime()+10*60*1000),cache,fetcher:async()=>{calls++;throw Error('provider offline');}});
 assert.equal(calls,1);assert.equal((await response.json()).refreshStatus,'failed');
});
test('a known storage outage remains visible on the next cached automatic read',async()=>{
 const cache=memoryCache(),state=ledger();
 await handleTrafficRequest(request(),{TRAFFIC_LEDGER:state.db},{now,cache});
 state.fail=true;
 await handleTrafficRequest(new Request(request().url+'?refresh=1'),{TRAFFIC_LEDGER:state.db},{now,cache});
 const next=await handleTrafficRequest(request(),{TRAFFIC_LEDGER:state.db},{now,cache});
 assert.equal((await next.json()).storageStatus,'unavailable');
});
test('failed provider verification remains marked until a newer verified ledger arrives',async()=>{
 const cache=memoryCache(),state=ledger(),later=new Date(now.getTime()+10*60*1000);
 await handleTrafficRequest(request(),{TRAFFIC_LEDGER:state.db},{now,cache});
 await handleTrafficRequest(new Request(request().url+'?refresh=1'),{
  TRAFFIC_LEDGER:state.db,SITE_TRAFFIC_CLOUDFLARE_TOKEN:'test-only-not-a-real-token'
 },{now:later,cache,fetcher:async()=>{throw Error('provider offline');}});
 const next=await handleTrafficRequest(request(),{TRAFFIC_LEDGER:state.db},{now:later,cache});
 assert.equal((await next.json()).refreshStatus,'failed');
});
test('future or inconsistent cached coverage never substitutes for an unavailable ledger',async()=>{
 const key=new Request('https://quantaphi.org/api/site-traffic?cache=verified-snapshot-v1');
 for(const change of [d=>{d.through='2026-11-23';},d=>{d.last7Days.since='2026-11-17';d.last7Days.until='2026-11-23';},d=>{d.last7Days.since='2026-11-15';d.last7Days.until='2026-11-21';}]){
  const cache=memoryCache(),state=ledger();
  const initial=await handleTrafficRequest(request(),{TRAFFIC_LEDGER:state.db},{now,cache});
  const value=await initial.json();change(value);
  await cache.put(key,Response.json(value,{headers:{'X-Traffic-Cached-At':String(now.getTime())}}));
  state.fail=true;
  assert.equal((await handleTrafficRequest(request(),{TRAFFIC_LEDGER:state.db},{now,cache})).status,503);
 }
});
