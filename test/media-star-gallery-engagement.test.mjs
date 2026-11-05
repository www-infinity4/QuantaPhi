import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../workers/media-star-gallery/worker.mjs';
import {readFileSync} from 'node:fs';
const uuid='123e4567-e89b-42d3-a456-426614174000';
const session='234e4567-e89b-42d3-a456-426614174001';
const origin='https://quantaphi.org';
const token='sq_'+'a'.repeat(40);
const asRequest=(kind='impression',contentId='ms-football')=>new Request('https://gallery.example/v1/events',{method:'POST',
 headers:{Origin:origin,'Content-Type':'application/json'},
 body:JSON.stringify({eventId:uuid,sessionId:session,contentId,kind})});
test('card-level impressions accepted only for published reviewed content',async()=>{
 const writes=[];
 const DB={prepare(sql){return {bind(...args){return {
  first:async()=>sql.includes('SELECT id FROM')?{id:'ms-football'}:null,
  run:async()=>{writes.push({sql,args});return {meta:{changes:1}}}
 }}}}};
 const r=await worker.fetch(asRequest(),{DB});
 assert.equal(r.status,202);
 const result=await r.json();
 assert.equal(result.classification,'browser_observed_not_verified_human');
 assert.equal(writes.length,1);
 assert.ok(writes[0].sql.includes('INSERT OR IGNORE INTO media_star_gallery_events'));
});
test('never accept forged purchase events or unapproved media',async()=>{
 const DB={prepare(){return {bind(){return{first:async()=>null}}}}};
 const purchase=await worker.fetch(asRequest('purchase'),{DB});
 assert.equal(purchase.status,400);
 const missing=await worker.fetch(asRequest('click'),{DB});
 assert.equal(missing.status,404);
});
test('publisher metrics require actual wallet authentication',async()=>{
 const r=await worker.fetch(new Request('https://gallery.example/v1/my/metrics'),{DB:{}});
 assert.equal(r.status,401);
});
test('gallery never equates a click with a paid StarCoin',()=>{
 const schema=readFileSync('workers/media-star-gallery/schema.sql','utf8');
 const web=readFileSync('media-star-gallery.mjs','utf8');
 assert.match(schema,/CREATE TABLE IF NOT EXISTS media_star_gallery_events/);
 assert.match(schema,/media_star_gallery_impression_once/);
 assert.match(web,/IntersectionObserver/);
 assert.doesNotMatch(web,/mintToken|starCoinAward|payoutAmount/);
});
