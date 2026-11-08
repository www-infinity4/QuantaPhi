import test from 'node:test';
import assert from 'node:assert/strict';
import {searchIndexedResources} from '../developer-indexed-search.mjs';
const entries=[
 {index:15,resource:{id:'github-1',category:'profiles',label:'Public Profile Builder',description:'Avatars and account profile editing',repo:'open/profile-builder'}},
 {index:16,resource:{id:'github-2',category:'carousels',label:'Accessible Slides',description:'Mobile carousel with swipe controls',repo:'open/slide-viewer'}},
 {index:17,resource:{id:'github-3',category:'profiles',label:'Avatars',description:'Public user cards and photo avatars',repo:'open/avatars'}},
 {index:18,resource:{id:'github-4',category:'buttons',label:'Pill Buttons',description:'Tap friendly buttons',repo:'open/buttons'}}
];

test('searches real registered resource cards by terms and category without fabricating suggestions',()=>{
 const matching=searchIndexedResources(entries,{query:'profile',topic:'profiles'});
 assert.equal(matching.total,1);
 assert.equal(matching.items[0].index,15);
 assert.equal(matching.items[0].resource.id,'github-1');
 assert.equal(searchIndexedResources(entries,{query:'profile',topic:'buttons'}).total,0);
 assert.equal(searchIndexedResources(entries,{query:'not-a-repo'}).total,0);
});

test('search works across source name, description and original repository; query is case-insensitive',()=>{
 assert.deepEqual(searchIndexedResources(entries,{query:'AVATARS'}).items.map(x=>x.index),[15,17]);
 assert.deepEqual(searchIndexedResources(entries,{query:'mobile swipe'}).items.map(x=>x.index),[16]);
 assert.deepEqual(searchIndexedResources(entries,{query:'open/buttons'}).items.map(x=>x.index),[18]);
 assert.equal(searchIndexedResources(entries,{query:'javascript:alert(1)'}).total,0);
});

test('paged browsing is bounded, preserves actual card indices, and never mutates input',()=>{
 const many=Array.from({length:32},(_,i)=>({
  index:5+i,resource:{id:'github-'+(200+i),category:'carousels',
   label:'Carousel '+(i+1),description:'Slider components',repo:'open/carousel-'+i}
 }));
 const before=JSON.stringify(many);
 const first=searchIndexedResources(many,{topic:'carousels',limit:8,offset:0});
 assert.deepEqual(first.items.map(x=>x.index),[5,6,7,8,9,10,11,12]);
 assert.equal(first.total,32);assert.equal(first.nextOffset,8);assert.equal(first.previousOffset,0);
 const last=searchIndexedResources(many,{topic:'carousels',limit:8,offset:28});
 assert.deepEqual(last.items.map(x=>x.index),[29,30,31,32,33,34,35,36]);
 assert.equal(last.offset,24);
 assert.equal(last.nextOffset,null);
 assert.equal(last.previousOffset,16);
 assert.equal(JSON.stringify(many),before);
});

test('rejects malformed filters, caps giant limits and prevents unexpected broadening',()=>{
 assert.equal(searchIndexedResources(entries,{topic:'unknown-category'}).total,0);
 assert.equal(searchIndexedResources(entries,{query:'profile'.repeat(70)}).total,0);
 const huge=searchIndexedResources(Array.from({length:25},(_,i)=>({
  index:i,resource:{id:'github-'+i,label:'Test',category:'buttons',repo:'foo/bar'}
 })),{limit:1000});
 assert.ok(huge.items.length<=12);
 assert.equal(huge.total,25);
 assert.equal(searchIndexedResources(null).total,0);
});
