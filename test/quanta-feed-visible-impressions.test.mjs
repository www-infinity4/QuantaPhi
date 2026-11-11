import test from 'node:test';
import assert from 'node:assert/strict';
import {registerVisibleCard} from '../quanta-feed-exposure.mjs';
import {cleanFeedState,nextFeedDirection} from '../quanta-feed-rank.mjs';

const base=()=>cleanFeedState({});
const card=(id,category='Collectibles')=>({id,name:id,category,feature:'Original verified source'});

test('actual visible first feature card is counted once; re-render is not a fresh impression',()=>{
 const first=registerVisibleCard(base(),card('coins'),{visible:true,lastId:''});
 assert.equal(first.recorded,true);
 assert.equal(first.state.viewed.coins,1);
 const rerender=registerVisibleCard(first.state,card('coins'),{visible:true,lastId:first.lastId});
 assert.equal(rerender.recorded,false);
 assert.equal(rerender.state.viewed.coins,1);
});
test('another visible card records one impression without a raw search payload',()=>{
 const first=registerVisibleCard(base(),card('coins'),{visible:true});
 const next=registerVisibleCard(first.state,card('radio'),{visible:true,lastId:first.lastId});
 assert.equal(next.recorded,true);
 assert.equal(next.state.viewed.radio,1);
 assert.equal(next.state.viewed.coins,1);
 assert.equal(Object.hasOwn(next.state,'query'),false);
});
test('hidden pages and invalid IDs cannot fabricate card impressions',()=>{
 const hidden=registerVisibleCard(base(),card('radio'),{visible:false});
 assert.equal(hidden.recorded,false);
 assert.equal(hidden.state.viewed.radio,undefined);
 assert.equal(registerVisibleCard(base(),card('<script>'),{visible:true}).recorded,false);
});
test('medical/ointment product discovery never becomes a profile impression',()=>{
 for(const c of [card('neosporin','Health'),card('blue-star-ointment','Shopping'),card('first-aid','First aid')]){
  const observation=registerVisibleCard(base(),c,{visible:true});
  assert.equal(observation.recorded,false);
  assert.deepEqual(observation.state.viewed,{});
 }
});
test('least-exposed source candidates can rotate after a saved initial impression',()=>{
 const cards=[card('alpha'),card('beta'),card('gamma')];
 const first=nextFeedDirection(cards,'public',{...base(),catalog:cards},'', '').card;
 const step=registerVisibleCard(base(),first,{visible:true});
 const after=nextFeedDirection(cards,'public',{...step.state,catalog:cards},'','').card;
 assert.notEqual(after.id,first.id,'a fresh page should be able to choose an unviewed feature card');
});
