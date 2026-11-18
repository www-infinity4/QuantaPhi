import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleCreative,chooseNextCreative} from '../restricted-ad-policy.mjs';

const now=Date.parse('2026-11-01T10:00:00Z');
const decision={allowed:true,verified_over_21:true,opted_in:true,category:'cannabis',jurisdiction:'US-CO'};
const offer=(extra={})=>({
 id:'licensed-editorial-01',category:'cannabis',approved:true,
 advertiser:'Authorized publisher',license_id:'license-reference-001',
 approved_jurisdictions:['US-CO'],reviewed_at:'2026-10-30T10:00:00Z',
 // Synthetic reviewed campaign fixture; never a real merchant license or deal.
 rights_cleared:true,rights_expires_at:'2026-11-30T23:59:59Z',
 campaign_starts_at:'2026-10-25T00:00:00Z',campaign_ends_at:'2026-11-15T23:59:59Z',
 sponsor_agreement_id:'fixture-only-no-commercial-agreement',
 title:'Verified independent source',description:'Editorial publisher notice.',
 image:'https://publisher.example.com/creative.jpg',
 url:'https://publisher.example.com/information',
 publisher_domain:'publisher.example.com',...extra
});
test('fail closed without server age verification and explicit opt-in',()=>{
 for(const bad of [
  {...decision,verified_over_21:false},{...decision,allowed:false},
  {...decision,opted_in:false},{...decision,jurisdiction:'US-IA'},
  {...decision,category:'adult-media'},null
 ]) assert.equal(eligibleCreative(offer(),bad,now),null);
});
test('accept only current, approved, licensed, region-matched HTTPS original-source creative',()=>{
 const row=eligibleCreative(offer(),decision,now);
 assert.ok(row);
 assert.equal(row.title,'Verified independent source');
 assert.equal(row.image,'https://publisher.example.com/creative.jpg');
 assert.equal(row.url,'https://publisher.example.com/information');
 for(const invalid of [
  {approved:false},{license_id:''},{approved_jurisdictions:['US-IA']},
  {reviewed_at:'2026-05-01T00:00:00Z'},
  {image:'http://publisher.example.com/image.jpg'},
  {url:'https://another-domain.example.com/buy'},
  {publisher_domain:'fake.example.com'},
  {category:'nicotine'},
  {image:'https://publisher.example.com/pixel.gif'},
  {image:'https://publisher.example.com/track?id=123'}
 ]) assert.equal(eligibleCreative(offer(invalid),decision,now),null,JSON.stringify(invalid));
});
test('rotate without immediately repeating the last creative',()=>{
 const rows=['a','b','c'].map(id=>({id}));
 assert.equal(chooseNextCreative(rows,'a',[]).id,'b');
 assert.equal(chooseNextCreative(rows,'b',['a']).id,'c');
 assert.equal(chooseNextCreative(rows,'c',['a','b']).id,'a');
 assert.equal(chooseNextCreative([rows[0]],'a',[]).id,'a');
 assert.equal(chooseNextCreative([],null,[]),null);
});

test('a 21+ sponsored campaign requires rights, contract and current flight windows',()=>{
 const verified={
  rights_cleared:true,rights_expires_at:'2026-11-30T23:59:59Z',
  campaign_starts_at:'2026-10-25T00:00:00Z',campaign_ends_at:'2026-11-15T23:59:59Z',
  sponsor_agreement_id:'publisher-approved-agreement-01'
 };
 assert.ok(eligibleCreative(offer(verified),decision,now),'complete authorized campaign can pass');
 for(const invalid of [
  {rights_cleared:false},{rights_expires_at:''},
  {rights_expires_at:'2026-10-31T00:00:00Z'},
  {campaign_starts_at:''},{campaign_starts_at:'2026-11-02T00:00:00Z'},
  {campaign_ends_at:''},{campaign_ends_at:'2026-10-31T00:00:00Z'},
  {sponsor_agreement_id:''}
 ]){
  assert.equal(eligibleCreative(offer({...verified,...invalid}),decision,now),null,
   'unverified rights, agreement or campaign must fail closed: '+JSON.stringify(invalid));
 }
 assert.equal(eligibleCreative(offer({...verified,rights_expires_at:'malformed'}),decision,now),null);
 assert.equal(eligibleCreative(offer({...verified,campaign_ends_at:'malformed'}),decision,now),null);
 assert.equal(eligibleCreative(offer({...verified,campaign_starts_at:'2026-11-10T00:00:00Z',campaign_ends_at:'2026-11-01T00:00:00Z'}),decision,now),null);
 assert.equal(eligibleCreative(offer(verified),decision,Date.parse('2026-12-01T00:00:00Z')),null);
});
