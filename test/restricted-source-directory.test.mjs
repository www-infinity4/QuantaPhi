import test from 'node:test';
import assert from 'node:assert/strict';
import {PUBLIC_21_SOURCES,selectPublisher,eligiblePublisher} from '../restricted-source-directory.mjs';

test('no cannabis publisher listing is exposed before this-visit adult acknowledgement',()=>{
 for(const value of [undefined,false,null,0,'yes']){
  assert.equal(eligiblePublisher(PUBLIC_21_SOURCES[0],value),null);
 }
 assert.ok(eligiblePublisher(PUBLIC_21_SOURCES[0],true));
});
test('all sources are real verified official https host URLs with no fake offers',()=>{
 assert.ok(PUBLIC_21_SOURCES.length>=3);
 for(const row of PUBLIC_21_SOURCES){
  const url=new URL(row.url);
  assert.equal(url.protocol,'https:');
  assert.ok(url.hostname===row.official_domain||url.hostname.endsWith('.'+row.official_domain));
  assert.equal(row.kind,'independent-source');
  assert.equal('price' in row,false);
  assert.equal('image' in row,false);
  assert.equal('paid' in row,false);
  assert.ok(row.title&&row.summary);
 }
});
test('next publisher respects no immediate repeats across rotations',()=>{
 const [a,b,c]=PUBLIC_21_SOURCES;
 assert.equal(selectPublisher([a,b,c],'',[]).id,a.id);
 assert.equal(selectPublisher([a,b,c],a.id,[a.id]).id,b.id);
 assert.equal(selectPublisher([a,b,c],b.id,[a.id,b.id]).id,c.id);
 assert.equal(selectPublisher([a,b,c],c.id,[a.id,b.id,c.id]).id,a.id);
 assert.equal(selectPublisher([],null,[]),null);
});
