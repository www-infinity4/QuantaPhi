import test from 'node:test';
import assert from 'node:assert/strict';
import {rememberSpotlightCreative,forgetSpotlightCreative,currentSpotlightCreative,requestedSpotlight,spotlightCardDestination} from '../card-spotlight-creative.mjs';
import {sharePreviewUrl} from '../quanta-card-actions.mjs';
import {safePreviewImage} from '../quick-card-preview.mjs';
const origin='https://quantaphi.org';
const card={id:'levis-501-dark',name:'Seed dark jeans',official:'https://www.levi.com/p/seed',route:'/?card=levis-501-dark',image:'https://images.test/seed.jpg'};
const row=(n)=>({url:'https://www.levi.com/p/'+n,title:'Current product '+n,image:'https://lscoglobal.scene7.com/is/image/lscoglobal/item-'+n,
 description:'Description for product '+n,checked_at:new Date().toISOString()});
function view(){const node={dataset:{}};return {node,host:{closest:()=>node}}}
test('Share uses the currently displayed title, photo and item, and re-reads after rotation',()=>{
 const {node,host}=view();
 for(const n of [1,2]){
  const current=row(n);rememberSpotlightCreative(node,card,current);
  const shared=new URL(sharePreviewUrl(card,host,{origin}));
  assert.equal(shared.pathname,'/q-share');assert.equal(shared.searchParams.get('title'),current.title);
  assert.equal(shared.searchParams.get('image'),current.image);assert.equal(shared.searchParams.get('text'),current.description);
  const destination=new URL(shared.searchParams.get('dest'));
  assert.equal(destination.origin,origin);assert.equal(destination.searchParams.get('card'),card.id);assert.equal(destination.searchParams.get('spotlight'),current.url);
 }
});
test('presentation state cannot transfer to another card, source, hidden manual results or an expired selection',()=>{
 const {node,host}=view();rememberSpotlightCreative(node,card,row(1));
 assert.equal(currentSpotlightCreative(node,{...card,id:'other-card'}),null);
 assert.equal(currentSpotlightCreative(node,{...card,official:'https://other.test/'}),null);
 const copied=currentSpotlightCreative(node,card);copied.url='https://untrusted.test/';assert.equal(currentSpotlightCreative(node,card).url,row(1).url);
 node.dataset.spotlightManual='true';assert.equal(currentSpotlightCreative(node,card),null);delete node.dataset.spotlightManual;
 assert.equal(currentSpotlightCreative(node,card,Date.now()+8*86400000),null);
 forgetSpotlightCreative(node);assert.equal(currentSpotlightCreative(node,card),null);
 assert.equal(new URL(sharePreviewUrl(card,host,{origin})).searchParams.get('title'),card.name);
});
test('shared item selects a matching checked result without admitting arbitrary or missing products',()=>{
 const items=[row(1),row(2)];assert.equal(requestedSpotlight(items,items[1].url,card.official),items[1]);
 for(const url of ['https://levi.com.untrusted.test/p/1','https://untrusted.test/p/1','https://www.levi.com/p/missing','javascript:alert(1)'])assert.equal(requestedSpotlight(items,url,card.official),null);
 assert.equal(spotlightCardDestination('https://untrusted.test/',row(1),origin),'');
});
test('real retailer image endpoints are accepted while lookalikes, wrong paths, scripts and SVGs are refused',()=>{
 for(const image of ['https://lscoglobal.scene7.com/is/image/lscoglobal/item-1','https://lsco.scene7.com/is/image/lsco/item-2','https://img.guess.com/image/upload/f_auto,q_auto/v1/NA/Style/ITEM'])assert.equal(safePreviewImage(image),image);
 for(const image of ['https://img.guess.com.attacker.test/image/upload/item','https://img.guess.com/account','https://lscoglobal.scene7.com/other/item','https://img.guess.com/image/upload/a.svg','https://img.guess.com:444/image/upload/item','https://localhost/a.jpg'])assert.equal(safePreviewImage(image),'');
});
