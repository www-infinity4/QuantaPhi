import test from 'node:test';
import assert from 'node:assert/strict';
import {CURATED_VIDEOS, normalizeVideoCatalog, nextCardIndex} from '../oracle-curated-catalog.mjs';

test('seeded playable videos have real YouTube identifiers, named publishers and provenance',()=>{
 assert.ok(CURATED_VIDEOS.length>=5);
 for(const row of CURATED_VIDEOS){
  assert.match(row.id,/^[\w-]{11}$/);
  assert.equal(row.sourceUrl,'https://www.youtube.com/watch?v='+row.id);
  assert.ok(row.title.length>9);
  assert.ok(row.publisher.length>2);
  assert.match(row.sourceType,/^publisher|curated$/);
 }
 assert.equal(new Set(CURATED_VIDEOS.map(row=>row.id)).size,CURATED_VIDEOS.length);
});
test('catalog accepts only reviewed YouTube video records and refuses duplicate/untrusted content',()=>{
 const row=CURATED_VIDEOS[0];
 const incoming=[row,{...row,id:'bad'}, {...row,id:'11111111111',title:'<script>alert(1)</script>'},
  {...row,id:'22222222222',sourceUrl:'https://evil.test/watch?v=22222222222'},
  {...row,id:'33333333333',category:'adult',sourceUrl:'https://www.youtube.com/watch?v=33333333333'},
  {...row,id:'44444444444',reviewed:false,sourceUrl:'https://www.youtube.com/watch?v=44444444444'}];
 assert.deepEqual(normalizeVideoCatalog(incoming).map(item=>item.id),[row.id]);
});
test('carousel moves by one and wraps without scroll-wall indexing',()=>{
 assert.equal(nextCardIndex(0,1,3),1);
 assert.equal(nextCardIndex(2,1,3),0);
 assert.equal(nextCardIndex(0,-1,3),2);
 assert.equal(nextCardIndex(0,1,0),0);
});
test('cartoons, documentaries, and reality shows are strictly separate',()=>{
 const rows=normalizeVideoCatalog(CURATED_VIDEOS);
 assert.ok(rows.some(x=>x.category==='cartoons'));
 assert.ok(rows.some(x=>x.category==='documentaries'));
 assert.ok(rows.some(x=>x.category==='shows'));
 assert.equal(rows.filter(x=>x.category==='adult').length,0);
});
