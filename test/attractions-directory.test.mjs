import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker,{validState,cleanRecord,seedSources,importSnapshot} from '../workers/attractions-directory.mjs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
const seed=JSON.parse(read('data/attractions/co-seed.json'));
test('50 US states queued, Colorado prioritized, isolated database schema',()=>{
 const states=JSON.parse(read('data/attractions/states.json'));
 assert.equal(states.states.length,50);assert.equal(new Set(states.states.map(s=>s.code)).size,50);
 assert.equal(states.priority_first,'CO');assert.ok(validState('CO'));assert.equal(validState('XX'),false);
 assert.match(read('data/attractions/schema.sql'),/CREATE TABLE IF NOT EXISTS attractions/);
 assert.doesNotMatch(read('data/attractions/schema.sql'),/CREATE TABLE IF NOT EXISTS restaurants/);
});
test('six licensed source-backed original entries and safe normalization',()=>{
 assert.equal(seed.items.length,6);assert.deepEqual(seedSources('CO'),['co-seed.json','co-overture-nw.json','co-overture-ne.json','co-overture-sw.json','co-overture-se.json']);
 for(const item of seed.items){const row=cleanRecord(item,'CO',seed.generated_at);assert.ok(row,item.id);
  assert.equal(row.state,'CO');assert.equal(row.image_url,'');assert.equal('price' in row,false);assert.equal('sponsored' in row,false);
 }
 const a=seed.items[0];
 assert.equal(cleanRecord({...a,website:'javascript:alert(1)'},'CO',seed.generated_at).website,'');
 assert.equal(cleanRecord({...a,state:'WY'},'CO',seed.generated_at),null);
 assert.equal(cleanRecord({...a,latitude:1000},'CO',seed.generated_at),null);
 assert.equal(cleanRecord({...a,source_url:''},'CO',seed.generated_at),null);
});
test('source feed is read-only, indexed and capped at 24 results per page',async()=>{
 let sql='',params=[];
 const db={prepare(q){sql=q;return {bind(...b){params=b;return {all:async()=>({results:[{...seed.items[0],last_seen:seed.generated_at}]})}}}}};
 const env={ATTRACTIONS:db};
 const a=await worker.fetch(new Request('https://test.example/api/attractions/feed?state=CO&page=9000'),env);
 assert.equal(a.status,200);const body=await a.json();assert.equal(body.page,9000);assert.equal(params.at(-1),216000);
 assert.equal(body.items[0].sponsored,false);assert.equal(body.items[0].card_kind,'attraction');
 assert.match(sql,/FROM attractions/);
 assert.equal((await worker.fetch(new Request('https://test.example/api/attractions/feed?state=ZZ'),env)).status,400);
 assert.equal((await worker.fetch(new Request('https://test.example/api/attractions/feed',{method:'POST'}),env)).status,405);
});
test('cron is the only import writer and invalid source batches fail closed',async()=>{
 await assert.rejects(importSnapshot({ATTRACTIONS:{}},{schema_version:1,state:'XX',items:[],generated_at:'now',source_name:'x',dataset_version:'x'}));
 const src=read('workers/attractions-directory.mjs');
 assert.match(src,/async scheduled/);
 assert.doesNotMatch(src,/request\.method==='POST'/);
});
test('lookahead reports more pages only when a 25th record exists, and deep pages do not repeat page 200',async()=>{
 let params=[];
 const rows=Array.from({length:25},(_,i)=>({...seed.items[0],id:'curated:colorado-'+String(i).padStart(8,'0'),last_seen:seed.generated_at}));
 const env={ATTRACTIONS:{prepare(){return {bind(...args){params=args;return {all:async()=>({results:rows})}}}}}};
 const a=await (await worker.fetch(new Request('https://test.example/api/attractions/search?state=CO&page=201'),env)).json();
 assert.equal(a.page,201);assert.equal(params.at(-1),201*24);
 assert.equal(a.count,24);assert.equal(a.items.length,24);assert.equal(a.has_more,true);
 const cap=await (await worker.fetch(new Request('https://test.example/api/attractions/search?state=CO&page=100000'),env)).json();
 assert.equal(cap.has_more,false);
 const negative=await (await worker.fetch(new Request('https://test.example/api/attractions/search?state=CO&page=-1'),env)).json();
 assert.equal(negative.page,0);
});

test('explicit complete Overture tombstones close only source-matched IDs; truncated snapshots never close',async()=>{
 const sqls=[];
 const env={ATTRACTIONS:{
  prepare(sql){return {bind(...params){sqls.push({sql,params});return {first:async()=>null}}}},
  batch:async statements=>statements.map(()=>({success:true}))
 }};
 const payload={schema_version:1,state:'CO',source_name:'Overture Maps',dataset_version:'2026-10-21.0',
  generated_at:'2026-11-01T00:00:00Z',items:[],truncated:false,
  closed_ids:['overture:9b51e395-3fb1-41a8-b6df-54859f6e9e63']};
 const done=await importSnapshot(env,payload);
 assert.equal(done.records,0);assert.equal(done.closureCandidates,1);
 const close=sqls.find(x=>x.sql.includes("SET status='closed'"));
 assert.ok(close);assert.match(close.sql,/source_name='Overture Maps'/);
 assert.deepEqual(close.params,[payload.closed_ids[0],'CO']);
 sqls.length=0;
 const partial=await importSnapshot(env,{...payload,truncated:true,generated_at:'2026-11-01T01:00:00Z'});
 assert.equal(partial.closureCandidates,0);
 assert.equal(sqls.some(x=>x.sql.includes("SET status='closed'")),false);
 await assert.rejects(importSnapshot(env,{...payload,closed_ids:['curated:colorado-fake']}));
});
