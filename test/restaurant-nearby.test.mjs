import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../workers/restaurant-directory.js';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../restaurant-directory.mjs',import.meta.url),'utf8');
test('Nearby lookup rejects missing or invalid coordinates before touching D1',async()=>{
 let calls=0;
 const env={RESTAURANTS:{prepare(){calls++;throw Error('should not query')}}};
 for(const url of ['https://quantaphi.org/api/dining/nearby?lat=95&lon=1',
  'https://quantaphi.org/api/dining/nearby?lat=&lon=5',
  'https://quantaphi.org/api/dining/nearby?lat=12&lon=182']){
  const r=await worker.fetch(new Request(url),env);
  assert.equal(r.status,400);
 }
 assert.equal(calls,0);
});
test('Nearby query uses bounded coordinates and source-backed organic listings',async()=>{
 let sql='',args=[];
 const env={RESTAURANTS:{prepare(query){sql=query;return{bind(...a){args=a;return{all:async()=>({results:[{id:'r1',name:'Actual source',city:'Denver',state:'CO',website:'http://unsafe.example',image_url:'https://photos.example/example.jpg'}]})}}}}}};
 const r=await worker.fetch(new Request('https://quantaphi.org/api/dining/nearby?lat=39.73&lon=-104.98'),env);
 assert.equal(r.status,200);
 const data=await r.json();
 assert.equal(data.items[0].sponsored,false);
 assert.equal(data.items[0].website,'');
 assert.ok(data.items[0].image_url.startsWith('https://'));
 assert.match(sql,/latitude BETWEEN/);
 assert.match(sql,/longitude BETWEEN/);
 assert.match(sql,/LIMIT 25 OFFSET/);
 assert.equal(args.length,11);
 assert.equal(r.headers.get('Cache-Control'),'no-store');
});
test('Phone location is permission-based and nationwide path reuses real city inventory',()=>{
 assert.match(source,/navigator\.geolocation\.getCurrentPosition/);
 assert.match(source,/oracle:restaurant-nearby-request/);
 assert.match(source,/oracle:restaurant-nationwide/);
 assert.match(source,/\/api\/dining\/nearby/);
 assert.match(source,/\/api\/dining\/stats/);
 assert.doesNotMatch(source,/localStorage\.setItem\(.{0,70}lat|localStorage\.setItem\(.{0,70}lon/);
});
