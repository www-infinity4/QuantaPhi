import test from 'node:test';import assert from 'node:assert/strict';
import {searchQuickCards,lookupQuickCard} from '../quick-card-search-core.mjs';
import {findSourceCard,validSourceCard} from '../source-quick-cards.mjs';
test('Burger King matches its original brand before a related news card, including aliases and spacing',()=>{
 for(const query of ['Burger King','burger king',' BURGER   KING ','burgerking','bk','Burger King near me']){
  const cards=searchQuickCards(query);assert.equal(cards[0]?.id,'burger-king',query);assert.equal(cards[0].official,'https://www.bk.com/');
 }
 assert.equal(searchQuickCards('google')[0]?.id,'google');
 assert.equal(searchQuickCards('McDonalds')[0]?.id,'mcdonalds');
});
test('no match invents a destination, and unregistered/prototype/URL ids cannot resolve',()=>{
 for(const query of ['',null,'unrelated-zzq-topic','kingfisher','<script>alert(1)</script>'])assert.deepEqual(searchQuickCards(query),[]);
 for(const id of ['__proto__','constructor','https://evil.example/',null,'not-a-real-card'])assert.equal(lookupQuickCard(id),null);
 for(const c of searchQuickCards('Burger King')){assert.ok(c.official.startsWith('https://'));assert.match(c.route,/^\/source-quick-card\.html\?card=/)}
});
test('a matched catalog card opens through the existing real Quick Card detail route',()=>{
 const bk=findSourceCard('burger-king');assert.equal(bk.name,'Burger King');assert.equal(bk.official,'https://www.bk.com/');assert.equal(validSourceCard(bk),true);
 assert.equal(findSourceCard('google').feature,'Search the web');
 assert.equal(findSourceCard('not-a-real-card'),null);
});
