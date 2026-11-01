/* State-by-state adult-use directory policy. Legal status is an explicitly
 * reviewed record, not a guessed rule from zip code, IP or wallet history.
 * Public store listings are NOT paid cannabis advertisements.
 * QuantaPhi controls no stores, product inventory, or customer purchases. */
export const STATES=Object.freeze('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));
const REVIEWED={
 IA:{adult_use:'not_authorized',medical_program:true,source_url:'https://hhs.iowa.gov/health-prevention/medical-cannabis/patients',reviewed_at:'2026-11-01'},
 IL:{adult_use:'legal_with_conditions',medical_program:true,source_url:'https://cannabis.illinois.gov/about/faqs',reviewed_at:'2026-11-01'},
 MO:{adult_use:'legal_with_conditions',medical_program:true,source_url:'https://health.mo.gov/business-professionals/cannabis-regulation/cannabis-rules-and-law',reviewed_at:'2026-11-01'}
};
export const policy=state=>({state,adult_use:'unreviewed',medical_program:null,source_url:'',reviewed_at:'',...(REVIEWED[state]||{})});
const HTTPS=(raw,domain)=>{try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&
 (u.hostname===domain||u.hostname.endsWith('.'+domain))}catch{return false}};
export function eligibleStore(row,acknowledged){
 if(acknowledged!==true||!row||!STATES.includes(row.state)||row.record_status!=='listed'||row.paid_sponsor!==0||
  !row.id||!row.name||!row.city||!row.source_url||!row.source_name)return null;
 const domain=String(row.source_domain||'').toLowerCase();
 if(!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain)||!HTTPS(row.source_url,domain))return null;
 return {...row,sponsored:false,product_image:'',price:null,claims:[]};
}
export function qualitySignal(row){
 // Proof completion, NOT merchant health/experience rating or THC potency.
 return [row?.official_source,row?.license_verified,row?.address_confirmed,row?.rights_cleared].filter(v=>v===1).length;
}

/* A ★ is a separately moderated customer-experience/conditions signal, NOT a
 * license, product safety, potency, lung-health or advertising endorsement.
 * Never infer a star from source completeness or merchant self-reporting.
 * Two fresh, independently reviewed third-party sources and an unappealed,
 * time-limited reviewer decision are required. No source evidence => unrated. */
export function reviewedQualityStar(decision, evidence=[], now=new Date(), appeals=[]){
 const t=now instanceof Date?now.getTime():Date.parse(now);
 if(!Number.isFinite(t)||!decision||decision.status!=='star'||
  decision.review_status!=='approved'||decision.appeal_status!=='none')return null;
 const day=86400000;
 const family=domain=>String(domain).toLowerCase().split('.').slice(-2).join('.');
 const fresh=value=>{const d=Date.parse(value||'');return Number.isFinite(d)&&d<=t+300000&&d>=t-90*day};
 const expiry=Date.parse(decision.expires_at||'');
 if(!fresh(decision.reviewed_at)||!Number.isFinite(expiry)||expiry<=t||expiry>t+90*day)return null;
 // Provenance URLs may be regulators (e.g. Iowa HHS), not merchant sites.
 // A separately reviewed merchant domain is mandatory; otherwise unrated.
 const merchant=String(decision.merchant_domain||'').toLowerCase();
 if(!/^[a-z0-9-]+(?:\\.[a-z0-9-]+)+$/.test(merchant)||
  !fresh(decision.merchant_domain_verified_at)||
  !HTTPS(decision.merchant_domain_source_url,merchant))return null;
 if(!Array.isArray(evidence)||!Array.isArray(appeals)||appeals.some(a=>a.status==='pending'))return null;
 // A corroborated adverse report suspends a positive star pending review;
 // adverse reports themselves are not automatically published or scored.
 if(evidence.some(e=>e.review_status==='approved'&&e.assessment==='negative'&&fresh(e.observed_at)))return null;
 const domains=new Set(),groups=new Set(),families=new Set(),urls=new Set(),sources=[];
 for(const e of evidence){
  if(e.review_status!=='approved'||e.assessment!=='positive'||
   !['customer_experience','store_conditions'].includes(e.evidence_kind)||
   !fresh(e.observed_at)||!fresh(e.reviewed_at))continue;
  const domain=String(e.source_domain||'').toLowerCase();
  const group=String(e.publisher_group||'').toLowerCase();
  const normalized=new URL(e.source_url||'https://invalid.example');
  normalized.hash='';
  const href=normalized.href;
  if(!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain)||
   !/^[a-z0-9][a-z0-9._-]{2,100}$/.test(group)||groups.has(group)||
   family(domain)===family(merchant)||families.has(family(domain))||urls.has(href)||
   !HTTPS(e.source_url,domain)||domains.has(domain))continue;
  domains.add(domain);groups.add(group);families.add(family(domain));urls.add(href);
  sources.push(e.source_url);
 }
 if(domains.size<2)return null;
 return {star:'★',reviewed_at:decision.reviewed_at,sources:sources.slice(0,3),
  disclosure:'Independent recent customer-experience/conditions evidence; not a product, health, potency, licensing or merchant endorsement.'};
}
