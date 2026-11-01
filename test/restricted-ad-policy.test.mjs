import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleCreative,chooseNextCreative} from '../restricted-ad-policy.mjs';

const now=Date.parse('2026-11-01T10:00:00Z');
const decision={allowed:true,verified_over_21:true,opted_in:true,category:'cannabis',jurisdiction:'US-CO'};
const offer=(extra={})=>({
 id:'licensed-editorial-01',category:'cannabis',approved:true,
 advertiser:'Authorized publisher',license_id:'license-reference-001',
 approved_jurisdictions:['US-CO'],reviewed_at:'2026-10-30T10:00:00Z',
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
