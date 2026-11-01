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
 const approvedRule={enabled:1,reviewed_at:'2026-10-31T12:00:00Z',reviewer:'independent reviewer',audience_evidence:'vendor proof of age cohort',legal_evidence:'documented jurisdiction counsel review'};
 assert.equal(allowJurisdiction(approvedRule,now),true);
 assert.equal(allowJurisdiction({...approvedRule,legal_evidence:''},now),false);
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

test('consent persists, but creative stays blocked until jurisdiction approved; opt-out revokes',async()=>{
 const store=new Map();
 let jurisdiction=null;
 const db={prepare(sql){return {bind(...values){return {
  async run(){if(sql.startsWith('INSERT INTO restricted_ad_consent')){store.set(values[0],values[2]);return {success:true}}throw Error('Unexpected write')},
  async first(){
   if(sql.includes('FROM restricted_ad_consent'))return {enabled:store.get(values[0])??0};
   if(sql.includes('FROM restricted_ad_jurisdictions'))return jurisdiction;
   throw Error('Unexpected read '+sql);
  },
  async all(){if(sql.includes('FROM restricted_ad_creatives'))return {results:[{...creative,
   reviewed_at:new Date(Date.now()-DAY).toISOString()}]};throw Error('Unexpected listing')}
 }}}}};
 const valid={...verdict,expires_at:new Date(Date.now()+DAY).toISOString()};
 const env={ADS_DB:db,CONSENT_SALT:'a-long-unique-test-secret',
  ELIGIBILITY:{fetch:async()=>Response.json(valid)}};
 const denied=await worker.fetch(request('GET','/v1/restricted-ads/creatives?category=cannabis'),env);
 assert.equal(denied.status,403);
 const opt=await worker.fetch(request('POST','/v1/restricted-ads/consent'),env);
 assert.equal(opt.status,200);assert.equal((await opt.json()).consent_recorded,true);
 const before=await worker.fetch(request('GET','/v1/restricted-ads/creatives?category=cannabis'),env);
 assert.equal(before.status,403);
 jurisdiction={enabled:1,reviewed_at:new Date().toISOString(),reviewer:'authorized counsel',
  audience_evidence:'100 percent identity verified delivery',legal_evidence:'approved local legal review'};
 const show=await worker.fetch(request('GET','/v1/restricted-ads/creatives?category=cannabis'),env);
 assert.equal(show.status,200);const data=await show.json();
 assert.equal(data.creatives.length,1);assert.equal(data.decision.verified_over_21,true);
 const off=new Request('https://quantaphi.org/v1/restricted-ads/consent',{method:'POST',
  headers:{Origin:'https://quantaphi.org','Content-Type':'application/json',Cookie:'session=private'},
  body:JSON.stringify({category:'cannabis',opt_in:false})});
 const disabled=await worker.fetch(off,env);assert.equal(disabled.status,200);
 const again=await worker.fetch(request('GET','/v1/restricted-ads/creatives?category=cannabis'),env);
 assert.equal(again.status,403);
});
