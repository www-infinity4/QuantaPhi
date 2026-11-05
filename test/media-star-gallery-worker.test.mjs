import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../workers/media-star-gallery/worker.mjs';

const approved={id:'ms-football',title:'Football Radio',description:'A reviewed football show',
 source_url:'https://media.example.com/foot.mp3',image_url:'https://media.example.com/foot.webp',
 topics_json:'["football","sports"]',review_receipt:'review-signed001',media_mode:'linked_audio',created_at:1,owner_id:'internal-user-id'};
const db={prepare(sql){return {
 bind(){return {first:async()=>null,run:async()=>({meta:{changes:1}})}},
 all:async()=>({results:[approved]})
}}};
test('public catalog carries only review-gated media and never discloses internal owner IDs',async()=>{
 const res=await worker.fetch(new Request('https://gallery.example/v1/cards'),{DB:db});
 assert.equal(res.status,200);
 const data=await res.json();
 assert.equal(data.cards[0].id,'ms-football');
 assert.equal(data.cards[0].rightsVerified,true);
 assert.equal('owner_id' in data.cards[0],false);
 assert.equal(data.walletPayoutsIncluded,false);
});
test('unverified public gallery submission is never published or credited',async()=>{
 const payload={title:'New football show',description:'A genuine football podcast episode',
 sourceUrl:'https://publisher.example/episode.mp3',imageUrl:'https://publisher.example/cover.webp',
 topics:['football'],confirmRights:true};
 const rawToken='sq_'+'a'.repeat(40);
 const identity={prepare(){return {bind(){return {first:async()=>({id:'customer-1'})}}}}};
 const bucket={prepare(sql){return {bind(){return {
  first:async()=>sql.includes('COUNT(*)')?{n:0}:null,
  run:async()=>({meta:{changes:1}})
 }}}}};
 const req=new Request('https://gallery.example/v1/submissions',{method:'POST',
  headers:{Origin:'https://quantaphi.org',Authorization:'Bearer '+rawToken,'Content-Type':'application/json'},
  body:JSON.stringify(payload)});
 const res=await worker.fetch(req,{DB:bucket,IDENTITY_DB:identity});
 assert.equal(res.status,202);
 const data=await res.json();
 assert.equal(data.status,'pending_review');
 assert.equal(data.public,false);
 assert.equal(data.paid,false);
});
test('visitor without authenticated wallet cannot self-publish',async()=>{
 const req=new Request('https://gallery.example/v1/submissions',{method:'POST',
  headers:{Origin:'https://quantaphi.org','Content-Type':'application/json'},
  body:JSON.stringify({})});
 const res=await worker.fetch(req,{DB:db,IDENTITY_DB:{}});
 assert.equal(res.status,401);
});
test('unknown origin cannot submit media even with a claimed wallet bearer',async()=>{
 const req=new Request('https://gallery.example/v1/submissions',{method:'POST',
  headers:{Origin:'https://evil.example',Authorization:'Bearer sq_'+'a'.repeat(40),'Content-Type':'application/json'},
  body:'{}'});
 const res=await worker.fetch(req,{DB:db});
 assert.equal(res.status,403);
});
