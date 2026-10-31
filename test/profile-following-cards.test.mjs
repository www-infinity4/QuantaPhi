import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {profileComplete,readProfileInterests,PROFILE_KEY} from '../quanta-profile-card.mjs';
import {cleanFeedState,feedCandidates,toggleFollowing} from '../quanta-feed-rank.mjs';

const cards=[
 {id:'brand-a',name:'Brand A',category:'Shopping',feature:'Explore products'},
 {id:'brand-b',name:'Brand B',category:'Music',feature:'Listen to radio'},
 {id:'brand-c',name:'Brand C',category:'Stories',feature:'Read stories'}
];
const source=file=>readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('follow is an exclusive move across Public, For You and Following',()=>{
 let s=cleanFeedState({});
 s=toggleFollowing(s,'brand-a');
 assert.deepEqual(feedCandidates(cards,'public',s).map(c=>c.id),['brand-b','brand-c']);
 assert.deepEqual(feedCandidates(cards,'following',s).map(c=>c.id),['brand-a']);
 assert.equal(feedCandidates(cards,'for-you',s).some(c=>c.id==='brand-a'),false);
 s=toggleFollowing(s,'brand-a');
 assert.deepEqual(feedCandidates(cards,'following',s),[]);
 assert.ok(feedCandidates(cards,'public',s).some(c=>c.id==='brand-a'));
});

test('profile is optional, local-only and completion is explicit',()=>{
 const old=globalThis.localStorage;
 let stored='';
 globalThis.localStorage={getItem(key){assert.equal(key,PROFILE_KEY);return stored}};
 try{
  assert.equal(profileComplete(),false);
  stored=JSON.stringify({displayName:'A',complete:false});
  assert.equal(profileComplete(),false);
  stored=JSON.stringify({displayName:'A',complete:true});
  assert.equal(profileComplete(),true);
  stored=JSON.stringify({complete:true,interests:['Music','Sports','INVALID']});
  assert.deepEqual(readProfileInterests(),['Music','Sports']);
  stored='not json';
  assert.equal(profileComplete(),false);
  assert.deepEqual(readProfileInterests(),[]);
 }finally{if(old===undefined)delete globalThis.localStorage;else globalThis.localStorage=old}
 const profile=source('quanta-profile-card.mjs');
 assert.match(profile,/localStorage\.setItem\(PROFILE_KEY/);
 assert.match(profile,/complete:true/);
 assert.match(profile,/onComplete\(profile\)/);
 assert.doesNotMatch(profile,/document\.cookie|wallet\.balance|fetch\(/);
});

test('onboarding appears in actual live carousel while completed cards stop recurring',()=>{
 const deck=source('oracle-card-deck.js'),style=source('oracle-card-deck.css'),html=source('index.html');
 assert.match(deck,/quantaProfileCard/);
 assert.match(deck,/if\(profileEntry&&ready\.includes\(profileEntry\)\)return profileEntry/);
 assert.match(deck,/profileNode\.hidden=profileComplete\(\)/);
 assert.match(deck,/profileNode\.hidden=true;updateTabs\(\);predict\(\);start\(\)/);
 assert.match(deck,/selectedTab='following'/);
 assert.match(deck,/updateCardPost\(active\)/);
 assert.match(deck,/new CustomEvent\('quantaphi:feed-updated'/);
 assert.match(style,/\.oracle-card-post-note/);
 assert.match(html,/oracle-card-deck\.js\?v=20261030-profile-follow-v3/);
 assert.match(source('quanta-profile.html'),/quantaProfileStandalone/);
});

test('voluntary interest categories affect For You without entering the saved ledger',()=>{
 const music={id:'music-1',name:'Radio station',category:'Audio',feature:'Listen to radio shows'};
 const plain={id:'plain-1',name:'Basic listing',category:'General',feature:'Browse something'};
 const state={...cleanFeedState({}),profileInterests:['Music'],catalog:[plain,music]};
 assert.equal(feedCandidates([plain,music],'for-you',state)[0].id,music.id);
 assert.equal(cleanFeedState(state).profileInterests,undefined);
});
