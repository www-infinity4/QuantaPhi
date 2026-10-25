import test from 'node:test';
import assert from 'node:assert/strict';
import {COLLECTOR_SPOTLIGHTS,getCollectorSpotlights,validCollectorFeature} from '../collector-spotlights.mjs';
import {PREMIUM_CARDS} from '../premium-source-cards.mjs';
import {titleSearchPresets} from '../quanta-card-actions.mjs';

test('Topps, Beckett and VAMWorld open with independently credited actual collectibles',()=>{
 const configured=new Set(PREMIUM_CARDS.map(c=>c.id));
 for(const id of ['topps','beckett','vamworld']){
  const items=getCollectorSpotlights(id);
  assert.ok(configured.has(id));
  assert.ok(items?.length>0,id+' must have photographed examples');
  assert.equal(new Set(items.map(x=>x.id)).size,items.length);
  for(const item of items){
   assert.ok(validCollectorFeature(item),id+': safe https image and source');
   assert.ok(item.credit.length>6&&item.subhead.length>12);
   assert.ok(item.facts.length>=3&&item.detail.length>40);
   assert.ok(item.valueNote.length>20);
   assert.ok(!/https:\/\/.*(placeholder|favicon|dummyimage)/i.test(item.image));
  }
 }
});
test('Scarface image is the identified specimen and any comparable price is explicitly dated and distinct',()=>{
 const item=getCollectorSpotlights('vamworld').find(x=>x.id==='scarface-ms62');
 assert.match(item.title,/1888-O.*VAM-1B4/);
 assert.match(item.credit,/Scotsman/);
 assert.match(item.valueNote,/different PCGS MS64 VAM-1B3/i);
 assert.match(item.valueNote,/NOT a value/i);
});
test('Topps visual originates from official manufacturer product CDN',()=>{
 for(const item of getCollectorSpotlights('topps')){
  assert.equal(new URL(item.image).hostname,'cdn.shopify.com');
  assert.equal(new URL(item.imageSource).hostname,'www.topps.com');
  assert.match(item.valueNote,/no unverified|requires an exact/i);
 }
});
test('Unknown provider has no falsely featured photo',()=>{
 assert.equal(getCollectorSpotlights('not-real'),null);
 assert.equal(validCollectorFeature({image:'javascript:alert(1)',imageSource:'https://topps.com',title:'bad'}),false);
});

test('featured item has three real title-derived searches with no empty generic field',()=>{
 const coin=titleSearchPresets({name:'1888-O VAM-1B4 Scarface',category:'Coin varieties'});
 const card=titleSearchPresets({name:'2026 Topps Chrome Nolan McLean RC',category:'Trading cards'});
 assert.equal(coin.length,3);assert.equal(card.length,3);
 assert.equal(coin[0].query,'1888-O VAM-1B4 Scarface');
 assert.match(coin[1].query,/die variety/);
 assert.match(card[1].query,/checklist card number/);
 assert.ok([...coin,...card].every(x=>x.label&&x.query.includes(x===coin[0]?'1888-O':x.query.includes('Topps')?'2026':'1888-O')));
 assert.equal(titleSearchPresets({name:''}).length,0);
});

test('Beckett feature photography is an actual BGS graded sports card, not abstract grading art',()=>{
 const items=getCollectorSpotlights('beckett');
 assert.equal(items.length,2);
 for(const item of items){
  assert.match(item.title,/Topps Chrome.*BGS 9\.5/);
  assert.match(item.credit,/photographed Beckett-graded card/);
  assert.match(item.subhead,/#(150|169A)/);
  assert.match(item.valueNote,/before|no unverified/i);
 }
});
