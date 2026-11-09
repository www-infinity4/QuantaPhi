import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {commitFollowing,saveNavigationProgress} from '../quanta-feed-rank.mjs';

const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const mock=(initial={})=>{
 let payload=JSON.stringify(initial),writable=true;
 return {getItem:()=>payload,setItem:(_,next)=>{if(!writable)throw Error('quota exceeded');payload=next},
  get:()=>JSON.parse(payload),deny:()=>{writable=false}};
};
test('Follow write preserves concurrent card/star/count state and confirms readback',()=>{
 const db=mock({following:['card-a'],counts:{'card-b':2},viewed:{'card-b':1},advance:2});
 const first=commitFollowing(db,'card-b');
 assert.equal(first.ok,true);assert.equal(first.followed,true);
 assert.deepEqual(db.get().following,['card-a','card-b']);
 assert.equal(db.get().counts['card-b'],2);
 const unfollow=commitFollowing(db,'card-b');
 assert.equal(unfollow.ok,true);assert.equal(unfollow.followed,false);
 assert.deepEqual(db.get().following,['card-a']);
});
test('blocked storage never falsely claims Follow succeeded',()=>{
 const db=mock();db.deny();assert.equal(commitFollowing(db,'card-a').ok,false);
 const read=mock();
 const ignoresWrites={getItem:read.getItem,setItem:()=>{}};
 assert.equal(commitFollowing(ignoresWrites,'card-a').ok,false);
});
test('navigation progress must not reset newly followed cards or Quant counts',()=>{
 const db=mock({following:['card-new'],counts:{'radio':7},viewed:{'radio':3},advance:4});
 const older={following:[],counts:{radio:2},viewed:{radio:5},advance:6};
 const result=saveNavigationProgress(db,older);
 assert.equal(result.ok,true);
 assert.deepEqual(db.get().following,['card-new']);
 assert.equal(db.get().counts.radio,7);
 assert.equal(db.get().viewed.radio,5);
 assert.equal(db.get().advance,6);
});
test('featured and detail views do not display duplicate Follow on top of toolbar',()=>{
 const src=file('quanta-feed.mjs');
 const deck=file('oracle-card-deck.js'),actions=file('quanta-card-actions.mjs');
 assert.doesNotMatch(src,/buttons\.append\(followButton\(selected,refresh\)\)/);
 assert.doesNotMatch(src,/actions\.append\(followButton\(card,renderDetailAgain\)\)/);
 assert.match(src,/mountCardTools\(tools,selected\)/);
 assert.match(deck,/\{showFollow:false\}/);
 assert.match(deck,/follow\.hidden=!active\|\|active\.id\.startsWith\('source-'\)/);
 assert.match(actions,/if\(options\.showFollow!==false\)/);
});
test('carousel explains rotation neutrally without describing the visitor or diagnosing pages',()=>{
 const oracle=file('oracle-card-deck.js'),feed=file('quanta-feed.mjs');
 assert.doesNotMatch(oracle,/proposed\.title\+' · '\+pick\.reason/);
 assert.doesNotMatch(feed,/Next direction · '\+lastReason/);
 assert.match(oracle,/Next card:/);
});
test('image studio has a prompt-first workflow, honest generation limitations and professional mobile style',()=>{
 const js=file('phi-image-builder.js'),css=file('phi-image-builder.css');
 const brief=js.indexOf("const brief=section(");
 const format=js.indexOf("const format=section(");
 assert.ok(brief>=0&&format>=0&&brief<format,'Description should be first before advanced format');
 assert.match(js,/Images are generated using the available QuantaPhi renderer/i);
 assert.match(js,/Results may vary/i);
 assert.match(css,/\/\* Professional image studio/);
 assert.match(css,/font-size:16px/);
 assert.match(css,/min-height:48px/);
});
