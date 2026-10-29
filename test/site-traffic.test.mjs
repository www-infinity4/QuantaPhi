import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{validateGroups,queryTraffic,refreshLedger,cumulativeSnapshot} from '../workers/site-traffic/worker.mjs';

const now=new Date('2026-10-24T06:10:54.421Z');
const groups=Array.from({length:21},(_,i)=>({
 dimensions:{date:new Date(Date.UTC(2026,9,4+i)).toISOString().slice(0,10)},
 sum:{requests:100+i,pageViews:50+i}
}));
const rows=groups.map(x=>({date:x.dimensions.date,requests:x.sum.requests,
 page_views:x.sum.pageViews,verified_at:now.toISOString()}));
function mockDb(data=rows){
 const statements=[];
 const db={
  prepare(sql){
   if(sql.includes('SELECT date,requests,page_views'))return {all:async()=>({results:data})};
   return {bind(...params){statements.push({sql,params});return {sql,params}}};
  },
  batch:async batch=>{assert.equal(batch.length,statements.length);return [];}
 };
 return {db,statements};
}
test('cumulative Cloudflare counter sums every recorded day, not seven-day windows',()=>{
 const s=cumulativeSnapshot([...rows].reverse(),now);
 assert.equal(s.schemaVersion,2);
 assert.equal(s.scope,'recorded_since');
 assert.equal(s.since,'2026-10-04');
 assert.equal(s.through,'2026-10-24');
 assert.equal(s.recordedDays,21);
 assert.equal(s.requests,2310);
 assert.equal(s.pageViews,1260);
 assert.equal(s.last7Days.requests,819);
 assert.equal(s.last7Days.pageViews,469);
 assert.equal(s.coverageContinuous,true);
 assert.equal(s.historicComplete,false);
 assert.equal(s.includesBots,true);
});
test('missing day is flagged, not silently called a complete lifetime',()=>{
 const gap=cumulativeSnapshot(rows.filter(x=>x.date!=='2026-10-10'),now);
 assert.equal(gap.coverageContinuous,false);
 assert.equal(gap.recordedDays,20);
});
test('Cloudflare day validator rejects duplicates, invalid and future values',()=>{
 assert.equal(validateGroups([...groups].reverse(),now).length,21);
 assert.throws(()=>validateGroups([groups[0],groups[0]],now),/invalid/);
 assert.throws(()=>validateGroups([{dimensions:{date:'2026-10-25'},sum:{requests:1,pageViews:1}}],now),/invalid/);
 assert.throws(()=>validateGroups([{dimensions:{date:'2026-10-24'},sum:{requests:-1,pageViews:1}}],now),/invalid/);
});
test('impossible calendar dates and duplicate ledger days fail closed',()=>{
 const badDays=['2026-02-30','2026-02-29','2026-13-01','2026-00-10'];
 for(const date of badDays){
  assert.throws(()=>validateGroups([{dimensions:{date},sum:{requests:1,pageViews:1}}],now),/invalid_analytics_day/);
  assert.throws(()=>cumulativeSnapshot([{date,requests:1,page_views:1,verified_at:now.toISOString()}],now),/ledger_invalid/);
 }
 assert.throws(()=>cumulativeSnapshot([rows[0],rows[0]],now),/ledger_invalid/);
 const leap={date:'2028-02-29',requests:1,page_views:1,verified_at:'2028-02-29T00:00:00Z'};
 assert.equal(cumulativeSnapshot([leap],new Date('2028-03-01T00:00:00Z')).recordedDays,1);
 assert.equal(validateGroups([{dimensions:{date:'2028-02-29'},sum:{requests:1,pageViews:1}}],new Date('2028-03-01T00:00:00Z')).length,1);
});
test('GraphQL stays server-side, reading bounded previous days with no browser token',async()=>{
 const days=await queryTraffic({token:'not-a-real-private-token',now,fetcher:async(url,init)=>{
  assert.equal(url,'https://api.cloudflare.com/client/v4/graphql');
  assert.ok(init.headers.Authorization.startsWith('Bearer '));
  assert.ok(init.body.includes('2026-09-25'));
  assert.ok(init.body.includes('2026-10-24'));
  return {ok:true,json:async()=>({data:{viewer:{zones:[{httpRequests1dGroups:groups}]}}})};
 }});
 assert.equal(days.length,21);
 await assert.rejects(queryTraffic({token:'',now}),/token/);
});
test('idempotent daily upsert keeps highest verified day count without double-counting',async()=>{
 const {db,statements}=mockDb();
 const update=await refreshLedger(db,{token:'not-a-real-private-token',now,fetcher:async()=>({
  ok:true,json:async()=>({data:{viewer:{zones:[{httpRequests1dGroups:groups}]}}})
 })});
 assert.equal(update.dayCount,21);
 assert.equal(statements.length,21);
 assert.match(statements[0].sql,/ON CONFLICT\(date\) DO UPDATE/);
 assert.match(statements[0].sql,/MAX\(traffic_daily.requests,excluded.requests\)/);
 assert.equal(statements[0].params[0],'2026-10-04');
});
test('public traffic endpoint serves durable counts even when live token is absent',async()=>{
 const {db}=mockDb();
 const res=await worker.fetch(new Request('https://quantaphi.org/api/site-traffic'),{TRAFFIC_LEDGER:db},{waitUntil:()=>{}});
 assert.equal(res.status,200);
 const body=await res.json();
 assert.equal(body.requests,2310);
 assert.equal(body.scope,'recorded_since');
 assert.equal(body.refreshConfigured,false);
 assert.equal(res.headers.get('cache-control'),'public, max-age=60, s-maxage=120');
});
test('uninitialized database fails safe; unrelated paths and writes are denied',async()=>{
 const req=new Request('https://quantaphi.org/api/site-traffic');
 assert.equal((await worker.fetch(req,{},null)).status,503);
 assert.equal((await worker.fetch(new Request('https://quantaphi.org/unrelated'),{},null)).status,404);
 assert.equal((await worker.fetch(new Request(req.url,{method:'POST'}),{},null)).status,405);
});

const clientSource=readFileSync(new URL('../site-traffic.js',import.meta.url),'utf8');
const trafficPayload=(requests,pageViews,fetchedAt)=>({
 schemaVersion:2,site:'quantaphi.org',source:'Cloudflare GraphQL httpRequests1dGroups',
 scope:'recorded_since',historicComplete:false,refreshConfigured:false,
 since:'2026-10-04',through:'2026-10-26',fetchedAt,requests,pageViews,
 last7Days:{requests:100,pageViews:50},recordedDays:23,coverageContinuous:true
});
async function runClientOnce(store,queue){
 const nodes=Object.fromEntries(['qtrafficRequests','qtrafficViews','qtrafficNote'].map(id=>[id,{textContent:''}]));
 const document={getElementById:id=>nodes[id],hidden:false,addEventListener(){}};
 const localStorage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)};
 const fetch=async()=>{
  const value=queue.shift();
  if(value instanceof Error)throw value;
  return {ok:true,json:async()=>value};
 };
 vm.runInNewContext(clientSource,{document,localStorage,fetch,AbortSignal,
  setInterval:()=>0,Date,Number,JSON,Math,Promise,Error});
 await new Promise(resolve=>setTimeout(resolve,5));
 return nodes;
}
test('public counter remains monotonic across reloads, later lower totals and static fallback',async()=>{
 const store=new Map();
 const original=trafficPayload(958421,374475,'2026-10-26T16:28:24.621Z');
 let nodes=await runClientOnce(store,[original]);
 assert.equal(nodes.qtrafficRequests.textContent,'958,421');
 assert.equal(nodes.qtrafficViews.textContent,'374,475');
 const lower=trafficPayload(900000,340000,'2026-10-26T17:00:00.000Z');
 nodes=await runClientOnce(store,[lower]);
 assert.equal(nodes.qtrafficRequests.textContent,'958,421');
 assert.equal(nodes.qtrafficViews.textContent,'374,475');
 const stale=trafficPayload(834107,322061,'2026-10-24T06:00:00.000Z');
 nodes=await runClientOnce(store,[new Error('offline'),stale]);
 assert.equal(nodes.qtrafficRequests.textContent,'958,421');
 assert.equal(nodes.qtrafficViews.textContent,'374,475');
 assert.match(nodes.qtrafficNote.textContent,/temporarily stale|not yet authorized/);
 const higher=trafficPayload(970000,380000,'2026-10-26T17:00:00.000Z');
 nodes=await runClientOnce(store,[higher]);
 assert.equal(nodes.qtrafficRequests.textContent,'970,000');
 assert.equal(nodes.qtrafficViews.textContent,'380,000');
});
test('malformed saved traffic is ignored rather than displayed',async()=>{
 const store=new Map([['quantaphi_verified_traffic_v2','{"requests":999999999}']]);
 const nodes=await runClientOnce(store,[trafficPayload(1000,500,'2026-10-26T16:28:24.621Z')]);
 assert.equal(nodes.qtrafficRequests.textContent,'1,000');
 assert.equal(nodes.qtrafficViews.textContent,'500');
});
