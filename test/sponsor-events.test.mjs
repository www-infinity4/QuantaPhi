import test from 'node:test';
import assert from 'node:assert/strict';
import {sponsorEvents} from '../workers/quantaphi-site/sponsor-events.mjs';

const ENDPOINT='https://quantaphi.org/api/sponsor-event';
const ID='b5b06d3c-f49c-4ef7-a4ad-d67fb6c19c48';
function request(body,opts={}){
 return new Request(ENDPOINT,{method:'POST',headers:{Origin:opts.origin??'https://quantaphi.org','Content-Type':'application/json'},body:JSON.stringify(body)});
}
function db(){
 const recorded=new Map();
 return {recorded,prepare(sql){
  let args=[];
  return {bind(...values){args=values;return this},async run(){
   assert.match(sql,/INSERT OR IGNORE/);
   const [id,campaign,event,placement]=args;
   if(recorded.has(id))return {meta:{changes:0}};
   recorded.set(id,{campaign,event,placement});return {meta:{changes:1}};
  },async all(){
   assert.match(sql,/GROUP BY campaign,event_type/);
   return {results:[...recorded.values()].map(x=>({campaign:x.campaign,event_type:x.event,events:1}))};
  }};
 }};
}
test('requires an explicit configured D1 binding',async()=>{
 const res=await sponsorEvents(request({id:ID,campaign:'lazercat-2026',event:'click',placement:'green-left-arm'}),{});
 assert.equal(res.status,503);assert.equal((await res.json()).error,'sponsor_database_not_bound');
});
test('accepts one anonymous same-origin click and ignores a repeated ID',async()=>{
 const storage=db();const env={SPONSOR_EVENTS_DB:storage};
 const body={id:ID,campaign:'lazercat-2026',event:'click',placement:'green-left-arm'};
 assert.deepEqual(await (await sponsorEvents(request(body),env)).json(),{ok:true,recorded:true});
 assert.deepEqual(await (await sponsorEvents(request(body),env)).json(),{ok:true,recorded:false});
 assert.equal(storage.recorded.size,1);
 const stats=await sponsorEvents(new Request('https://quantaphi.org/api/sponsor-stats'),env);
 assert.equal((await stats.json()).counts.length,1);
});
test('does not accept third-party requests or unknown campaigns',async()=>{
 const env={SPONSOR_EVENTS_DB:db()};
 const body={id:ID,campaign:'lazercat-2026',event:'view',placement:'infinity-viewer'};
 assert.equal((await sponsorEvents(request(body,{origin:'https://example.com'}),env)).status,403);
 assert.equal((await sponsorEvents(request({...body,campaign:'malicious'}),env)).status,400);
 assert.equal(env.SPONSOR_EVENTS_DB.recorded.size,0);
});
