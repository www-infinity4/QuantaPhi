import assert from 'node:assert/strict';
import test from 'node:test';
import handler from '../workers/product-directory/worker.mjs';
const mockRows=[{brand_id:'eastland',name:'Eastland Shoe',primary_department:'Fashion',source_state:'official_site_verified',adult_restricted:0}];
const env={DB:{prepare(sql){return {bind(...args){return {all:async()=>({results:mockRows}),first:async()=>({count:8})};},all:async()=>({results:mockRows}),first:async()=>({count:8})};}}};
const get=(path,opts)=>handler.fetch(new Request('https://example.com'+path,opts),env);
test('health returns database source status without products or prices',async()=>{const r=await get('/v1/health');assert.equal(r.status,200);assert.equal((await r.json()).source,'cloudflare-d1');});
test('Mixed source feed returns data and all-ages routing',async()=>{const r=await get('/v1/mixed?limit=10');assert.equal(r.status,200);assert.equal((await r.json()).data[0].brand_id,'eastland');});
test('writes are denied and pagination is bounded',async()=>{assert.equal((await get('/v1/brands',{method:'POST'})).status,405);assert.equal((await get('/v1/mixed?limit=10000')).status,400);});
test('unknown routes are 404',async()=>{assert.equal((await get('/v1/unknown')).status,404);});
test('unconfigured D1 fails closed',async()=>{const r=await handler.fetch(new Request('https://example.com/v1/mixed'),{});assert.equal(r.status,503);});

test('published offers require independent unexpired listing, price and image-rights evidence',async()=>{
 const observed=[];
 const fake={DB:{prepare(sql){observed.push(sql);return {bind(){return {all:async()=>({results:[]})}}};}}};
 const response=await handler.fetch(new Request('https://example.com/v1/offers'),fake);
 assert.equal(response.status,200);
 for(const field of ['listing_expires_at','price_expires_at','rights_expires_at'])assert.match(observed[0],new RegExp("julianday\\(o\\."+field+"\\)\\s*>\\s*julianday\\('now'\\)"));
 assert.match(observed[0],/sponsor_evidence_url/);
});

// The D1 catalog is a source-backed inventory, not an ad generator or a payment system.
test('public ad inventory exposes only reviewed, licensed, unexpired creative rows',async()=>{
 const queries=[];
 const mock={DB:{prepare(sql){queries.push(sql);return {bind(...args){return {all:async()=>({results:[]})}},all:async()=>({results:[]})};}}};
 const r=await handler.fetch(new Request('https://example.com/v1/ads?limit=20'),mock);
 assert.equal(r.status,200);
 assert.deepEqual((await r.json()).data,[]);
 assert.match(queries[0],/FROM ad_creatives/);
 for(const field of ['review_state','image_rights','rights_expires_at','source_checked_at','sponsor_evidence_url','equivalence_key'])assert.match(queries[0],new RegExp(field));
});

test('ad D1 migration includes creative equivalence and owner-scoped seen receipts',async()=>{
 const {readFileSync}=await import('node:fs');
 const sql=readFileSync(new URL('../workers/product-directory/migrations/0001-ad-creatives.sql',import.meta.url),'utf8');
 assert.match(sql,/CREATE TABLE IF NOT EXISTS ad_creatives/);
 assert.match(sql,/CREATE TABLE IF NOT EXISTS ad_seen_receipts/);
 assert.ok(sql.includes('PRIMARY KEY (principal_id, equivalence_key)'), 'D1 principal/equivalence uniqueness is enforced');
});
