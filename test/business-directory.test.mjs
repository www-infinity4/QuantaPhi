import test from 'node:test';
import assert from 'node:assert/strict';
import worker, {safeListing,normalizeSearch} from '../workers/business-directory.js';

test('search requires useful city/state and bounded user terms',()=>{
 assert.equal(normalizeSearch(new URL('https://quantaphi.org/api/business/search?city=Denver&state=CO&q=coffee')).state,'CO');
 assert.equal(normalizeSearch(new URL('https://quantaphi.org/api/business/search?q=bar')).error,'state_required');
 assert.equal(normalizeSearch(new URL('https://quantaphi.org/api/business/search?city=Denver&state=Colorado')).error,'invalid_state');
 assert.equal(normalizeSearch(new URL('https://quantaphi.org/api/business/search?state=CO')).error,'city_or_query_required');
});
test('directory listing never falsely claims paid ad or unlicensed image',()=>{
 const listing={id:'overture:x',name:'Cafe Test',city:'Denver',state:'CO',category:'cafe',
   website:'https://cafe.example.com/',source_url:'https://overturemaps.org/',
   source_name:'Overture Maps',image_url:'https://cafe.example.com/photo.jpg',image_rights:'',
   ad_status:'approved_partner',claimed:0,confidence:0.9,status:'listed'};
 const clean=safeListing(listing);
 assert.equal(clean.sponsored,false);assert.equal(clean.image_url,'');
 assert.equal(clean.website,'https://cafe.example.com/');
 assert.equal(safeListing({...listing,image_rights:'merchant_authorized'}).image_url,'https://cafe.example.com/photo.jpg');
 assert.equal(safeListing({...listing,category:'cannabis_dispensary'}),null);
 assert.equal(safeListing({...listing,category:'nicotine_vape_shop'}),null);
 assert.equal(safeListing({...listing,status:'review'}),null);
});
test('Worker refuses writes and missing D1 binding',async()=>{
 assert.equal((await worker.fetch(new Request('https://quantaphi.org/api/business/search?state=CO&city=Denver'),{})).status,503);
 assert.equal((await worker.fetch(new Request('https://quantaphi.org/api/business/search',{method:'POST'}),{})).status,405);
});
test('Worker serves only source-backed organic listings and no cached personal data',async()=>{
 const db={prepare(sql){return {bind(...params){return {async all(){return {results:[
  {id:'overture:x',name:'Cafe Test',city:'Denver',state:'CO',category:'cafe',website:'https://cafe.example.com/',source_url:'https://overturemaps.org/',source_name:'Overture Maps',image_rights:'',image_url:'',status:'listed'},
  {id:'overture:y',name:'Not public',city:'Denver',state:'CO',category:'cannabis_dispensary',website:'https://example.com/',source_url:'https://overturemaps.org/',source_name:'Overture Maps',status:'listed'}
 ]}}}}}}};
 const r=await worker.fetch(new Request('https://quantaphi.org/api/business/search?state=CO&city=Denver&q=cafe'),{BUSINESSES:db});
 assert.equal(r.status,200);assert.equal(r.headers.get('X-Content-Type-Options'),'nosniff');
 const data=await r.json();
 assert.equal(data.items.length,1);assert.equal(data.items[0].name,'Cafe Test');
 assert.equal(data.items[0].sponsored,false);assert.equal(data.count,1);
});
