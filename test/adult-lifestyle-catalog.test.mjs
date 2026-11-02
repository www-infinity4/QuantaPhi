import test from 'node:test';
import assert from 'node:assert/strict';
import {ADULT_LIFESTYLE_SOURCES,ADULT_LIFESTYLE_KITS,sourcesForKit} from '../adult-lifestyle-catalog.mjs';
import {eligiblePublisher} from '../restricted-source-directory.mjs';
import {readFileSync} from 'node:fs';

test('21+ lifestyle destinations are source-only, official HTTPS links and not copied advertisements',()=>{
 assert.ok(ADULT_LIFESTYLE_SOURCES.length>=12);
 const ids=new Set();
 for(const row of ADULT_LIFESTYLE_SOURCES){
  assert.ok(row.id&&!ids.has(row.id),row.id);
  ids.add(row.id);
  assert.equal(row.kind,'independent-source');
  assert.ok(eligiblePublisher(row,true));
  assert.equal(eligiblePublisher(row,false),null);
  assert.ok(row.category&&row.summary&&row.subtitle);
  for(const key of ['image','price','offer','sponsored','paid','availability','checkout'])assert.equal(key in row,false,row.id+' '+key);
  assert.doesNotMatch(row.title+' '+row.summary,/tobacco|nicotine|mushroom|alcohol|beer|wine|liquor/i);
 }
 for(const key of ['playboy','victorias-secret','hims','grav','amsterdam-de-wallen','cafe-de-jaren']){
  assert.ok(ids.has(key),key);
 }
});

test('purpose kits combine several actual publishers without inventing an order or shipping rate',()=>{
 assert.ok(ADULT_LIFESTYLE_KITS.length>=5);
 const ids=new Set();
 for(const kit of ADULT_LIFESTYLE_KITS){
  assert.ok(!ids.has(kit.id));ids.add(kit.id);
  assert.ok(kit.title&&kit.description);
  const sources=sourcesForKit(kit.id);
  assert.ok(sources.length>=3&&sources.length<=6,kit.id);
  assert.equal(sources.length,new Set(sources.map(x=>x.id)).size);
  assert.deepEqual(sources.map(x=>x.id),kit.sourceIds);
  assert.equal('estimated_savings' in kit,false);
  assert.equal('shipments' in kit,false);
 }
 assert.deepEqual(sourcesForKit('not-a-kit'),[]);
});

test('existing 21+ source gate remains and lifestyle sources are not auto-loaded for unacknowledged visitors',()=>{
 const js=readFileSync(new URL('../restricted-ad-card.mjs',import.meta.url),'utf8');
 assert.match(js,/const publisher=.*publisher\.hidden=true/);
 assert.match(js,/acknowledged=true/);
 assert.match(js,/acknowledged=false/);
 assert.match(js,/sourcesForKit\(selectedKitId\)/);
 assert.match(js,/kitSelect\.addEventListener\('change'/);
 assert.match(js,/publisher\.hidden=true/);
 assert.doesNotMatch(js,/ADULT_LIFESTYLE_SOURCES.*(?:localStorage|sessionStorage)/);
});
