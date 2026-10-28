import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {handleCardWebsite,websitePlan,sourcePage,sourceSearch,websiteQuota} from '../workers/continuity-session-coordinator/card-website.mjs';
import {TINYFISH_CARDS,tinyfishCard} from '../tinyfish-card-catalog.mjs';
import {readCardWebsite} from '../tinyfish-card-reader.mjs';

const secret='a'.repeat(64),now=Date.parse('2026-10-28T04:00:00Z');
function db(){
 const d=new DatabaseSync(':memory:');
 return {raw:d,prepare(sql){const s=d.prepare(sql);let values=[];const q={bind(...v){values=v;return q},async run(){const r=s.run(...values);return {success:true,meta:{changes:Number(r.changes)}}}};return q}};
}
const env=()=>({TINYFISH_API_KEY:'synthetic-provider-key',TINYFISH_BRIDGE_TOKEN:secret,WORK_DB:db()});
const request=(body,{origin='https://quantaphi.org',path='/v1/cards/website',ip='192.0.2.1',headers={}}={})=>new Request('https://coordinator.example'+path,{method:'POST',headers:{'Origin':origin,'CF-Connecting-IP':ip,'Content-Type':'application/json',...headers},body:JSON.stringify(body)});

test('catalog includes all 116 accepted cards, original website families and bounded museum IDs',()=>{
 assert.equal(Object.keys(TINYFISH_CARDS).filter(k=>k.startsWith('durable-')).length,116);
 assert.ok(Object.keys(TINYFISH_CARDS).length>=210);
 for(const id of ['starmaker','chatgpt','ebay','topps','levis-501-dark','packers-next-schedule'])assert.ok(tinyfishCard(id));
 assert.equal(tinyfishCard('aic-123').url,'https://www.artic.edu/artworks/123');
 for(const id of ['aic-0','aic-1/../../secret','aic-1234567890','__proto__','https://evil.test'])assert.equal(tinyfishCard(id),null);
});
test('only trusted destinations/actions are planned; arbitrary URLs, goals and profiles fail before network',()=>{
 assert.equal(websitePlan({cardId:'starmaker',action:'inspect'}).url,'https://www.starmakerstudios.com/en/songs');
 assert.equal(websitePlan({cardId:'durable-framework-computers',action:'parts'}).url,'https://frame.work/marketplace/parts');
 for(const extra of [{url:'https://evil.example/'},{goal:'do stuff'},{profile_id:'owner-profile'}])assert.throws(()=>websitePlan({cardId:'starmaker',action:'inspect',...extra}));
 assert.throws(()=>websitePlan({cardId:'starmaker',action:'purchase'}));
 assert.throws(()=>websitePlan({cardId:'starmaker',action:'search',query:'x'.repeat(181)}));
});
test('public Origin and private token checks precede provider and database access',async()=>{
 let calls=0;const fetcher=async()=>{calls++;throw Error('never')};
 assert.equal((await handleCardWebsite(request({cardId:'starmaker',action:'inspect'},{origin:'https://evil.example'}),{}, {fetcher})).status,403);
 assert.equal((await handleCardWebsite(request({cardId:'starmaker',action:'inspect'},{path:'/internal/cards/website'}),{}, {fetcher})).status,401);
 assert.equal(calls,0);
});
test('ChatGPT messages fail clearly without sending the prompt or looking up help pages',async()=>{
 let calls=0;
 const r=await handleCardWebsite(request({cardId:'chatgpt',action:'message',query:'private synthetic prompt'}),env(),{fetcher:async()=>{calls++;throw Error()}});
 assert.equal(r.status,409);assert.equal((await r.json()).error,'provider_session_required');assert.equal(calls,0);
});
test('Fetch returns real text, timestamp and source; keys never leave server and private profiles never enter request',async()=>{
 let called;
 const r=await handleCardWebsite(request({cardId:'starmaker',action:'inspect'}),env(),{now:()=>now,fetcher:async(url,options)=>{
  called={url,options};return Response.json({results:[{url:'https://www.starmakerstudios.com/en/songs',final_url:'https://www.starmakerstudios.com/en/songs',title:'Songbook',text:'Source song catalog content'}],errors:[]});
 }});
 assert.equal(r.status,200);const d=await r.json();assert.equal(d.items[0].text,'Source song catalog content');
 assert.equal(d.observedAt,new Date(now).toISOString());assert.equal(d.receipt.messageSent,false);
 assert.equal(called.url,'https://api.fetch.tinyfish.ai');assert.equal(called.options.headers['X-API-Key'],'synthetic-provider-key');
 assert.deepEqual(JSON.parse(called.options.body).urls,['https://www.starmakerstudios.com/en/songs']);
 assert.doesNotMatch(called.options.body,/profile|cookie|vault/);assert.doesNotMatch(JSON.stringify(d),/synthetic-provider-key/);
});
test('Search uses domain restriction and filters forged, cross-domain and credential-bearing links',async()=>{
 let endpoint;
 const r=await handleCardWebsite(request({cardId:'starmaker',action:'search',query:'duets'}),env(),{now:()=>now,fetcher:async(url)=>{
  endpoint=new URL(url);return Response.json({results:[{title:'Duets',url:'https://www.starmakerstudios.com/en/song/1',snippet:'Verified snippet'},
   {title:'Spoof',url:'https://starmakerstudios.com.attacker.test/1'}, {title:'Private',url:'https://user:pass@www.starmakerstudios.com/'},
   {title:'Script',url:'javascript:alert(1)'}]});
 }});
 assert.equal(r.status,200);assert.equal((await r.json()).items.length,1);
 assert.equal(endpoint.hostname,'api.search.tinyfish.ai');assert.equal(endpoint.searchParams.get('include_domains'),'starmakerstudios.com');
});
test('a 200 fetch with per-URL errors, empty content or foreign redirect is never labeled a successful read',()=>{
 const url='https://www.starmakerstudios.com/en/songs';
 for(const code of ['login_required','bot_blocked','page_not_found','timeout'])assert.throws(()=>sourcePage({results:[],errors:[{url,error:code}]},url),new RegExp(code));
 assert.throws(()=>sourcePage({results:[{url,final_url:'https://evil.example/',text:'Untrusted'}]},url));
 assert.deepEqual(sourceSearch({results:[{title:'Impersonator',url:'https://starmakerstudios.com.attacker.test/'}]},url),[]);
});
test('real SQLite counters enforce cross-isolate client, minute and global caps; no raw IP stored',async()=>{
 const e=env(),req=request({});
 for(let i=0;i<20;i++)await websiteQuota(req,e,{now});
 await assert.rejects(websiteQuota(req,e,{now}),/usage_limit_reached/);
 const rows=e.WORK_DB.raw.prepare('SELECT bucket FROM card_website_quota').all();assert.doesNotMatch(JSON.stringify(rows),/192\.0\.2\.1|aaaa/);
 for(let i=0;i<10;i++)await websiteQuota(req,e,{now:now+60000});
 await assert.rejects(websiteQuota(req,e,{now:now+120000}),/usage_limit_reached/);
 const all=env();
 for(let i=0;i<200;i++)await websiteQuota(request({},{ip:'192.0.2.'+(i%200)}),all,{now:now+Math.floor(i/20)*60000});
 await assert.rejects(websiteQuota(request({},{ip:'192.0.2.201'}),all,{now:now+900000}),/usage_limit_reached/);
});
test('quota failure, oversized input/output and provider denial cannot return success or expose secrets',async()=>{
 let calls=0;
 const q=await handleCardWebsite(request({cardId:'starmaker',action:'inspect'}),{TINYFISH_API_KEY:'x'},{fetcher:async()=>{calls++;throw Error()}});
 assert.equal(q.status,503);assert.equal(calls,0);
 const big=await handleCardWebsite(request({cardId:'starmaker',action:'search',query:'q'.repeat(3000)}),env());assert.equal(big.status,400);
 const denied=await handleCardWebsite(request({cardId:'starmaker',action:'inspect'}),env(),{fetcher:async()=>new Response('secret',{status:401})});
 assert.equal((await denied.json()).error,'tinyfish_key_rejected');
 const huge=await handleCardWebsite(request({cardId:'starmaker',action:'inspect'}),env(),{fetcher:async()=>new Response('x'.repeat(270000))});assert.equal(huge.status,502);
});
test('client rejects forged successful results and keeps source errors distinct',async()=>{
 await assert.rejects(readCardWebsite('starmaker','search','duets',{fetcher:async()=>Response.json({ok:true,provider:'OpenAI',items:[]})}),/verified/);
 await assert.rejects(readCardWebsite('chatgpt','message','test',{fetcher:async()=>Response.json({ok:false,error:'provider_session_required'},{status:409})}),/No message was sent/);
});

test('the merged Brain transport reaches the typed provider route and rejects arbitrary private destinations',async()=>{
 const e=env();let calls=0;
 const target='https://frame.work/marketplace/parts';
 const options={path:'/internal/tinyfish',headers:{'X-Tinyfish-Bridge-Token':secret}};
 const fetcher=async(url,init)=>{calls++;assert.equal(url,'https://api.fetch.tinyfish.ai');assert.deepEqual(JSON.parse(init.body).urls,[target]);
  return Response.json({results:[{url:target,title:'Parts source',text:'Observed parts text'}],errors:[]});};
 const response=await handleCardWebsite(request({operation:'fetch',url:target},options),e,{fetcher});
 const d=await response.json();assert.equal(response.status,200);assert.equal(d.provider,'TinyFish');assert.equal(d.operation,'fetch');
 assert.equal(d.receipt.sourceReadVerified,true);assert.equal(d.data.results[0].text,'Observed parts text');
 const denied=await handleCardWebsite(request({operation:'fetch',url:'https://example.com/unregistered'},options),e,{fetcher});
 assert.equal(denied.status,400);assert.equal(calls,1);
});
