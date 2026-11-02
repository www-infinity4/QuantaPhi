import test from 'node:test';
import assert from 'node:assert/strict';
import {NOSTALGIA_CARD_CANDIDATES,getNostalgiaCandidate,isPublishableNostalgiaOffer} from '../nostalgia-catalog.mjs';
const reviewed={
  candidateId:'eastland-shoes',kind:'offer',sourceStatus:'verified',rightsStatus:'licensed',reviewStatus:'approved',
  sourceUrl:'https://merchant.example/item',imageUrl:'https://merchant.example/photo.jpg',
  checkedAt:'2026-11-01T12:00:00Z',listingStatus:'in-stock',price:42,currency:'USD',
  promotionType:'independent'
};
const time=new Date('2026-11-01T20:00:00Z');
test('all owner-requested nostalgic subjects have unique durable GitHub issue refs but are not published as ads',()=>{
 assert.equal(NOSTALGIA_CARD_CANDIDATES.length,11);
 assert.equal(new Set(NOSTALGIA_CARD_CANDIDATES.map(x=>x.id)).size,11);
 assert.equal(new Set(NOSTALGIA_CARD_CANDIDATES.map(x=>x.issue)).size,11);
 for(const item of NOSTALGIA_CARD_CANDIDATES){
  assert.equal(item.status,'research-needed');
  assert.equal(item.productCount,0);
  assert.equal(item.sponsored,false);
  assert.equal(getNostalgiaCandidate(item.id),item);
 }
 assert.equal(getNostalgiaCandidate('__proto__'),null);
});
test('independently sourced offers require reviewed product rights, price and freshness',()=>{
 assert.equal(isPublishableNostalgiaOffer(reviewed,time),true);
 for(const [field,value] of Object.entries({sourceStatus:'unverified',rightsStatus:'unknown',reviewStatus:'pending',listingStatus:'sold',price:-1,currency:'',sourceUrl:'javascript:alert(1)',imageUrl:'https://bob@merchant.example/x',checkedAt:'2026-09-01T12:00:00Z'})){
  assert.equal(isPublishableNostalgiaOffer({...reviewed,[field]:value},time),false,field);
 }
 assert.equal(isPublishableNostalgiaOffer({...reviewed,promotionType:'sponsored'},time),false);
 assert.equal(isPublishableNostalgiaOffer({...reviewed,promotionType:'sponsored',sponsorEvidenceUrl:'https://partner.example/authorization'},time),true);
});
test('archival entries can be informative but never presented as in-stock offers',()=>{
 assert.equal(isPublishableNostalgiaOffer({...reviewed,kind:'archive'},time),false);
 assert.equal(isPublishableNostalgiaOffer({...reviewed,checkedAt:'2026-11-04T00:00:00Z'},time),false);
 assert.equal(isPublishableNostalgiaOffer({...reviewed,candidateId:'not-a-ticket'},time),false);
});
