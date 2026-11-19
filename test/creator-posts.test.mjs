import test from 'node:test';
import assert from 'node:assert/strict';
import {CREATOR_DATABASE,CREATOR_SOURCES,findCreatorPost,filterCreatorPosts,mergeCreatorPosts,validateCreatorPost} from '../creator-post-catalog.mjs';
import {ACTIVE_SOURCE_CARDS,findSourceCard,isPublicSourceCard} from '../source-quick-cards.mjs';
import {ALL_FEED_CARDS} from '../quanta-feed.mjs';
import {departmentFor,DEPARTMENTS} from '../quanta-context-placement.mjs';
import {prepareCreatorImport} from '../scripts/import-creator-posts.mjs';

const row=()=>({...CREATOR_DATABASE.posts[0]});
test('verified public snapshot preserves five distinct originals, author, date and incomplete coverage',()=>{
 assert.equal(CREATOR_DATABASE.posts.length,5);
 assert.equal(CREATOR_DATABASE.coverage.complete,false);
 assert.equal(CREATOR_DATABASE.coverage.totalAvailable,null);
 assert.equal(new Set(CREATOR_DATABASE.posts.map(p=>p.postId)).size,5);
 for(const p of CREATOR_DATABASE.posts){assert.ok(validateCreatorPost(p));assert.equal(p.creatorId,'elena-cardone');assert.match(p.sourceUrl,/^https:\/\/x\.com\/ElenaCardone\/status\/\d+$/);}
 assert.ok(CREATOR_DATABASE.posts.every(p=>p.summary.length<=300));
});
test('every post and creator is an active source card with its own carousel identity',()=>{
 assert.equal(CREATOR_SOURCES.length,6);
 for(const c of CREATOR_SOURCES){
  assert.ok(ACTIVE_SOURCE_CARDS.some(x=>x.id===c.id));assert.ok(isPublicSourceCard(c));
  assert.ok(ALL_FEED_CARDS.some(x=>x.id===c.id));assert.ok(findSourceCard(c.id));
 }
 assert.equal(findCreatorPost('unknown'),null);
 assert.equal(departmentFor(CREATOR_SOURCES[0]),'business');
 assert.ok(DEPARTMENTS.some(d=>d.id==='business'));
 for(const c of CREATOR_SOURCES.filter(c=>c.postId))assert.ok(['business','science'].includes(departmentFor(c)),c.id);
});
test('post matching searches indexed summaries and topics without manufacturing results',()=>{
 assert.equal(filterCreatorPosts({query:'unfindable-zxy'}).length,0);
 assert.equal(filterCreatorPosts({topic:'business'}).length,1);
 assert.equal(filterCreatorPosts({query:'gratitude'})[0].postId,'2123222229060124837');
 assert.deepEqual(filterCreatorPosts({query:'  GRATITUDE  '}),filterCreatorPosts({query:'gratitude'}));
});
test('validation rejects wrong authors, mismatched IDs, hostile URLs, future observations and oversized summaries',()=>{
 assert.equal(validateCreatorPost({...row(),sourceUrl:'https://x.com.evil.test/ElenaCardone/status/'+row().postId}),false);
 assert.equal(validateCreatorPost({...row(),sourceUrl:'https://other@x.com/ElenaCardone/status/'+row().postId}),false);
 assert.equal(validateCreatorPost({...row(),sourceUrl:'https://x.com:444/ElenaCardone/status/'+row().postId}),false);
 assert.equal(validateCreatorPost({...row(),creatorId:'someone-else'}),false);
 assert.equal(validateCreatorPost({...row(),postId:'1'}),false);
 assert.equal(validateCreatorPost({...row(),summary:'x'.repeat(301)}),false);
 assert.equal(validateCreatorPost({...row(),publishedAt:'2099-01-01T00:00:00Z'}),false);
 assert.equal(validateCreatorPost({...row(),topic:'invented'}),false);
});
test('bulk import is idempotent, excludes arbitrary data and never promotes a partial archive to complete',()=>{
 const original=CREATOR_DATABASE.posts;
 const merged=mergeCreatorPosts(original,[row(),row()]);
 assert.equal(merged.length,5);
 assert.throws(()=>mergeCreatorPosts(original,[{...row(),sourceUrl:'javascript:alert(1)'}]),/Invalid/);
 const extra={...row(),postId:'2122179104589930654',sourceUrl:'https://x.com/ElenaCardone/status/2122179104589930654',title:'Test import',summary:'A reviewed test summary.',arbitrary:'discard'};
 const result=mergeCreatorPosts(original,[extra]);
 assert.equal(result.length,6);assert.equal(result.find(p=>p.postId===extra.postId).arbitrary,undefined);
 assert.equal(CREATOR_DATABASE.coverage.complete,false);
 assert.throws(()=>prepareCreatorImport({posts:[row()]}),/reviewed/);
 const prepared=prepareCreatorImport({reviewed:true,posts:[row()],coverage:{complete:true}});
 assert.equal(prepared.posts.length,5);assert.equal(prepared.coverage.complete,false);
});
