import test from 'node:test';
import assert from 'node:assert/strict';
import {directoryCardView,uniqueStoreCards,sourceLinkAllowed} from '../cannabis-directory-cards.mjs';
const base={id:'ny-sample-1',name:'Example Dispensary',store:'Downtown',
 state:'NY',city:'Albany',address:'100 Main Street',source_url:'https://store.example.com/locations',
 source_name:'Official store listing',source_domain:'store.example.com',sponsored:false,license_status:'unverified',quality_star:null,
 image_url:'',price:null,inventory:null};
test('factual individual store cards require deliberate acknowledgement and real source data',()=>{
 assert.equal(directoryCardView(base,false),null);
 const x=directoryCardView(base,true);
 assert.equal(x.id,'directory-store-ny-sample-1');
 assert.equal(x.state,'NY');assert.equal(x.sponsorLabel,'Independent directory listing');
 assert.equal(x.imageUrl,null);assert.equal(x.testimonial,null);
 assert.equal(x.qualityLabel,'Unrated');
});
test('only clearly rights-cleared dated photos may appear, never unverified vendor images',()=>{
 const media={url:'https://store.example.com/media/hero.jpg',status:'approved',
  rights_cleared:true,source_url:'https://store.example.com/locations',publisher:'Store photo',
  reviewed_at:'2026-11-01'};
 const allowed=directoryCardView({...base,media},true);
 assert.equal(allowed.imageUrl,media.url);
 for(const bad of [
  {...media,rights_cleared:false},{...media,url:'http://store.example.com/image.jpg'},
  {...media,url:'https://fake.test/image.jpg'},{...media,status:'pending'},
  {...media,reviewed_at:'not-a-date'}
 ])assert.equal(directoryCardView({...base,media:bad},true).imageUrl,null);
});
test('a real user quote requires opt-in, moderation and an attributable source',()=>{
 const quote={text:'Friendly staff explained store policies clearly.',reviewer:'Customer (consented)',
  published_at:'2026-11-01',approved:true,consented:true,
  source_url:'https://reviews.example.org/review/abc',publisher:'Example Reviews'};
 assert.equal(directoryCardView({...base,testimonial:quote},true).testimonial.text,quote.text);
 for(const changed of [{...quote,consented:false},{...quote,approved:false},
  {...quote,source_url:'javascript:alert(0)'},{...quote,text:'not approved',publisher:''}]){
  assert.equal(directoryCardView({...base,testimonial:changed},true).testimonial,null);
 }
});
test('no fabricated or cross-site urls, prices, cart, or retail availability',()=>{
 for(const bad of [{...base,source_url:'javascript:alert(1)'},{...base,source_url:'https://store.example.com.evil.test/'},
  {...base,id:'../unsafe'}, {...base,sponsored:true}])assert.equal(directoryCardView(bad,true),null);
 const safe=directoryCardView({...base,price:55,inventory:[{name:'wax',price:55}]},true);
 assert.equal('price' in safe,false);assert.equal('inventory' in safe,false);
 assert.equal(sourceLinkAllowed('https://store.example.com/p/1','store.example.com'),true);
 assert.equal(sourceLinkAllowed('https://store.example.com.evil.test','store.example.com'),false);
});
test('skip already present static Denver mounts and duplicate records',()=>{
 const rows=[base,{...base,id:'ny-sample-2'},{...base,id:'ny-sample-2'}];
 const seen=['dispensary-ny-sample-1'];
 const result=uniqueStoreCards(rows,seen);
 assert.deepEqual(result.map(x=>x.id),['ny-sample-2']);
});
test('actual Oracle can register data-backed cards and avoids misleading public count',async()=>{
 const fs=await import('node:fs/promises');
 const deck=await fs.readFile(new URL('../oracle-card-deck.js',import.meta.url),'utf8');
 const html=await fs.readFile(new URL('../index.html',import.meta.url),'utf8');
 const client=await fs.readFile(new URL('../cannabis-directory-card.mjs',import.meta.url),'utf8');
 assert.match(deck,/quantaphi:directory-cards-ready/);
 assert.match(deck,/data-directory-store-id/);
 assert.match(html,/id="cannabisDirectoryCards"/);
 assert.match(client,/quantaphi:directory-cards-ready/);
 assert.match(client,/directoryCardView/);
 assert.doesNotMatch(deck,/cards\.length\+' available'/);
});

test('older server-validated Cloudflare rows remain cardable before Worker cache refresh',()=>{
 const old={...base};delete old.source_domain;
 const card=directoryCardView(old,true);
 assert.equal(card?.id,'directory-store-ny-sample-1');
 assert.equal(card?.sourceUrl,'https://store.example.com/locations');
});

test('real D1 regulator license IDs with colons dots and uppercase register safely',async()=>{
 const ids=['il-idfpr:284.000001-AUDO','ma-ccc:MR281240','nj-crc:RE000012','ny-ocm:OCM-RETL-24-000003'];
 for(const id of ids){
  const model=directoryCardView({...base,id},true);
  assert.equal(model?.id,'directory-store-'+id);
  assert.equal(model?.sourceId,id);
 }
 for(const id of ['../unsafe','x/y','<script>','x%20y','bad id','x#y','x?y']){
  assert.equal(directoryCardView({...base,id},true),null);
 }
 const fs=await import('node:fs/promises');
 const deck=await fs.readFile(new URL('../oracle-card-deck.js',import.meta.url),'utf8');
 assert.match(deck,/directory-store-\[a-zA-Z0-9/);
 assert.match(deck,/\[a-zA-Z0-9:._-\]/);
});
