import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{approvedMetroSnapshots,validateMetroSnapshot,importApprovedMetro} from '../workers/restaurant-directory.js';

const manifest=()=>({schema_version:1,source_name:'Overture Maps Places',release:'2026-10-21.0',cities:{
 'denver-co':{city:'Denver',state:'CO',bbox:[-105.12,39.6,-104.69,39.92],min_records:100,approved_snapshot:'data/restaurants/denver-co.json'},
 'colorado-springs-co':{city:'Colorado Springs',state:'CO',bbox:[-104.98,38.73,-104.65,38.95],min_records:1,approved_snapshot:null}
}});
const row=()=>({id:'overture:1234567890abcdef',name:'Source restaurant',city:'Colorado Springs',state:'CO',
 category:'restaurant',address:'',latitude:38.83,longitude:-104.82,website:'',
 source_name:'Overture Maps',source_url:'https://overturemaps.org/',confidence:.91,image_url:'',sponsored:false});
const payload=()=>({schema_version:1,source_name:'Overture Maps',dataset_version:'2026-10-21.0',
 city:'Colorado Springs',state:'CO',generated_at:'2026-11-01T12:00:00Z',items:[row()]});

test('completed Denver is never scheduled again; unapproved city is not ingested',()=>{
 assert.deepEqual(approvedMetroSnapshots(manifest()),[]);
 const m=manifest();
 m.cities['colorado-springs-co'].approved_snapshot='data/restaurants/colorado-springs-co.json';
 assert.deepEqual(approvedMetroSnapshots(m).map(x=>x.key),['colorado-springs-co']);
 m.cities['denver-metro-co']={...m.cities['denver-co'],approved_snapshot:'data/restaurants/denver-metro-co.json'};
 assert.deepEqual(approvedMetroSnapshots(m).map(x=>x.key),['colorado-springs-co']);
 m.cities['colorado-springs-co'].approved_snapshot='https://attacker.example/snapshot';
 assert.throws(()=>approvedMetroSnapshots(m),/invalid_approved_metro/);
});
test('fail closed before D1 writes on mixed release, duplicate, false ads or out-of-metro rows',()=>{
 const m=manifest();m.cities['colorado-springs-co'].approved_snapshot='data/restaurants/colorado-springs-co.json';
 const cfg=approvedMetroSnapshots(m)[0],good=payload();
 for(const bbox of [[181,91,182,92],[-181,38,-104,39],[-105,-91,-104,39]]){
  m.cities['colorado-springs-co'].bbox=bbox;
  assert.throws(()=>approvedMetroSnapshots(m),/invalid_approved_metro/);
 }
 m.cities['colorado-springs-co'].bbox=[-104.98,38.73,-104.65,38.95];
 assert.equal(validateMetroSnapshot(good,cfg).length,1);
 for(const bad of [
  {...good,dataset_version:'2026-11-01.0'},
  {...good,items:[row(),row()]},
  {...good,items:[{...row(),id:['overture:1234567890abcdef']}]},
  {...good,items:[{...row(),city:'Denver'}]},
  {...good,items:[{...row(),latitude:39.8}]},
  {...good,items:[{...row(),confidence:1.3}]},
  {...good,items:[{...row(),sponsored:true}]},
  {...good,items:[{...row(),image_url:'https://unlicensed.example/image.jpg'}]},
  {...good,items:[{...row(),website:'javascript:alert(1)'}]},
 ])assert.throws(()=>validateMetroSnapshot(bad,cfg),/invalid_metro_/);
});
test('approved import records a city-specific receipt and replay is idempotent',async()=>{
 const m=manifest();m.cities['colorado-springs-co'].approved_snapshot='data/restaurants/colorado-springs-co.json';
 const cfg=approvedMetroSnapshots(m)[0],seen=[],batches=[];let exists=false;
 const db={prepare(sql){return {bind(...args){seen.push({sql,args});return {
  first:async()=>exists?{run_id:args[0]}:null,
  run:async()=>{exists=true;return {success:true}}
 }}}},batch:async statements=>{batches.push(statements);return statements.map(()=>({success:true,meta:{changes:1}}))}};
 const first=await importApprovedMetro({RESTAURANTS:db},cfg,payload());
 assert.deepEqual(first,{skipped:false,records:1});
 assert.equal(batches.length,1);
 assert.ok(seen.some(x=>x.sql.includes('INSERT INTO restaurant_ingest_runs')&&x.args[0]==='colorado-springs-co|2026-11-01T12:00:00Z'));
 const second=await importApprovedMetro({RESTAURANTS:db},cfg,payload());
 assert.deepEqual(second,{skipped:true,records:0});
 assert.equal(batches.length,1);
});
test('Cron reads manifest but never downloads the completed Denver snapshot',async()=>{
 const originalFetch=globalThis.fetch,requested=[];
 globalThis.fetch=async url=>{requested.push(String(url));return {ok:true,json:async()=>manifest()};};
 try{
  let work;await worker.scheduled({}, {RESTAURANTS:{}},{waitUntil(p){work=p}});
  await work;
  assert.equal(requested.length,1);
  assert.match(requested[0],/city-manifest\.json$/);
  assert.equal(requested.some(url=>url.includes('denver-co.json')),false);
 }finally{globalThis.fetch=originalFetch;}
});

test('protected ID conflicts never produce a false full-count receipt',async()=>{
 const m=manifest();m.cities['colorado-springs-co'].approved_snapshot='data/restaurants/colorado-springs-co.json';
 const cfg=approvedMetroSnapshots(m)[0],sqls=[];
 const db={prepare(sql){return {bind(...args){sqls.push({sql,args});return {
  first:async()=>null,run:async()=>{throw Error('receipt must not be written')}
 }}}},batch:async statements=>statements.map(()=>({success:true,meta:{changes:0}}))};
 await assert.rejects(importApprovedMetro({RESTAURANTS:db},cfg,payload()),/metro_write_conflict/);
 assert.equal(sqls.some(x=>x.sql.includes('INSERT INTO restaurant_ingest_runs')),false);
});
