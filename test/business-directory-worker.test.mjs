import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{parseFilters,safeBusiness,escapeLike} from '../workers/business-directory/worker.mjs';

test('search filters clamp input and do not interpolate public SQL',()=>{
 const x=parseFilters(new URL('https://quantaphi.org/api/business-directory/records?state=CO&city=Denver&q=coffee%25_%27DROP&limit=999&offset=-3'));
 assert.equal(x.state,'CO');assert.equal(x.city,'Denver');
 assert.equal(x.limit,40);assert.equal(x.offset,0);
 assert.equal(escapeLike('a%b_c\\d'),String.raw`a\%b\_c\\d`);
 assert.equal(parseFilters(new URL('https://x.test/?state=Colorado&city=123_bad')).state,'');
});
test('directory never turns unclaimed businesses into paid ads or checkout links',()=>{
 const p=safeBusiness({id:'curated:x',name:'Example Shop',state:'CO',city:'Denver',category:'Candy',
  address:'123 Main, Denver, CO',website:'https://shop.example/',source_url:'https://example.org/source',
  source_name:'Curated',source_license:'public facts',ad_status:'approved_partner',claimed:0,
  image_url:'https://example.org/photo.jpg',image_rights:'',latitude:39.7,longitude:-104.9});
 assert.equal(p.sponsored,false);assert.equal(p.claimed,false);assert.equal(p.image_url,'');
 assert.equal(p.website,'https://shop.example/');
 assert.equal(p.source_url,'https://example.org/source');
 assert.equal(safeBusiness({...p,website:'javascript:alert(1)'}).website,'');
});
test('read-only worker returns paginated listings with bound SQL parameters',async()=>{
 const calls=[];
 const db={prepare(sql){const obj={bind(...params){calls.push({sql,params});return obj},
  async all(){return {results:[{id:'curated:1',name:'Coffee Place',city:'Denver',state:'CO',category:'Cafe',
    address:'Denver',website:'https://example.org/',source_name:'Curated',
    source_url:'https://example.org/',ad_status:'not_sponsored',claimed:0}]}}};
 return obj;}};
 const response=await worker.fetch(new Request('https://quantaphi.org/api/business-directory/records?q=%27%20OR%201%3D1--&state=CO'),{BUSINESS_DB:db});
 assert.equal(response.status,200);
 const value=await response.json();
 assert.equal(value.records.length,1);
 assert.equal(value.records[0].sponsored,false);
 assert.ok(calls[0].sql.includes('name LIKE ?'));
 assert.ok(!calls[0].sql.includes("' OR 1=1"));
 assert.ok(calls[0].params.some(v=>String(v).includes("' OR 1=1")));
});
test('mutating HTTP methods are rejected and origin is controlled',async()=>{
 const response=await worker.fetch(new Request('https://quantaphi.org/api/business-directory/records',{method:'POST'}),{BUSINESS_DB:{}});
 assert.equal(response.status,405);
 assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://quantaphi.org');
});
test('city queue and health endpoints are read-only and return real D1 counts',async()=>{
 const db={prepare(sql){const obj={bind(){return obj},async first(){
  return {businesses:15,states:1,queued:55,queued_states:50}
 },async all(){return {results:[{city:'Denver',state:'CO',status:'queued',priority:0,imported:0}]}}};
 return obj;}};
 const a=await worker.fetch(new Request('https://quantaphi.org/api/business-directory/health'),{BUSINESS_DB:db});
 assert.equal(a.status,200);assert.equal((await a.json()).businesses,15);
 const b=await worker.fetch(new Request('https://quantaphi.org/api/business-directory/cities'),{BUSINESS_DB:db});
 assert.equal(b.status,200);assert.equal((await b.json()).jobs[0].city,'Denver');
});
test('pagination never emits a cursor beyond the supported 10k offset',async()=>{
 const db={prepare(sql){const b={bind(){return b},async all(){return {results:Array.from({length:25},(_,i)=>({id:'x'+i,name:'Place '+i,city:'Denver',state:'CO',category:'Store',status:'listed',source_url:'https://example.org',source_name:'test'}))}}};return b}};
 const response=await worker.fetch(new Request('https://quantaphi.org/api/business-directory/records?state=CO&offset=10000&limit=24'),{BUSINESS_DB:db});
 const data=await response.json();
 assert.equal(data.has_more,false);
 assert.equal(data.next_offset,null);
});

