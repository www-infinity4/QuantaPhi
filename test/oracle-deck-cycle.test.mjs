import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanFeedState,nextDeckCycle,nextFeedDirection,markViewed} from '../quanta-feed-rank.mjs';

const cards=[
 {id:'walmart-shopping',name:'Walmart',category:'Shopping',feature:'Shop groceries',study:'Pizza and food'},
 {id:'deck-shop',name:'ShopPhi',category:'Shopping',feature:'Shop coins',study:'Coin listing'},
 {id:'pixie-stories',name:'Pixie Stories',category:'Stories',feature:'Read stories',study:'Books'},
 {id:'trending-nba',name:'NBA',category:'Sports',feature:'Watch scores',study:'NBA games'},
 {id:'cardone-capital',name:'Cardone',category:'Real estate',feature:'Study investment',study:'Property'},
 {id:'source-google',name:'Google',category:'Search',feature:'Search web',study:'Queries'}
];

for(const tab of ['public','for-you','following']){
 test(tab+' rotates through every ready card despite two dominant favorites',()=>{
  let state={...cleanFeedState({following:tab==='following'?cards.map(c=>c.id):[],
   counts:{'walmart-shopping':300,'deck-shop':250}}),catalog:cards,
   quantScores:{'walmart-shopping':70,'deck-shop':70}};
  let current=cards[0].id;
  let seen=new Set([current]);
  const visited=[current];
  for(let i=1;i<cards.length;i++){
   const round=nextDeckCycle(cards,current,seen);
   assert.equal(round.restarted,false);
   assert.equal(round.remaining,cards.length-i);
   const pick=nextFeedDirection(round.cards,tab,state,current).card;
   assert.ok(pick,tab+' has a next card');
   assert.ok(!visited.includes(pick.id),'No repeats until every ready card was seen: '+pick.id);
   current=pick.id;seen=round.seen;seen.add(current);visited.push(current);
   state=markViewed(state,current);
  }
  assert.equal(new Set(visited).size,cards.length);
  const round=nextDeckCycle(cards,current,seen);
  assert.equal(round.restarted,true);
  assert.equal(round.remaining,cards.length-1);
  assert.equal(round.cards.length,cards.length);
 });
}

test('newly admitted completed cards join the active round without resetting follows',()=>{
 const current=cards[0].id,seen=new Set(cards.slice(0,5).map(c=>c.id));
 const next=nextDeckCycle(cards,current,seen);
 assert.equal(next.restarted,false);
 assert.deepEqual(next.cards.map(c=>c.id),[current,'source-google']);
 assert.equal(next.remaining,1);
});
test('single-card feeds cannot loop or throw',()=>{
 const only=nextDeckCycle(cards.slice(0,1),cards[0].id,new Set([cards[0].id]));
 assert.equal(only.remaining,0);
 assert.equal(only.cards.length,1);
});
