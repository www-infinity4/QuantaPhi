/* QuantaPhi restricted advertising service.
 * Isolated from wallet and public ads. All endpoints FAIL CLOSED unless a
 * trusted, private session+age-verifier service binding and D1 are configured.
 * An opt-in, Quant activity, or age prompt never proves age. */
import {eligibleCreative} from '../../restricted-ad-policy.mjs';

const HEADERS={'Cache-Control':'no-store, private, max-age=0','Content-Type':'application/json; charset=utf-8','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Vary':'Cookie','Referrer-Policy':'no-referrer'};
const DAY=86400000;
const json=(data,status=200)=>Response.json(data,{status,headers:HEADERS});
const deny=(reason,status=403)=>json({error:reason,creatives:[]},status);
const validJurisdiction=v=>typeof v==='string'&&/^US-[A-Z]{2}$/.test(v);
const ageWindow=(value,now,maxDays)=>{const t=Date.parse(value);return Number.isFinite(t)&&t>now&&t<=now+maxDays*DAY};
export function verifyVerdict(data,now=Date.now()){
 if(!data||data.authenticated!==true||typeof data.subject!=='string'||data.subject.length<3||data.subject.length>220
  ||data.verified_over_21!==true||!['infinity_verified','third_party_verified'].includes(data.proof_kind)
  ||!validJurisdiction(data.jurisdiction)||!ageWindow(data.expires_at,now,7))return null;
 return {subject:data.subject,jurisdiction:data.jurisdiction};
}
export function allowJurisdiction(row,now=Date.now()){
 const at=Date.parse(row?.reviewed_at);
 return row?.enabled===1&&typeof row.reviewer==='string'&&row.reviewer.trim().length>2
  &&typeof row.audience_evidence==='string'&&row.audience_evidence.trim().length>8
  &&typeof row.legal_evidence==='string'&&row.legal_evidence.trim().length>8
  &&Number.isFinite(at)&&at<=now&&now-at<=30*DAY;
}
export function allowCreative(row,jurisdiction,now=Date.now()){
 if(!row||row.approved!==1||row.rights_cleared!==1||!validJurisdiction(jurisdiction))return null;
 let approved_jurisdictions=[];
 try{approved_jurisdictions=JSON.parse(row.approved_jurisdictions)}catch{return null}
 if(!Array.isArray(approved_jurisdictions)||approved_jurisdictions.length>60)return null;
 const asset=eligibleCreative({...row,approved:true,image:row.image,approved_jurisdictions}, {
  allowed:true,verified_over_21:true,opted_in:true,category:'cannabis',jurisdiction
 },now);
 if(!asset)return null;
 return {...asset,id:row.id,category:'cannabis',approved:true,
  license_id:row.license_id,reviewed_at:row.reviewed_at,
  approved_jurisdictions,rights_cleared:true,publisher_domain:row.publisher_domain};
}
function originOK(req,env){
 const expected=env.ALLOWED_ORIGIN||'https://quantaphi.org';
 try{return new URL(req.url).origin===expected
  &&(!req.headers.get('Sec-Fetch-Site')||req.headers.get('Sec-Fetch-Site')!=='cross-site')
  &&(req.method!=='POST'||req.headers.get('Origin')===expected);
 }catch{return false}
}
async function identity(request,env){
 // Only a private Worker service binding can issue identity/age assertions.
 // Never trust browser-sent age headers, birthdate, Quant interests, or JWT claims.
 if(typeof env.ELIGIBILITY?.fetch!=='function')return {error:'age_verifier_unconfigured',status:503};
 const cookie=request.headers.get('Cookie')||'';
 if(!cookie||cookie.length>4096)return {error:'authentication_required',status:401};
 try{
  const result=await env.ELIGIBILITY.fetch(new Request('https://age-verification.internal/v1/session/eligibility',{
   method:'GET',headers:{Cookie:cookie,'X-Eligibility-Purpose':'restricted-cannabis-ads'}}));
  if(!result.ok)return {error:'verification_required',status:403};
  const data=await result.json();
  if(data?.authenticated!==true||typeof data.subject!=='string'||data.subject.length<3||data.subject.length>220)
   return {error:'authentication_required',status:401};
  return {data};
 }catch{return {error:'age_verifier_unavailable',status:503}}
}
async function userHash(subject,salt){
 const bytes=new TextEncoder().encode(String(salt)+':'+subject);
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export default {
 async fetch(request,env){
  if(!originOK(request,env))return deny('invalid_origin',403);
  if(!env.ADS_DB||!env.CONSENT_SALT||String(env.CONSENT_SALT).length<16)
   return deny('restricted_ads_not_configured',503);
  const url=new URL(request.url),path=url.pathname;
  if(path!=='/v1/restricted-ads/consent'&&path!=='/v1/restricted-ads/creatives')return deny('not_found',404);
  if((path.endsWith('/consent')&&request.method!=='POST')||(path.endsWith('/creatives')&&request.method!=='GET'))
   return deny('method_not_allowed',405);
  if(path.endsWith('/creatives')&&url.searchParams.get('category')!=='cannabis')return deny('unsupported_category',400);
  if(path.endsWith('/consent')&&(!request.headers.get('Content-Type')?.startsWith('application/json')||
    Number(request.headers.get('Content-Length')||'0')>512))return deny('invalid_request',400);
  const who=await identity(request,env);if(who.error)return deny(who.error,who.status);
  const subject=who.data.subject,user_key=await userHash(subject,env.CONSENT_SALT);
  try{
   if(path.endsWith('/consent')){
    let input;try{input=await request.json()}catch{return deny('invalid_json',400)}
    if(input?.category!=='cannabis'||typeof input.opt_in!=='boolean')return deny('invalid_preference',400);
    if(input.opt_in&&!verifyVerdict(who.data))return deny('age_verification_required',403);
    await env.ADS_DB.prepare(
     'INSERT INTO restricted_ad_consent (user_key,category,enabled,updated_at) VALUES (?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_key,category) DO UPDATE SET enabled=excluded.enabled,updated_at=CURRENT_TIMESTAMP'
    ).bind(user_key,'cannabis',input.opt_in?1:0).run();
    const saved=await env.ADS_DB.prepare(
     'SELECT enabled FROM restricted_ad_consent WHERE user_key=? AND category=?'
    ).bind(user_key,'cannabis').first();
    if(Number(saved?.enabled)!==(input.opt_in?1:0))return deny('write_not_confirmed',503);
    return json({consent_recorded:true,enabled:input.opt_in});
   }
   const verified=verifyVerdict(who.data);if(!verified)return deny('age_verification_required',403);
   const consent=await env.ADS_DB.prepare(
    'SELECT enabled FROM restricted_ad_consent WHERE user_key=? AND category=?'
   ).bind(user_key,'cannabis').first();
   if(consent?.enabled!==1)return deny('explicit_consent_required',403);
   const jurisdiction=await env.ADS_DB.prepare(
    'SELECT enabled,reviewed_at,reviewer,audience_evidence,legal_evidence FROM restricted_ad_jurisdictions WHERE jurisdiction=? AND category=?'
   ).bind(verified.jurisdiction,'cannabis').first();
   if(!allowJurisdiction(jurisdiction))return deny('jurisdiction_not_approved',403);
   const {results}=await env.ADS_DB.prepare(
    'SELECT id,category,approved,rights_cleared,license_id,advertiser,publisher_domain,image,url,reviewed_at,approved_jurisdictions,title,description FROM restricted_ad_creatives WHERE category=? AND approved=1 AND rights_cleared=1 ORDER BY reviewed_at DESC LIMIT 32'
   ).bind('cannabis').all();
   const creatives=(results||[]).map(row=>allowCreative(row,verified.jurisdiction)).filter(Boolean).slice(0,16);
   return json({decision:{allowed:true,verified_over_21:true,opted_in:true,category:'cannabis',jurisdiction:verified.jurisdiction},creatives});
  }catch{return deny('restricted_ads_temporarily_unavailable',503)}
 }
};
