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
 last7Days:{since:'2026-10-20',until:'2026-10-26',requests:100,pageViews:50,daysRecorded:7},
 recordedDays:23,coverageContinuous:true
});
async function runClientOnce(store,queue){
 const nodes=Object.fromEntries(['qtrafficRequests','qtrafficViews','qtrafficNote','qtrafficRefresh'].map(id=>[id,{textContent:'',disabled:false,addEventListener(type,handler){if(type==='click')this.click=handler;}}]));
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

test('public counter labels partial seven-day coverage instead of implying seven complete days',async()=>{
 const store=new Map();
 const partial=trafficPayload(958421,374475,'2026-10-26T16:28:24.621Z');
 partial.last7Days.daysRecorded=6;
 const nodes=await runClientOnce(store,[partial]);
 assert.ok(nodes.qtrafficNote.textContent.includes('2026-10-20 to 2026-10-26, 6/7 days recorded'));
 assert.match(nodes.qtrafficNote.textContent,/automatic ingestion is not yet authorized/);
 assert.equal(nodes.qtrafficRequests.textContent,'958,421');
});

test('public counter rejects an impossible seven-day coverage count',async()=>{
 const store=new Map();
 const malformed=trafficPayload(958421,374475,'2026-10-26T16:28:24.621Z');
 malformed.last7Days.daysRecorded=8;
 const nodes=await runClientOnce(store,[malformed,new Error('fallback unavailable')]);
 assert.equal(nodes.qtrafficRequests.textContent,'—');
 assert.match(nodes.qtrafficNote.textContent,/ledger currently unavailable/);
});

test('public counter rejects malformed UTC dates and non-seven-day windows',async()=>{
 const changes=[
  d=>{d.last7Days.since='2026-10-01';},
  d=>{d.last7Days.until='2026-10-40';},
  d=>{d.last7Days.since='2026-09-20';d.last7Days.until='2026-09-26';},
  d=>{d.since='2026-02-30';},
  d=>{d.last7Days.daysRecorded=7;d.recordedDays=6;}
 ];
 for(const change of changes){
  const malformed=trafficPayload(958421,374475,'2026-10-26T16:28:24.621Z');
  change(malformed);
  const nodes=await runClientOnce(new Map(),[malformed,new Error('fallback unavailable')]);
  assert.equal(nodes.qtrafficRequests.textContent,'—');
  assert.match(nodes.qtrafficNote.textContent,/ledger currently unavailable/);
 }
});

test('stale ledger retains cumulative totals when no days overlap the recent window',async()=>{
 const d=trafficPayload(958421,374475,'2026-10-10T16:28:24.621Z');
 d.through='2026-10-10';
 d.recordedDays=7;
 d.last7Days={since:'2026-10-20',until:'2026-10-26',requests:0,pageViews:0,daysRecorded:0};
 const nodes=await runClientOnce(new Map(),[d]);
 assert.equal(nodes.qtrafficRequests.textContent,'958,421');
 assert.equal(nodes.qtrafficViews.textContent,'374,475');
 assert.match(nodes.qtrafficNote.textContent,/0\/7 days recorded/);
 assert.match(nodes.qtrafficNote.textContent,/automatic ingestion is not yet authorized/);
});

test('new ledger retains cumulative totals when seven-day window predates first record',async()=>{
 const d=trafficPayload(200,100,'2026-10-26T16:28:24.621Z');
 d.since='2026-10-24';
 d.recordedDays=3;
 d.last7Days={since:'2026-10-20',until:'2026-10-26',requests:200,pageViews:100,daysRecorded:3};
 const nodes=await runClientOnce(new Map(),[d]);
 assert.equal(nodes.qtrafficRequests.textContent,'200');
 assert.equal(nodes.qtrafficViews.textContent,'100');
 assert.match(nodes.qtrafficNote.textContent,/3\/7 days recorded/);
});

test('browser rejects impossible or noncanonical verification timestamps',async()=>{
 const invalid=[
  '2026-02-30T16:28:24.621Z',
  '2026-10-26T16:28:24.621+00:00',
  '2026-10-26T16:28:24.621Zextra'
 ];
 for(const stamp of invalid){
  const payload=trafficPayload(99999999,99999999,stamp);
  const nodes=await runClientOnce(new Map(),[payload,new Error('fallback unavailable')]);
  assert.equal(nodes.qtrafficRequests.textContent,'—',stamp);
  assert.match(nodes.qtrafficNote.textContent,/ledger currently unavailable/);
 }
 const seconds=trafficPayload(1000,500,'2026-10-26T16:28:24Z');
 const nodes=await runClientOnce(new Map(),[seconds]);
 assert.equal(nodes.qtrafficRequests.textContent,'1,000','valid UTC second precision remains supported');
});
test('invalid locally cached verification timestamp cannot override the source',async()=>{
 const poisoned=trafficPayload(99999999,99999999,'2026-02-30T16:28:24.621Z');
 const store=new Map([['quantaphi_verified_traffic_v2',JSON.stringify(poisoned)]]);
 const nodes=await runClientOnce(store,[trafficPayload(1000,500,'2026-10-26T16:28:24.621Z')]);
 assert.equal(nodes.qtrafficRequests.textContent,'1,000');
 assert.equal(nodes.qtrafficViews.textContent,'500');
});

test('manual traffic refresh rereads server totals without minting or double-counting',async()=>{
 const stored=new Map();
 const first=trafficPayload(1191980,459620,'2026-10-31T04:23:58.441Z');
 first.through='2026-10-30';
 first.last7Days={since:'2026-10-24',until:'2026-10-30',requests:377965,pageViews:143479,daysRecorded:7};
 first.recordedDays=27;
 const next=structuredClone(first);
 next.requests=1192500;next.pageViews=460000;next.fetchedAt='2026-10-31T04:24:58.441Z';
 const nodes=await runClientOnce(stored,[first,next]);
 assert.equal(nodes.qtrafficViews.textContent,'459,620');
 assert.equal(typeof nodes.qtrafficRefresh.click,'function');
 await nodes.qtrafficRefresh.click();
 assert.equal(nodes.qtrafficRequests.textContent,'1,192,500');
 assert.equal(nodes.qtrafficViews.textContent,'460,000');
 assert.equal(nodes.qtrafficRefresh.disabled,false);
 assert.equal(nodes.qtrafficRefresh.textContent,'Refresh totals');
});
test('verified public Cloudflare fallback is current, scoped and never presented as automatically synced',()=>{
 const s=JSON.parse(readFileSync(new URL('../data/site-traffic-lifetime.json',import.meta.url),'utf8'));
 assert.equal(s.schemaVersion,2);
 assert.equal(s.scope,'recorded_since');
 assert.equal(s.historicComplete,false);
 assert.equal(s.refreshConfigured,false);
 assert.equal(s.since,'2026-10-04');
 assert.ok(s.pageViews>=459620);
 assert.ok(s.requests>=1191980);
 assert.equal(s.last7Days.daysRecorded,7);
 assert.equal(s.last7Days.requests<=s.requests,true);
 assert.equal(s.last7Days.pageViews<=s.pageViews,true);
 const page=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(page,/id="qtrafficRefresh"/);
 assert.match(page,/site-traffic\.js\?v=20261031-freshsource2/);
});

test('stale successful ledger cannot hide newer, source-validated Cloudflare fallback',async()=>{
 const stale=trafficPayload(1177738,453387,'2026-10-30T16:29:07.394Z');
 stale.through='2026-10-30';
 stale.last7Days={since:'2026-10-25',until:'2026-10-31',requests:296740,pageViews:114437,daysRecorded:6};
 stale.recordedDays=27;stale.coverageContinuous=false;
 const fresh=trafficPayload(1191980,459620,'2026-10-31T04:23:58.441Z');
 fresh.through='2026-10-30';
 fresh.last7Days={since:'2026-10-24',until:'2026-10-30',requests:377965,pageViews:143479,daysRecorded:7};
 fresh.recordedDays=27;
 const nodes=await runClientOnce(new Map(),[stale,fresh]);
 assert.equal(nodes.qtrafficRequests.textContent,'1,191,980');
 assert.equal(nodes.qtrafficViews.textContent,'459,620');
 assert.match(nodes.qtrafficNote.textContent,/2026-10-24 to 2026-10-30, 7\/7 days recorded/);
 assert.match(nodes.qtrafficNote.textContent,/automatic ingestion is not yet authorized/);
});
