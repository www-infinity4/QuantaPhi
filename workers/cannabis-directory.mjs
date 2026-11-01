/* Organic U.S. cannabis business-source directory. NOT advertising, ID verification,
 * a merchant endorsement, or a product/health recommendation.
 * Isolated D1: DIRECTORY -> quantaphi-cannabis-directory. Public GET only.
 * A per-visit acknowledgment is NOT proof of age and never unlocks ads. */
import {STATES,eligibleStore} from '../cannabis-directory-policy.mjs';

const HEADERS={
  'Cache-Control':'private, no-store, max-age=0',
  'Content-Type':'application/json; charset=utf-8',
  'X-Content-Type-Options':'nosniff',
  'X-Robots-Tag':'noindex, nofollow',
  'Referrer-Policy':'no-referrer',
  'Vary':'X-Visitor-21-Acknowledged'
};
const reply=(body,status=200)=>Response.json(body,{status,headers:HEADERS});
const fail=(error,status)=>reply({error,items:[]},status);
const clean=(v,max=80)=>String(v??'').replace(/[<>]/g,'').replace(/\s+/g,' ').trim().slice(0,max);
const stateOf=(v)=>String(v??'').trim().toUpperCase();
const isState=s=>STATES.includes(s);
const ack=req=>req.headers.get('X-Visitor-21-Acknowledged')==='true';
const publicRow=row=>{
  const safe=eligibleStore(row,true);
  if(!safe)return null;
  // Never emit product images, promotional prices, health/potency claims,
  // inferred reviews or a star rating without independently reviewed evidence.
  return {
    id:clean(safe.id,110),name:clean(safe.name,160),store:clean(safe.store,120),
    city:clean(safe.city,90),state:safe.state,address:clean(safe.address,240),
    source_url:safe.source_url,source_name:clean(safe.source_name,120),
    source_checked_at:clean(safe.verified_at,35),
    license_status:clean(safe.license_status,45)||'unverified',
    sponsored:false,verified_age:false,quality_star:null,customer_rating:null,
    image_url:'',price:null,inventory:null,
    disclosure:'Organic source listing; no verified age, endorsement, product offer, or merchant license guarantee.'
  };
};
async function coverage(env){
  const {results}=await env.DIRECTORY.prepare(
    "SELECT p.state,p.adult_use,p.medical_program,p.source_url,p.reviewed_at,COUNT(s.id) AS listings FROM state_policy p LEFT JOIN store_sources s ON s.state=p.state AND s.record_status='listed' AND s.paid_sponsor=0 GROUP BY p.state ORDER BY p.state"
  ).all();
  const rows=(results||[]).filter(r=>isState(r.state)).map(r=>({
    state:r.state,adult_use:r.adult_use,medical_program:r.medical_program===null?null:!!r.medical_program,
    listed_records:Number(r.listings)||0,reviewed_at:r.reviewed_at||null,
    policy_source:r.source_url||null
  }));
  const {results:jobs}=await env.DIRECTORY.prepare(
    "SELECT status,COUNT(*) AS jobs FROM directory_jobs GROUP BY status ORDER BY status"
  ).all();
  const queued=await env.DIRECTORY.prepare(
    "SELECT COUNT(DISTINCT state) AS queued_states FROM directory_jobs WHERE status='queued'"
  ).first();
  return reply({nationwide_target_states:50,states_queued:Number(queued?.queued_states)||0,states_with_policy_rows:rows.length,
    states_with_listings:rows.filter(r=>r.listed_records>0).length,
    total_listed:rows.reduce((n,r)=>n+r.listed_records,0),
    states:rows,job_statuses:jobs||[],
    disclosure:'Queued states are not populated states. Counts are source listings, not approved advertisers, licenses or rendered Quick Cards.'});
}
async function regulators(env,url){
  const state=stateOf(url.searchParams.get('state'));
  if(state&&!isState(state))return fail('invalid_state',400);
  const {results}=await env.DIRECTORY.prepare(
    'SELECT state,adult_use,medical_program,reviewed_at FROM state_policy ORDER BY state'
  ).all();
  const policies=new Map((results||[]).map(r=>[r.state,r]));
  const {results:official}=await env.DIRECTORY.prepare(
    "SELECT state,agency,source_kind,source_url,verified_at,source_status,notes FROM regulator_source_catalog WHERE source_status='verified_official_url' ORDER BY state"
  ).all();
  const sources=new Map((official||[]).filter(r=>isState(r.state)).map(r=>[r.state,r]));
  const states=state?[state]:STATES;
  return reply({states:states.map(s=>{
    const p=policies.get(s),src=sources.get(s);
    return {state:s,agency:src?.agency||null,source_url:src?.source_url||null,
      source_kind:src?.source_kind||'source_pending',source_reviewed:!!src,
      source_reviewed_at:src?.verified_at||null,
      note:src?.notes||'Regulator source not yet independently cataloged.',
      adult_use:p?.adult_use||'unreviewed',medical_program:p?.medical_program==null?null:!!p.medical_program,
      policy_reviewed_at:p?.reviewed_at||null};
  }),disclosure:'Source catalog is not a claim that all 50 state store lists were imported or licenses verified.'});
}
async function receipts(env){
  const {results:regulatorRuns}=await env.DIRECTORY.prepare(
    'SELECT run_id,source_kind,inspected,accepted,rejected,created_at FROM regulator_source_ingest_runs ORDER BY created_at DESC LIMIT 10'
  ).all();
  const {results:storeRuns}=await env.DIRECTORY.prepare(
    'SELECT state,city,inspected,accepted,rejected,created_at FROM import_receipts ORDER BY created_at DESC LIMIT 10'
  ).all();
  return reply({regulator_source_runs:regulatorRuns||[],store_ingest_runs:storeRuns||[],
    disclosure:'Source catalog receipts are not store imports. A queued state is not populated; no paid campaigns or license approvals are inferred.'});
}
async function stores(req,env,url){
  // This is only a display acknowledgment for organic location information,
  // never a government-ID check or a 21+ advertising eligibility assertion.
  if(!ack(req))return fail('visit_acknowledgment_required_not_age_verification',403);
  const state=stateOf(url.searchParams.get('state'));
  if(!isState(state))return fail('invalid_state',400);
  const city=clean(url.searchParams.get('city'),90);
  const q=clean(url.searchParams.get('q'),65).replace(/[\\%_]/g,' ');
  const n=Number(url.searchParams.get('page')||'0');
  if(!Number.isSafeInteger(n)||n<0||n>500)return fail('invalid_page',400);
  const {results}=await env.DIRECTORY.prepare(
    "SELECT id,name,store,city,state,address,source_url,source_domain,source_name,verified_at,record_status,paid_sponsor,license_status FROM store_sources WHERE state=? AND record_status='listed' AND paid_sponsor=0 AND (?='' OR lower(city)=lower(?)) AND (name LIKE ? OR store LIKE ?) ORDER BY name COLLATE NOCASE,id LIMIT 25 OFFSET ?"
  ).bind(state,city,city,'%'+q+'%','%'+q+'%',n*24).all();
  const rows=results||[];
  const legal=await env.DIRECTORY.prepare(
    'SELECT adult_use,medical_program FROM state_policy WHERE state=?'
  ).bind(state).first();
  const medicalOnly=legal?.adult_use==='not_authorized'&&Number(legal?.medical_program)===1;
  const accessType=medicalOnly?'medical_only':(legal?.adult_use||'unreviewed');
  return reply({state,city,query:q,page:n,page_size:24,has_more:rows.length>24,
    access_type:accessType,medical_only:medicalOnly,
    items:rows.slice(0,24).map(publicRow).filter(Boolean).map(item=>({...item,
      access_type:accessType,medical_only:medicalOnly})),
    disclosure:medicalOnly
      ? 'Medical-program dispensaries only; NOT adult-use. State patient eligibility applies. No age verification, product offers or paid ads.'
      : 'Organic business sources only. No paid cannabis ads, purchase, product images, potency or health claims. Age acknowledgment is NOT age verification.'});
}
export default {
  async fetch(req,env){
    if(req.method!=='GET')return fail('read_only',405);
    if(!env?.DIRECTORY)return fail('directory_unavailable',503);
    const url=new URL(req.url);
    try{
      if(url.pathname==='/api/21-directory/coverage')return await coverage(env);
      if(url.pathname==='/api/21-directory/regulators')return await regulators(env,url);
      if(url.pathname==='/api/21-directory/receipts')return await receipts(env);
      if(url.pathname==='/api/21-directory/stores')return await stores(req,env,url);
      if(url.pathname==='/api/21-directory/health'){
        await env.DIRECTORY.prepare('SELECT 1 AS ok').first();
        return reply({ok:true,service:'organic_cannabis_directory',ads_enabled:false,age_verification_enabled:false});
      }
      return fail('not_found',404);
    }catch{return fail('directory_temporarily_unavailable',503)}
  }
};
