import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../workers/cannabis-directory.mjs';

const url='https://quantaphi.org';
const record={id:'livwell-colorado',name:'LivWell',store:'Colorado Boulevard',
  city:'Denver',state:'CO',address:'Denver CO',
  source_url:'https://livwell.com/locations',source_domain:'livwell.com',
  source_name:'LivWell official locations',verified_at:'2026-11-01',
  record_status:'listed',paid_sponsor:0,license_status:'unverified'};
function envWith(rows=[record]){
  const calls=[];
  const env={DIRECTORY:{prepare(sql){
    const b={bind(...args){b.args=args;return b;},
      async all(){
        calls.push({sql,args:b.args||[]});
        if(sql.includes('FROM state_policy p LEFT JOIN'))return {results:[
          {state:'CO',adult_use:'unreviewed',medical_program:null,source_url:'',reviewed_at:'',listings:rows.length},
          {state:'IA',adult_use:'not_authorized',medical_program:1,source_url:'',reviewed_at:'2026-11-01',listings:0}
        ]};
        if(sql.includes('COUNT(DISTINCT state) AS queued_states'))return {results:[{queued_states:49}]};
        if(sql.includes('FROM directory_jobs'))return {results:[{status:'queued',jobs:50}]};
        if(sql.includes('FROM state_policy ORDER'))return {results:[{state:'IA',adult_use:'not_authorized',medical_program:1,reviewed_at:'2026-11-01'}]};
        if(sql.includes('FROM regulator_source_catalog'))return {results:[
          {state:'IA',agency:'Iowa HHS',source_kind:'medical_only',source_url:'https://hhs.iowa.gov/health-prevention/medical-cannabis/dispensary-locations',verified_at:'2026-11-01',source_status:'verified_official_url',notes:'Five medical-only dispensaries'}
        ]};
        if(sql.includes('FROM regulator_source_ingest_runs'))return {results:[{run_id:'2026-11-01-official-regulator-catalog-v1',source_kind:'official_regulator_urls',inspected:5,accepted:5,rejected:0,created_at:'2026-11-01 16:25:13'}]};
        if(sql.includes('FROM import_receipts'))return {results:[]};

        if(sql.includes('FROM store_sources'))return {results:rows};
        return {results:[]};
      },
      async first(){if(sql.includes('COUNT(DISTINCT state) AS queued_states'))return {queued_states:49};return sql.includes('FROM state_policy WHERE state=') ? (b.args?.[0]==='IA'?{adult_use:'not_authorized',medical_program:1}:{adult_use:'unreviewed',medical_program:null}) : {ok:1}}};
    return b;
  }}};
  return {env,calls};
}
const get=(path,headers)=>new Request(url+path,{headers});
test('public health and coverage disclose no ad or verification activation',async()=>{
  const {env}=envWith();
  const h=await worker.fetch(get('/api/21-directory/health'),env);
  assert.equal(h.status,200);
  const health=await h.json();
  assert.equal(health.ads_enabled,false);
  assert.equal(health.age_verification_enabled,false);
  const c=await worker.fetch(get('/api/21-directory/coverage'),env);
  assert.equal(c.status,200);
  const data=await c.json();
  assert.equal(data.total_listed,1);
  assert.equal(data.states_with_listings,1);
  assert.equal(data.states_queued,49);
  assert.equal(data.nationwide_target_states,50);
  assert.equal(data.states_with_policy_rows,2); // mock contains only two, not fabricated 50
});
test('Iowa medical-only regulator is distinguished from adult-use and unreviewed states',async()=>{
  const {env}=envWith();
  const r=await worker.fetch(get('/api/21-directory/regulators?state=IA'),env);
  assert.equal(r.status,200);
  const data=await r.json();
  assert.equal(data.states[0].source_kind,'medical_only');
  assert.equal(data.states[0].adult_use,'not_authorized');
  assert.match(data.states[0].source_url,/hhs\.iowa\.gov/);
  const unknown=await worker.fetch(get('/api/21-directory/regulators?state=UT'),env);
  const unknownData=await unknown.json();
  assert.equal(unknownData.states[0].source_kind,'source_pending');
  assert.equal(unknownData.states[0].medical_program,null);
});
test('receipts distinguish real regulator source catalog writes from unimported store queue',async()=>{
  const {env}=envWith();
  const r=await worker.fetch(get('/api/21-directory/receipts'),env);
  assert.equal(r.status,200);
  const data=await r.json();
  assert.equal(data.regulator_source_runs.length,1);
  assert.equal(data.regulator_source_runs[0].accepted,5);
  assert.equal(data.store_ingest_runs.length,0);
});
test('unverified visitor cannot see store details; acknowledgment never claims verified age',async()=>{
  const {env,calls}=envWith();
  const denied=await worker.fetch(get('/api/21-directory/stores?state=CO'),env);
  assert.equal(denied.status,403);
  assert.equal(calls.length,0);
  const ok=await worker.fetch(get('/api/21-directory/stores?state=CO',{ 'X-Visitor-21-Acknowledged':'true'}),env);
  assert.equal(ok.status,200);
  const data=await ok.json();
  assert.equal(data.items.length,1);
  assert.equal(data.items[0].sponsored,false);
  assert.equal(data.items[0].verified_age,false);
  assert.equal(data.items[0].quality_star,null);
  assert.equal(data.items[0].image_url,'');
  assert.equal(data.items[0].customer_rating,null);
  assert.equal(data.items[0].price,null);
  assert.equal(ok.headers.get('Cache-Control'),'private, no-store, max-age=0');
  assert.equal(calls[0].args[0],'CO');
});
test('medical-only Iowa never becomes an adult-use listing',async()=>{
  const ia={...record,id:'ia-medical-test',state:'IA',city:'Waterloo',
    source_url:'https://hhs.iowa.gov/locations/iowa-cannabis-company',
    source_domain:'hhs.iowa.gov',source_name:'Iowa HHS Medical Cannabis Dispensary'};
  const {env}=envWith([ia]);
  const r=await worker.fetch(get('/api/21-directory/stores?state=IA',{'X-Visitor-21-Acknowledged':'true'}),env);
  assert.equal(r.status,200);
  const data=await r.json();
  assert.equal(data.medical_only,true);
  assert.equal(data.access_type,'medical_only');
  assert.equal(data.items[0].medical_only,true);
  assert.match(data.disclosure,/NOT adult-use/);
});
test('invalid states/pages, mutation and missing D1 fail closed',async()=>{
  const {env}=envWith();
  const ack={'X-Visitor-21-Acknowledged':'true'};
  assert.equal((await worker.fetch(get('/api/21-directory/stores?state=XX',ack),env)).status,400);
  assert.equal((await worker.fetch(get('/api/21-directory/stores?state=CO-invalid',ack),env)).status,400);
  assert.equal((await worker.fetch(get('/api/21-directory/regulators?state=INvalid'),env)).status,400);
  assert.equal((await worker.fetch(get('/api/21-directory/stores?state=CO&page=-1',ack),env)).status,400);
  assert.equal((await worker.fetch(get('/api/21-directory/regulators?state=XX'),env)).status,400);
  assert.equal((await worker.fetch(new Request(url+'/api/21-directory/coverage',{method:'POST'}),env)).status,405);
  assert.equal((await worker.fetch(get('/api/21-directory/coverage'),{})).status,503);
});
test('untrusted, paid, malformed and unreviewed rows cannot enter source cards',async()=>{
  const bad=[
    {...record,id:'bad-paid',paid_sponsor:1},
    {...record,id:'bad-url',source_url:'https://example.org/not-the-source'},
    {...record,id:'bad-status',record_status:'review'},
    {...record,id:'bad-state',state:'ZZ'},
    record
  ];
  const {env}=envWith(bad);
  const r=await worker.fetch(get('/api/21-directory/stores?state=CO',{'X-Visitor-21-Acknowledged':'true'}),env);
  assert.equal((await r.json()).items.length,1);
});
