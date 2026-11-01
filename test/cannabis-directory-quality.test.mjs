import test from 'node:test';
import assert from 'node:assert/strict';
import {reviewedQualityStar} from '../cannabis-directory-policy.mjs';
import worker from '../workers/cannabis-directory.mjs';

// All fixtures are synthetic. No real business is rated by these tests.
const now='2026-11-01T20:00:00Z';
const decision={store_id:'synthetic',status:'star',review_status:'approved',
  appeal_status:'none',reviewed_at:'2026-10-30T12:00:00Z',
  expires_at:'2026-11-30T12:00:00Z'};
const evidence=[
 {store_id:'synthetic',source_url:'https://independent-a.example/review',
  source_domain:'independent-a.example',evidence_kind:'customer_experience',
  assessment:'positive',observed_at:'2026-10-28',reviewed_at:'2026-10-30',review_status:'approved'},
 {store_id:'synthetic',source_url:'https://independent-b.example/conditions',
  source_domain:'independent-b.example',evidence_kind:'store_conditions',
  assessment:'positive',observed_at:'2026-10-27',reviewed_at:'2026-10-30',review_status:'approved'}
];
test('quality star requires two fresh independently reviewed third-party sources',()=>{
 const ok=reviewedQualityStar(decision,evidence,'merchant.example',now);
 assert.equal(ok?.star,'★');
 assert.equal(ok?.sources.length,2);
 assert.match(ok.disclosure,/not a product, health, potency/);
});
test('no evidence, single domain, merchant source or unsafe URL stays unrated',()=>{
 assert.equal(reviewedQualityStar(decision,[],'merchant.example',now),null);
 assert.equal(reviewedQualityStar(decision,[evidence[0]],'merchant.example',now),null);
 assert.equal(reviewedQualityStar(decision,[evidence[0],{...evidence[1],source_domain:evidence[0].source_domain,
   source_url:'https://independent-a.example/second'}],'merchant.example',now),null);
 assert.equal(reviewedQualityStar(decision,[evidence[0],{...evidence[1],source_domain:'merchant.example',
   source_url:'https://merchant.example/review'}],'merchant.example',now),null);
 assert.equal(reviewedQualityStar(decision,[evidence[0],{...evidence[1],source_url:'javascript:alert(1)'}],'merchant.example',now),null);
});
test('pending appeal, negative corroboration, stale, expired or unapproved decisions suppress stars',()=>{
 for(const patch of [
  {appeal_status:'pending'},{appeal_status:'reversed'},{review_status:'pending'},
  {status:'unrated'},{reviewed_at:'2026-01-01'},{expires_at:'2026-10-31'}
 ])assert.equal(reviewedQualityStar({...decision,...patch},evidence,'merchant.example',now),null);
 assert.equal(reviewedQualityStar(decision,[...evidence,{...evidence[0],assessment:'negative'}],
  'merchant.example',now),null);
 assert.equal(reviewedQualityStar(decision,[evidence[0],{...evidence[1],observed_at:'2026-01-01'}],
  'merchant.example',now),null);
 assert.equal(reviewedQualityStar(decision,[evidence[0],{...evidence[1],evidence_kind:'lung_health'}],
  'merchant.example',now),null);
});
test('Worker exposes no ★ if quality tables are unavailable, without hiding organic listings',async()=>{
 const record={id:'synthetic',name:'Synthetic Source',store:'Test Location',city:'Testville',
  state:'CO',address:'123 Example Road',source_url:'https://merchant.example/location',
  source_domain:'merchant.example',source_name:'Synthetic merchant',verified_at:'2026-11-01',
  record_status:'listed',paid_sponsor:0,license_status:'unverified'};
 const env={DIRECTORY:{prepare(sql){
  const q={bind(){return q;},async all(){
   if(sql.includes('FROM store_sources'))return {results:[record]};
   if(sql.includes('FROM store_quality_decisions'))throw Error('migration absent');
   return {results:[]};
  },async first(){return {adult_use:'unreviewed',medical_program:null}}};
  return q;
 }}};
 const res=await worker.fetch(new Request('https://quantaphi.org/api/21-directory/stores?state=CO',{
  headers:{'X-Visitor-21-Acknowledged':'true'}}),env);
 assert.equal(res.status,200);
 const body=await res.json();
 assert.equal(body.items.length,1);
 assert.equal(body.items[0].quality_star,null);
 assert.deepEqual(body.items[0].quality_sources,[]);
 assert.equal(body.items[0].sponsored,false);
 assert.equal(body.items[0].verified_age,false);
});
