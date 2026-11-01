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
