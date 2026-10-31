import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSpotlights,chooseSpotlight,sourceUrl,publicImageUrl,fetchSpotlights} from '../quick-card-spotlights.mjs';
const now=Date.parse('2026-10-31T01:00:00Z');
const card={id:'fixture-store',name:'Source',official:'https://www.levi.com/',category:'Denim'};
const item=(extra={})=>({url:'https://www.levi.com/p/123',image:'https://lsco.scene7.com/is/image/123',title:'Denim jacket',checked_at:new Date(now-1000).toISOString(),...extra});
const normalize=rows=>normalizeSpotlights({schema_version:1,items:rows},card,now);
test('source photos and destinations stay bound; reject credentials, lookalikes and local image targets',()=>{
 assert.equal(sourceUrl('https://levi.com.attacker.test/x',card.official),null);
 assert.equal(sourceUrl('https://levi.com@attacker.test/x',card.official),null);
 for(const url of ['http://images.test/a','https://127.0.0.1/a','https://private.local/a','https://images.test:444/a'])assert.equal(publicImageUrl(url),null);
 assert.equal(normalize([item(),item(),item({url:'https://attacker.test/p'})]).length,1);
});
test('only fresh exact structured source prices display, without inventing search-snippet deals',()=>{
 const offer={price:'89.00',currency:'USD',evidence:'jsonld-offer'};
 assert.match(normalize([item({offer})])[0].price,/89/);
 for(const extra of [{offer:{...offer,evidence:'indexed'}},{offer:{...offer,valid_until:'2026-10-29T00:00:00Z'}},
  {offer:{...offer,valid_from:'2026-11-02T00:00:00Z'}},{offer:{...offer,availability:'https://schema.org/OutOfStock'}},
  {offer,checked_at:'2026-10-29T00:00:00Z'},{offer:{...offer,price:'-4'}},{offer:{...offer,currency:'dollars'}}])assert.equal(normalize([item(extra)])[0].price,'');
 assert.equal(normalize([item({checked_at:'2026-10-01T00:00:00Z'})]).length,0);
 assert.equal(normalize([item({checked_at:'2027-01-01T00:00:00Z'})]).length,0);
});
test('matching ranks unseen offers and cannot repeat the last when another is available',()=>{
 const items=normalize([item({url:'https://www.levi.com/p/1',title:'Denim jeans'}),item({url:'https://www.levi.com/p/2',title:'Work jacket'}),item({url:'https://www.levi.com/p/3',title:'Cotton shirt'})]);
 const first=chooseSpotlight(items,{interests:['work-jacket']});assert.equal(first.title,'Work jacket');
 const second=chooseSpotlight(items,{seen:[first.id],last:first.id,interests:['work-jacket']});assert.notEqual(second.id,first.id);
 const third=chooseSpotlight(items,{seen:[first.id,second.id],last:second.id});assert.ok(![first.id,second.id].includes(third.id));
 assert.notEqual(chooseSpotlight(items,{seen:items.map(x=>x.id),last:first.id}).id,first.id);
});
test('indexed images use a fixed public broker and never promote result prices to source offers',async()=>{
 let requested;
 const rows=await fetchSpotlights(card,async url=>{requested=url;return {ok:true,json:async()=>({results:[{
  url:'https://www.levi.com/p/1',title:'Levi jeans $10 sale',img_src:'https://lsco.scene7.com/is/image/1',price:10,currency:'USD'
 },{url:'https://attacker.test/x',title:'Unrelated',img_src:'https://attacker.test/p.jpg'}]})}});
 assert.match(requested,/^https:\/\/orange-brook-a2ac\.marvaseater\.workers\.dev\/search\?/);
 assert.equal(rows.length,1);assert.equal(rows[0].price,'');assert.equal(rows[0].method,'Indexed preview');
});
