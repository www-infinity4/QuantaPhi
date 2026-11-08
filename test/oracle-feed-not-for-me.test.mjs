import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {cleanFeedState,feedCandidates,hideForYou,restoreForYou} from '../quanta-feed-rank.mjs';

const cards=[
 {id:'denali',name:'SUV ad',category:'Cars',feature:'Explore an SUV',study:'A product advertisement'},
 {id:'radio',name:'Music card',category:'Music',feature:'Listen to music',study:'Classic albums'},
 {id:'books',name:'Book card',category:'Reading',feature:'Read stories',study:'Stories'}
];
const file=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('not-for-me state survives storage cleanup without saving user identity or raw interests',()=>{
 const saved=cleanFeedState({following:['denali'],hiddenForYou:['denali','denali','bad/path','radio'],counts:{denali:12}});
 assert.deepEqual(saved.hiddenForYou,['denali','radio']);
 assert.deepEqual(saved.following,['denali']);
 assert.equal(saved.counts.denali,12);
 assert.equal(saved.hiddenForYou.some(id=>id.includes('/')),false);
 assert.deepEqual(cleanFeedState({hiddenForYou:'denali'}).hiddenForYou,[]);
 assert.ok(cleanFeedState({hiddenForYou:Array.from({length:900},(_,i)=>'card-'+i)}).hiddenForYou.length<=800);
});

test('Not for me affects For You only; Public, Following and original cards remain accessible',()=>{
 let state=cleanFeedState({following:['denali','radio'],counts:{denali:42}});
 state=hideForYou(state,'denali');
 assert.deepEqual(state.hiddenForYou,['denali']);
 assert.deepEqual(feedCandidates(cards,'for-you',state).map(c=>c.id).sort(),['books','radio']);
 assert.ok(feedCandidates(cards,'public',state).some(c=>c.id==='denali'));
 assert.ok(feedCandidates(cards,'following',state).some(c=>c.id==='denali'));
 assert.equal(state.counts.denali,42,'hiding does not change engagement or a coin ledger');
 state=hideForYou(state,'denali');
 assert.equal(state.hiddenForYou.length,1,'repeat hide is idempotent');
 state=restoreForYou(state,'denali');
 assert.ok(feedCandidates(cards,'for-you',state).some(c=>c.id==='denali'));
 state=hideForYou(state,'radio');
 assert.deepEqual(restoreForYou(state).hiddenForYou,[],'restore all is explicit and reversible');
});

test('invalid preference IDs cannot be persisted or alter other card data',()=>{
 const state=cleanFeedState({following:['radio'],viewed:{radio:2}});
 assert.equal(hideForYou(state,'bad/id'),state);
 assert.equal(hideForYou(state,'x'.repeat(71)),state);
 assert.deepEqual(hideForYou(state,'books').following,['radio']);
 assert.deepEqual(hideForYou(state,'books').viewed,{radio:2});
});

test('Oracle mobile controls use the original viewer and explain the scoped preference',()=>{
 const html=file('index.html'),deck=file('oracle-card-deck.js'),css=file('oracle-card-spotlight.css');
 assert.match(html,/id="oracleCardNotForMe"/);
 assert.match(html,/id="oracleCardRestoreHidden"/);
 assert.match(deck,/hideForYou\(readDirections\(\),active\.feedId\)/);
 assert.match(deck,/restoreForYou\(readDirections\(\)\)/);
 assert.match(deck,/selectedTab==='for-you'/);
 assert.match(css,/#oracleCardNotForMe/);
 assert.match(css,/min-height:44px/);
 assert.match(deck,/stage\.append\(entry\.node\)/,'still moves the real card, never a fake preview');
});
