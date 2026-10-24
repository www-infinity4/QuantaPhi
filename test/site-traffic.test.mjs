import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{buildSnapshot,queryTraffic} from '../workers/site-traffic/worker.mjs';
const now=new Date('2026-10-24T05:55:25.001Z');
const groups=Array.from({length:7},(_,i)=>{
 const date=new Date(Date.UTC(2026,9,18+i)).toISOString().slice(0,10);
 return {dimensions:{date},sum:{requests:10+i,pageViews:4+i}};
});
test('a validated seven-day snapshot matches the public schema and sums without estimations',()=>{
 const s=buildSnapshot([...groups].reverse(),now);
 assert.equal(s.fetchedAt,now.toISOString());
 assert.equal(s.period.since,'2026-10-18');
 assert.equal(s.period.untilExclusive,'2026-10-25');
 assert.equal(s.requests,91);
 assert.equal(s.pageViews,49);
 assert.equal(s.days[0].date,'2026-10-18');
 assert.equal(s.days[6].date,'2026-10-24');
 assert.equal(s.includesBots,true);
 assert.equal(s.uniqueVisitors,false);
});
test('missing days, duplicate dates or invalid counts fail closed',()=>{
 assert.throws(()=>buildSnapshot(groups.slice(1),now),/incomplete/);
 assert.throws(()=>buildSnapshot([...groups.slice(0,6),groups[5]],now),/invalid/);
 assert.throws(()=>buildSnapshot([...groups.slice(0,6),{dimensions:{date:'2026-10-24'},sum:{requests:-2,pageViews:4}}],now),/invalid/);
});
test('GraphQL query uses server-only token, correct zone and requested date window',async()=>{
 let called=false;
 const s=await queryTraffic({token:'private-test-token',now,fetcher:async(url,options)=>{
  called=true;
  assert.equal(url,'https://api.cloudflare.com/client/v4/graphql');
  assert.match(options.headers.Authorization,/^Bearer /);
  assert.match(options.body,/2026-10-18/);
  assert.match(options.body,/2026-10-24/);
  return {ok:true,json:async()=>({data:{viewer:{zones:[{httpRequests1dGroups:groups}]}}})};
 }});
 assert.equal(called,true);
 assert.equal(s.requests,91);
 await assert.rejects(queryTraffic({token:'',now}),/secret/);
});
test('live handler fails safely with HTTP 503 when authorization is missing',async()=>{
 const req=new Request('https://quantaphi.org/api/site-traffic');
 const res=await worker.fetch(req,{},null);
 assert.equal(res.status,503);
 assert.equal(res.headers.get('cache-control'),'no-store');
 assert.ok(!(await res.text()).includes('private-test-token'));
});
test('handler rejects routes and methods outside the traffic API',async()=>{
 assert.equal((await worker.fetch(new Request('https://quantaphi.org/other'),{},null)).status,404);
 assert.equal((await worker.fetch(new Request('https://quantaphi.org/api/site-traffic',{method:'POST'}),{},null)).status,405);
});
