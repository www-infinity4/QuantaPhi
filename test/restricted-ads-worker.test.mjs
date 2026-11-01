import test from 'node:test';
import assert from 'node:assert/strict';
import worker, {verifyVerdict,allowCreative,allowJurisdiction} from '../workers/restricted-ads/index.mjs';

const now=Date.parse('2026-11-01T12:00:00Z');
const verdict={authenticated:true,subject:'user-123',verified_over_21:true,proof_kind:'third_party_verified',expires_at:'2026-11-02T12:00:00Z',jurisdiction:'US-CO'};
const creative={id:'approved-creative',category:'cannabis',approved:1,rights_cleared:1,license_id:'TEST-ONLY',
 advertiser:'Sample reviewed advertiser',publisher_domain:'publisher.example.com',
 image:'https://publisher.example.com/approved.jpg',url:'https://publisher.example.com/info',
 reviewed_at:'2026-10-31T12:00:00Z',approved_jurisdictions:'["US-CO"]'};
test('age verdict requires trusted external verification and nonexpired proof',()=>{
 assert.ok(verifyVerdict(verdict,now));
 for(const invalid of [{...verdict,verified_over_21:false},{...verdict,proof_kind:'self_attested'},
 {...verdict,expires_at:'2026-10-31T00:00:00Z'},{...verdict,authenticated:false},
 {...verdict,subject:''},{...verdict,jurisdiction:'US-X1'},null]){
  assert.equal(verifyVerdict(invalid,now),null);
 }
});
test('jurisdiction approval must be explicit and current',()=>{
 assert.equal(allowJurisdiction({enabled:1,reviewed_at:'2026-10-31T12:00:00Z'},now),true);
 assert.equal(allowJurisdiction(null,now),false);
 assert.equal(allowJurisdiction({enabled:0,reviewed_at:'2026-10-31T12:00:00Z'},now),false);
 assert.equal(allowJurisdiction({enabled:1,reviewed_at:'2025-01-01T00:00:00Z'},now),false);
});
test('creative delivery requires rights, current review, matching jurisdiction, and license',()=>{
 assert.ok(allowCreative(creative,'US-CO',now));
 for(const invalid of [{...creative,approved:0},{...creative,rights_cleared:0},
  {...creative,license_id:''},{...creative,approved_jurisdictions:'["US-CA"]'},
  {...creative,reviewed_at:'2025-01-01T00:00:00Z'},
  {...creative,image:'http://publisher.example.com/ad.jpg'},
  {...creative,url:'https://other.example.com/info'}]){
  assert.equal(allowCreative(invalid,'US-CO',now),null);
 }
});
const request=(method,path,origin='https://quantaphi.org')=>new Request(origin+path,{
 method,headers:method==='POST'?{'Origin':origin,'Content-Type':'application/json','Cookie':'session=private'}:{'Cookie':'session=private'},
 ...(method==='POST'?{body:JSON.stringify({category:'cannabis',opt_in:true})}:{})
});
test('Worker denies all ads and consent when verifier or database missing',async()=>{
 const a=await worker.fetch(request('GET','/v1/restricted-ads/creatives?category=cannabis'),{});
 assert.equal(a.status,503);assert.equal(a.headers.get('Cache-Control'),'no-store');
 const b=await worker.fetch(request('POST','/v1/restricted-ads/consent'),{});
 assert.equal(b.status,503);
});
test('Worker rejects cross-site consent before reaching verification',async()=>{
 let called=0;
 const env={ELIGIBILITY:{fetch:async()=>{called++;return Response.json(verdict)}}};
 const r=await worker.fetch(request('POST','/v1/restricted-ads/consent','https://evil.example'),env);
 assert.equal(r.status,403);assert.equal(called,0);
});
test('Worker denies self-attested and expired claims even with explicit opt-in',async()=>{
 const env={ELIGIBILITY:{fetch:async()=>Response.json({...verdict,proof_kind:'self_attested'})},
  ADS_DB:{prepare(){throw Error('should not touch D1')}} ,CONSENT_SALT:'opaque-test-secret'};
 const r=await worker.fetch(request('GET','/v1/restricted-ads/creatives?category=cannabis'),env);
 assert.equal(r.status,403);
});
