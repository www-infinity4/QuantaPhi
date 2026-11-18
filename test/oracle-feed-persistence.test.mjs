import test from 'node:test';
import assert from 'node:assert/strict';
import {commitFollowing,commitFeedPreference,saveNavigationProgress,cleanFeedState} from '../quanta-feed-rank.mjs';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
function storage(initial={}){
 let raw=JSON.stringify(initial),writable=true;
 return {getItem:()=>raw,setItem:(_,v)=>{if(!writable)throw Error('storage disabled');raw=v},
  read:()=>JSON.parse(raw),deny:()=>{writable=false}};
}
test('Follow readback survives a stale navigation save',()=>{
 const db=storage({following:['card-a'],counts:{'card-b':7},viewed:{'card-b':2},advance:4});
 const older=cleanFeedState(db.read());
 assert.equal(commitFollowing(db,'card-b').ok,true);
 const nav=saveNavigationProgress(db,{...older,viewed:{'card-b':6},advance:8});
 assert.equal(nav.ok,true);
 assert.deepEqual(db.read().following,['card-a','card-b']);
 assert.equal(db.read().counts['card-b'],7);
 assert.equal(db.read().viewed['card-b'],6);
 assert.equal(db.read().advance,8);
 assert.equal(commitFollowing(db,'card-b').followed,false);
 assert.deepEqual(db.read().following,['card-a']);
});
test('Hide, chosen interests, restore and Following stay independent of impressions',()=>{
 const db=storage({following:['card-a']});
 const older=cleanFeedState(db.read());
 assert.equal(commitFeedPreference(db,'hide','card-b').ok,true);
 assert.equal(commitFeedPreference(db,'interest','sports').ok,true);
 assert.equal(saveNavigationProgress(db,{...older,viewed:{'card-c':2},advance:3}).ok,true);
 assert.deepEqual(db.read().hidden,['card-b']);
 assert.deepEqual(db.read().interests,['sports']);
 assert.deepEqual(db.read().following,['card-a']);
 assert.equal(commitFeedPreference(db,'restore').ok,true);
 assert.deepEqual(db.read().hidden,[]);
 assert.deepEqual(db.read().interests,['sports']);
});
test('No false saved state when storage fails or sensitive categories are invalid',()=>{
 const db=storage();db.deny();
 assert.equal(commitFollowing(db,'card-a').ok,false);
 assert.equal(commitFeedPreference(db,'hide','card-a').ok,false);
 const writable=storage();
 assert.equal(commitFeedPreference(writable,'interest','adult').ok,false);
 assert.equal(commitFeedPreference(writable,'interest','healthcare').ok,false);
 assert.deepEqual(writable.read(),{});
 assert.equal(commitFollowing({getItem:()=>JSON.stringify({}),setItem:()=>{}},'card-a').ok,false);
});
test('All original Oracle/public/action entrypoints use confirmed preferences',()=>{
 const deck=file('oracle-card-deck.js'),feed=file('quanta-feed.mjs'),actions=file('quanta-card-actions.mjs');
 assert.match(deck,/commitOraclePreference\('follow',active\.feedId\)/);
 assert.match(deck,/commitOraclePreference\('hide',hiddenId\)/);
 assert.match(deck,/commitOraclePreference\('interest',selectedDepartment\)/);
 assert.match(deck,/saveNavigationProgress\(localStorage,feedState\)/);
 assert.match(feed,/saveChoice\('follow',card\.id\)/);
 assert.match(feed,/saveChoice\('hide',card\.id\)/);
 assert.match(feed,/saveChoice\('restore'\)/);
 assert.match(feed,/saveNavigationProgress\(localStorage,state\)/);
 assert.match(actions,/commitFollowing\(localStorage,followId\)/);
});
