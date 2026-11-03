import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rankAttractions,attractionSourceId,interestTags} from '../attractions-quant-ai.mjs';
import {seedSources,validateAlaskaSeed} from '../workers/attractions-directory.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const alaska=JSON.parse(read('data/attractions/ak-seed.json'));

test('Alaska official NPS destinations have traceable source records, no invented bookings',()=>{
 assert.equal(alaska.schema_version,1);
 assert.equal(alaska.state,'AK');
 assert.ok(alaska.items.length>=6);
 assert.equal(new Set(alaska.items.map(x=>x.id)).size,alaska.items.length);
 assert.deepEqual(seedSources('AK'),['ak-seed.json']);
 assert.equal(validateAlaskaSeed(alaska),alaska);
 for(const row of alaska.items){
  assert.match(row.id,/^curated:alaska-[a-z0-9-]+$/);
  assert.equal(row.state,'AK');assert.equal(row.source_name,'National Park Service');
  assert.match(row.source_url,/^https:\/\/www\.nps\.gov\//);
  assert.ok(row.license==='US-government-information');
  assert.ok(row.latitude>=51&&row.latitude<=72);
  assert.ok(row.longitude>=-180&&row.longitude<=-129);
  assert.equal(row.confidence<=0.95,true);
  if(row.image_url)assert.ok(row.image_attribution);
  assert.equal('price' in row,false);
 }
});
test('Alaska validation fails shut on duplicate, unsafe, wrong-state, image-without-rights',()=>{
 assert.throws(()=>validateAlaskaSeed({...alaska,state:'CO'}));
 assert.throws(()=>validateAlaskaSeed({...alaska,items:[...alaska.items,alaska.items[0]]}));
 assert.throws(()=>validateAlaskaSeed({...alaska,items:[{...alaska.items[0],source_url:'https://not-nps.example'}]}));
 assert.throws(()=>validateAlaskaSeed({...alaska,items:[{...alaska.items[0],state:'AZ'}]}));
 assert.throws(()=>validateAlaskaSeed({...alaska,items:[{...alaska.items[0],image_url:'https://a.example/x.jpg',image_attribution:''}]}));
});
test('Quant AI on-device discovery uses explicit interests and makes diverse, attributable picks',()=>{
 const items=[...alaska.items];
 const a=rankAttractions(items,{interests:['history'],limit:5});
 const b=rankAttractions(items,{interests:['history'],limit:5});
 assert.deepEqual(a.map(r=>r.id),b.map(r=>r.id));
 assert.equal(a.length,5);assert.equal(new Set(a.map(r=>r.id)).size,5);
 assert.ok(a.every(r=>r.source_url.startsWith('https://www.nps.gov/')));
 assert.ok(a[0].category==='historic_site'||a[0].category==='visitor_center');
 const outdoors=rankAttractions(items,{interests:['glacier'],limit:5});
 assert.ok(outdoors[0].category==='glacier'||outdoors[0].category==='national_park');
 assert.deepEqual(rankAttractions(items,{interests:['banking','private wallet'],limit:4}).length,4);
 assert.deepEqual(interestTags(['glacier','history','invalid-wallet'] ),['glacier','history']);
});
test('Database-powered cards have stable safe Oracle IDs',()=>{
 assert.equal(attractionSourceId(alaska.items[0]),attractionSourceId(alaska.items[0]));
 assert.match(attractionSourceId(alaska.items[0]),/^attraction-ak-[a-z0-9-]{7,}$/);
 assert.equal(new Set(alaska.items.map(attractionSourceId)).size,alaska.items.length);
 assert.equal(attractionSourceId({...alaska.items[0],id:'garbage'}),null);
});

test('future states enter the same public source-card algorithm, without hard-coded Colorado/Alaska exclusion',()=>{
 const next={...alaska.items[0],id:'curated:alabama-example-source',state:'AL',city:'Test City'};
 assert.equal(rankAttractions([next],{limit:1}).length,1);
 assert.match(attractionSourceId(next),/^attraction-al-/);
});
