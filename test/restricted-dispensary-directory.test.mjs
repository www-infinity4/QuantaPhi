import test from 'node:test';
import assert from 'node:assert/strict';
import {DISPENSARY_SOURCES,eligibleDispensary,DISPENSARY_CARD_IDS} from '../restricted-dispensary-directory.mjs';

test('twelve distinct original-source store Quick Cards can appear in Oracle deck',()=>{
 assert.equal(DISPENSARY_SOURCES.length,12);
 assert.equal(new Set(DISPENSARY_SOURCES.map(x=>x.id)).size,12);
 assert.equal(new Set(DISPENSARY_CARD_IDS).size,12);
 for(const x of DISPENSARY_SOURCES){
  assert.ok(DISPENSARY_CARD_IDS.includes('dispensary-'+x.id));
  assert.match(x.address,/Denver, CO 802\d\d/);
  assert.ok(x.name&&x.store&&x.address&&x.source_url);
  assert.equal(x.category,'dispensary');
  assert.equal(x.paid_sponsor,false);
  assert.equal('price' in x,false);
  assert.equal('product_image' in x,false);
 }
});
test('each factual listing is denied before the visitor 21+ acknowledgment',()=>{
 for(const x of DISPENSARY_SOURCES){
  assert.equal(eligibleDispensary(x,false),null);
  assert.equal(eligibleDispensary(x,undefined),null);
  assert.equal(eligibleDispensary(x,'yes'),null);
  assert.ok(eligibleDispensary(x,true));
 }
});
test('refuse malformed, nonofficial, or disguised offsite store links',()=>{
 const valid=DISPENSARY_SOURCES[0];
 for(const bad of [
  {...valid,source_url:'http://'+valid.official_domain},
  {...valid,source_url:'https://fake.example.com/'},
  {...valid,source_url:'https://'+valid.official_domain+'.evil.com/offer'},
  {...valid,paid_sponsor:true},
  {...valid,category:'other'},
  {...valid,source_url:'javascript:alert(1)'}
 ])assert.equal(eligibleDispensary(bad,true),null);
});

test('every dispensary card is actually mounted and discoverable in Oracle',async()=>{
 const fs=await import('node:fs/promises');
 const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
 const deck=await fs.readFile(new URL('../oracle-card-deck.js',import.meta.url),'utf8');
 const client=await fs.readFile(new URL('../restricted-dispensary-cards.mjs',import.meta.url),'utf8');
 for(const id of DISPENSARY_CARD_IDS){
  assert.ok(html.includes('id="'+id+'"'),'Missing homepage mount '+id);
  assert.ok(deck.includes("['"+id+"',"),'Missing Oracle deck option '+id);
 }
 assert.match(html,/restricted-dispensary-cards\.mjs/);
 assert.match(html,/restricted-dispensary-cards\.css/);
 assert.ok(client.includes('eligibleDispensary(row,acknowledged)'));
 assert.ok(client.includes('if(!allowed)'));
 assert.ok(client.includes('acknowledged=false'));
});
