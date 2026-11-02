import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import worker,{validState,cleanRecord,seedSources,importSnapshot,validateColoradoShardBatch,validateColoradoSeed} from '../workers/attractions-directory.mjs';
const root=new URL('../',import.meta.url),read=p=>readFileSync(new URL(p,root),'utf8');
const seed=JSON.parse(read('data/attractions/co-seed.json'));
test('50 US states queued, Colorado prioritized, isolated database schema',()=>{
 const states=JSON.parse(read('data/attractions/states.json'));
 assert.equal(states.states.length,50);assert.equal(new Set(states.states.map(s=>s.code)).size,50);
 assert.equal(states.priority_first,'CO');assert.ok(validState('CO'));assert.equal(validState('XX'),false);
 assert.match(read('data/attractions/schema.sql'),/CREATE TABLE IF NOT EXISTS attractions/);
 assert.doesNotMatch(read('data/attractions/schema.sql'),/CREATE TABLE IF NOT EXISTS restaurants/);
});
test('ten licensed source-backed original entries and safe normalization',()=>{
 assert.equal(seed.items.length,10);
 const blackCanyon=seed.items.find(x=>x.id==='curated:colorado-black-canyon-south-rim');
 assert.ok(blackCanyon);
 assert.equal(blackCanyon.source_url,'https://www.nps.gov/blca/planyourvisit/southrim.htm');
 assert.equal(blackCanyon.latitude,38.555);
 assert.equal(blackCanyon.longitude,-107.6866);
 assert.equal(blackCanyon.image_url,'');assert.deepEqual(seedSources('CO'),['co-seed.json','co-overture-nw.json','co-overture-ne.json','co-overture-sw.json','co-overture-se.json']);
 for(const item of seed.items){const row=cleanRecord(item,'CO',seed.generated_at);assert.ok(row,item.id);
  assert.equal(row.state,'CO');assert.equal(row.image_url,'');assert.equal('price' in row,false);assert.equal('sponsored' in row,false);
 }
 const npsNew=['great-sand-dunes','mesa-verde','florissant-fossil-beds'];
 assert.equal(new Set(seed.items.map(x=>x.id)).size,10);
 for(const suffix of npsNew){
  const item=seed.items.find(x=>x.id==='curated:colorado-'+suffix);
  assert.ok(item,'missing NPS-sourced park: '+suffix);
  assert.equal(item.source_name,'National Park Service');
  assert.match(item.source_url,/^https:\/\/www\.nps\.gov\/(grsa|meve|flfo)\/index\.htm$/);
  assert.equal(item.image_url,'');assert.equal(item.image_attribution,'');
  assert.ok(item.confidence<=0.9,'park point is approximate, not a visitor entrance');
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

test('Colorado shard batch must be complete, one release, duplicate-free and untruncated',()=>{
 const row=(i)=>({id:'overture:colorado-test-'+String(i).padStart(10,'0'),
  name:'Sourced attraction',city:'Denver',state:'CO',category:'museum',
  latitude:Math.floor(i/6)<2?40:38,longitude:Math.floor(i/6)%2===0?-106:-104,website:'',source_name:'Overture Maps',
  source_url:'https://overturemaps.org/',license:'CDLA-Permissive-2.0',
  confidence:.9,image_url:'',image_attribution:''});
 const shards=Array.from({length:4},(_,s)=>({
  schema_version:1,state:'CO',source_name:'Overture Maps',
  dataset_version:'2026-10-21.0',license:'CDLA-Permissive-2.0',
  generated_at:'2026-11-01T12:00:00Z',truncated:false,eligible_count:6,
  items:Array.from({length:6},(_,i)=>row(s*6+i)),closed_ids:[]
 }));
 assert.equal(validateColoradoShardBatch(shards).records,24);
 // A CO label is not sufficient: the Worker must independently reject wrong
 // regional coordinates, missing coordinates, and non-numeric input before D1.
 for(const bad of [
  {...shards[0].items[0],latitude:38},
  {...shards[0].items[0],longitude:-104},
  {...shards[0].items[0],latitude:null},
  {...shards[0].items[0],longitude:undefined},
  {...shards[0].items[0],latitude:'40'},
  {...shards[0].items[0],longitude:true},
  {...shards[0].items[0],latitude:Infinity}
 ]){
  assert.throws(()=>validateColoradoShardBatch([
   {...shards[0],items:[bad,...shards[0].items.slice(1)]},...shards.slice(1)
  ]),/invalid_colorado_record/);
 }
 assert.throws(()=>validateColoradoShardBatch(shards.slice(0,3)),/incomplete_colorado_shards/);
 assert.throws(()=>validateColoradoShardBatch([{...shards[0],truncated:true},...shards.slice(1)]),/invalid_colorado_shard/);
 assert.throws(()=>validateColoradoShardBatch([...shards.slice(0,3),{...shards[3],generated_at:undefined}]),/invalid_colorado_shard/);
 assert.throws(()=>validateColoradoShardBatch([{...shards[0],dataset_version:'2026-11-01.0'},...shards.slice(1)]),/mixed_colorado_release/);
 assert.throws(()=>validateColoradoShardBatch([{...shards[0],items:[...shards[0].items.slice(0,5),{...shards[0].items[5],id:shards[1].items[0].id}]},...shards.slice(1)]),/invalid_colorado_record/);
 assert.throws(()=>validateColoradoShardBatch([{...shards[0],closed_ids:[shards[1].items[0].id]},...shards.slice(1)]),/conflicting_colorado_closure/);
});
test('Cloudflare Cron refuses a partial four-region upload before any D1 write',async()=>{
 const previous=globalThis.fetch,urls=[];
 globalThis.fetch=async url=>{
  urls.push(String(url));
  return {status:urls.length===1?200:404,ok:urls.length===1,
   json:async()=>({})};
 };
 try{
  let pending;
  await worker.scheduled({}, {ATTRACTIONS:{prepare(){throw Error('D1 must remain untouched')}}},
   {waitUntil(p){pending=p}});
  await assert.rejects(pending,/incomplete_colorado_shards/);
  assert.equal(urls.length,4);
 }finally{globalThis.fetch=previous}
});

test('Cron rejects a non-Colorado curated seed before any four-shard D1 write',async()=>{
 const oldFetch=globalThis.fetch;
 const makeRow=(i,shard)=>({id:'overture:colorado-test-'+String(i).padStart(10,'0'),
  name:'Sourced attraction',city:'Denver',state:'CO',category:'museum',
  latitude:shard<2?40:38,longitude:shard%2===0?-106:-104,website:'',source_name:'Overture Maps',
  source_url:'https://overturemaps.org/',license:'CDLA-Permissive-2.0',
  confidence:.9,image_url:'',image_attribution:''});
 const shards=Array.from({length:4},(_,s)=>({schema_version:1,state:'CO',source_name:'Overture Maps',
  dataset_version:'2026-10-21.0',license:'CDLA-Permissive-2.0',
  generated_at:'2026-11-01T12:00:00Z',truncated:false,eligible_count:6,
  items:Array.from({length:6},(_,i)=>makeRow(s*6+i,s)),closed_ids:[]}));
 let requested=0;
 globalThis.fetch=async url=>{const n=requested++;
  return {status:200,ok:true,json:async()=>n<4?shards[n]:{...seed,state:'WY'}};
 };
 try{
  let pending;
  await worker.scheduled({}, {ATTRACTIONS:{prepare(){throw Error('D1 must remain untouched')}}},
   {waitUntil(p){pending=p}});
  await assert.rejects(pending,/invalid_colorado_seed/);
  assert.equal(requested,5);
 }finally{globalThis.fetch=oldFetch}
});

test('curated Colorado seed rejects duplicate IDs and unlicensed/malformed records',()=>{
 assert.equal(validateColoradoSeed(seed),seed);
 assert.throws(()=>validateColoradoSeed({...seed,items:[...seed.items,seed.items[0]]}),/invalid_colorado_seed/);
 assert.throws(()=>validateColoradoSeed({...seed,items:[{...seed.items[0],image_url:'https://example.com/unlicensed.jpg'}]}),/invalid_colorado_seed/);
 assert.throws(()=>validateColoradoSeed({...seed,items:[{...seed.items[0],source_url:''}]}),/invalid_colorado_seed/);
 assert.throws(()=>validateColoradoSeed({...seed,closed_ids:['overture:fake-closure-id']}),/invalid_colorado_seed/);
});

test('seed-only Cron validates source provenance before any D1 mutation',async()=>{
 const previous=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;
  if(calls<=4)return {status:404,ok:false};
  return {status:200,ok:true,json:async()=>({...seed,items:[...seed.items,seed.items[0]]})};
 };
 try{
  let pending;
  await worker.scheduled({}, {ATTRACTIONS:{prepare(){throw Error('D1 must remain untouched')}}},
   {waitUntil(p){pending=p}});
  await assert.rejects(pending,/invalid_colorado_seed/);
  assert.equal(calls,5);
 }finally{globalThis.fetch=previous}
});

test('large four-shard Cron stays below D1 Free query budget and quarantines unreviewed historic sites',async()=>{
 let queryCalls=0;const insertedStatuses=[];
 const env={ATTRACTIONS:{
  prepare(sql){return {bind(...args){return {sql,args,first:async()=>{queryCalls++;return null}}}}},
  batch:async statements=>{
   queryCalls++;
   for(const statement of statements)if(statement.sql.startsWith('INSERT INTO attractions(')){
    insertedStatuses.push(statement.args.at(-1));
   }
   return statements.map(()=>({success:true}));
  }
 }};
 const lengths=[948,3998,610,971],closures=[8,40,3,10];
 for(let shard=0;shard<4;shard++){
  const items=Array.from({length:lengths[shard]},(_,i)=>({
   id:'overture:colorado-batch-'+shard+'-'+String(i).padStart(8,'0'),
   name:'Overture place '+i,city:'Denver',state:'CO',
   category:i===0?'historic_site':'museum',latitude:39.7,longitude:-104.9,
   website:'',source_name:'Overture Maps',source_url:'https://overturemaps.org/',
   license:'CDLA-Permissive-2.0',confidence:.9,image_url:'',image_attribution:''
  }));
  const closed_ids=Array.from({length:closures[shard]},(_,i)=>
   'overture:closure-'+shard+'-'+String(i).padStart(8,'0'));
  const result=await importSnapshot(env,{schema_version:1,state:'CO',source_name:'Overture Maps',
   dataset_version:'2026-10-21.0',generated_at:'2026-11-01T17:00:00Z',
   shard:String(shard),items,closed_ids,truncated:false});
  assert.equal(result.records,lengths[shard]);
 }
 await importSnapshot(env,seed);
 assert.ok(queryCalls<=50,'D1 Free Worker 50-query limit: '+queryCalls);
 assert.equal(queryCalls,42);
 assert.equal(insertedStatuses.filter(s=>s==='needs_review').length,4);
 assert.equal(insertedStatuses.filter(s=>s==='listed').length,6527-4+seed.items.length);
});
test('health distinguishes publicly listed attractions from review-held source candidates',async()=>{
 const env={ATTRACTIONS:{prepare(){return {first:async()=>({total:100,listed:80,needs_review:20})}}}};
 const response=await worker.fetch(new Request('https://example.org/api/attractions/health'),env);
 const body=await response.json();
 assert.equal(body.records,80);assert.equal(body.review_pending,20);assert.equal(body.total_records,100);
});
