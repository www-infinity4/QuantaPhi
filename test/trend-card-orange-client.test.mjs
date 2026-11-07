import test from 'node:test';
import assert from 'node:assert/strict';
import {loadOwnOrangeScores} from '../quanta-feed-orange.mjs';
import {readFileSync} from 'node:fs';

const candidates=[
 {id:'pink-floyd-radio',name:'Pink Floyd radio',category:'music',feature:'Listen to classic rock'},
 {id:'classic-rock-songs',name:'Classic rock songs',category:'music',feature:'Artist releases'},
 {id:'unsafe',name:'Restricted sample',category:'21+',feature:'Adults only'},
];
test('Orange is not called for anonymous visitors or without the existing signed-in bridge',async()=>{
 assert.deepEqual(await loadOwnOrangeScores(null,candidates,{title:'Pink Floyd radio'}),{connected:false,scores:{}});
});
test('For You explicitly invokes the authenticated same-origin Quant AI decision tool',async()=>{
 let calls=0;
 const bridge={async authenticatedFetch(url,options){
  calls++;
  assert.equal(url,'/api/quant-orange/decision');
  assert.equal(options.method,'POST');
  const body=JSON.parse(options.body);
  assert.equal(body.consent,true);
  assert.ok(body.candidates.some(c=>c.id==='pink-floyd-radio'));
  assert.equal(body.candidates.some(c=>c.id==='unsafe'),false);
  assert.deepEqual(body.seen_ids,['classic-rock-songs']);
  return {ok:true,async json(){return {ok:true,placement_authorized:false,ranked:[{id:'pink-floyd-radio',score:90},{id:'forged',score:500}]}}};
 }};
 const result=await loadOwnOrangeScores(bridge,candidates,{title:'Pink Floyd radio'},['classic-rock-songs']);
 assert.equal(calls,1);
 assert.equal(result.connected,true);
 assert.ok(result.scores['pink-floyd-radio']>0);
 assert.equal(result.scores.forged,undefined);
});
test('server route and feed use this only as authenticated For You ranking, not public approval',()=>{
 const src=readFileSync(new URL('../quanta-feed.mjs',import.meta.url),'utf8');
 const worker=readFileSync(new URL('../workers/quantaphi-site/worker.js',import.meta.url),'utf8');
 assert.match(src,/loadOwnOrangeScores/);
 assert.match(src,/tab==='for-you'/);
 assert.match(worker,/\/api\/quant-orange\/decision/);
 assert.match(worker,/TREND_CARD_ENGINE/);
});
