import test from 'node:test';
import assert from 'node:assert/strict';
import {enrichCatalogEvidence} from '../workers/cannabis-directory.mjs';
const now=Date.parse('2026-11-01T18:00:00Z');
const media={store_id:'s-1',image_url:'https://store.example.com/assets/storefront.jpg',
 source_url:'https://store.example.com/locations',publisher:'Example official source',
 rights_evidence_url:'https://store.example.com/media-license',
 rights_cleared:1,review_state:'approved',reviewed_at:'2026-10-31',expires_at:'2026-12-01'};
const quote={store_id:'s-1',quote_text:'The staff were patient and helpful.',author_display:'Review contributor',
 publisher:'Consented customer review',source_url:'https://reviews.example.org/review/123',
 consent_evidence:'review-consent-file-123',consent_verified:1,review_state:'approved',
 published_at:'2026-10-24',reviewed_at:'2026-10-31',expires_at:'2026-12-01'};
const feed={store_id:'s-1',provider:'weedmaps',connection_state:'not_connected',license_review_state:'unreviewed'};
function makeDB(m=[media],q=[quote],f=[feed]) {
 return {
  DIRECTORY: {
   prepare(sql) {
    return {
     bind() {
      return {
       async all() {
        if(sql.includes('store_source_media'))return {results:m};
        if(sql.includes('store_review_quotes'))return {results:q};
        if(sql.includes('store_inventory_connections'))return {results:f};
        throw Error('unexpected SQL');
       }
      };
     }
    };
   }
  }
 };
}
test('future approved source photo and consented customer quote are optional, dated and attributed',async()=>{
 const [x]=await enrichCatalogEvidence([{id:'s-1'}],makeDB(),now);
 assert.equal(x.media.url,media.image_url);
 assert.equal(x.media.rights_cleared,true);
 assert.equal(x.testimonial.text,quote.quote_text);
 assert.equal(x.testimonial.consented,true);
 assert.equal(x.inventory_connection,'not_connected');
});
test('no source consent/rights means no claims or photos published',async()=>{
 const [x]=await enrichCatalogEvidence([{id:'s-1'}],makeDB(
 [{...media,rights_evidence_url:''}],[{...quote,consent_evidence:''}]),now);
 assert.equal(x.media,null);assert.equal(x.testimonial,null);
});
test('expired source data cannot be shown',async()=>{
 const [x]=await enrichCatalogEvidence([{id:'s-1'}],makeDB(
 [{...media,expires_at:'2026-10-01'}],[{...quote,expires_at:'2026-10-01'}]),now);
 assert.equal(x.media,null);assert.equal(x.testimonial,null);
});
test('connected inventory still never reports product stock without a live provider feed',async()=>{
 const [x]=await enrichCatalogEvidence([{id:'s-1'}],makeDB([],[],[
 {...feed,connection_state:'authorized',license_review_state:'verified',last_items_seen:200}]),now);
 assert.equal(x.inventory_connection,'authorized_source_not_live_stock');
 assert.equal('items' in x,false);assert.equal('price' in x,false);
});
test('missing D1 migrations degrade safely to no display media',async()=>{
 const [x]=await enrichCatalogEvidence([{id:'s-1'}],{DIRECTORY:{prepare(){throw Error('db offline')}}},now);
 assert.equal(x.media,null);assert.equal(x.testimonial,null);
});
