/* Canonical display model for independently sourced dispensary listings.
 * This is not a regulated product advertisement, live menu or a checkout.
 * Media requires documented reuse rights; testimonials require user consent,
 * moderation and a dated independent source. No inferred ratings/claims. */
const https=raw=>{try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port?u:null}catch{return null}};
const str=(raw,max=180)=>typeof raw==='string'?raw.replace(/[\u0000-\u001f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
export function sourceLinkAllowed(raw,domain){
 const u=https(raw),d=String(domain||'').toLowerCase();
 return !!u&&/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(d)&&(u.hostname===d||u.hostname.endsWith('.'+d));
}
function reviewQuote(q){
 if(!q||q.approved!==true||q.consented!==true||!str(q.text,320)||
  !str(q.reviewer,90)||!str(q.publisher,100)||!https(q.source_url)||
  !Number.isFinite(Date.parse(q.published_at)))return null;
 return {text:str(q.text,320),reviewer:str(q.reviewer,90),
  publisher:str(q.publisher,100),sourceUrl:q.source_url};
}
function reviewMedia(m,sourceHost){
 if(!m||m.status!=='approved'||m.rights_cleared!==true||!m.publisher||
  !Number.isFinite(Date.parse(m.reviewed_at)))return null;
 const u=https(m.url);
 if(!u||!sourceLinkAllowed(m.source_url,sourceHost))return null;
 // The asset must be on the verified merchant domain or a specifically
 // reviewed image CDN; no redirect, SVG, data URL or random thumbnail.
 if(!sourceLinkAllowed(m.url,sourceHost))return null;
 if(!/\.(?:jpg|jpeg|png|webp)(?:$|\?)/i.test(u.href))return null;
 return u.href;
}
export function directoryCardView(row,acknowledged){
 if(acknowledged!==true||!row||row.sponsored!==false||
  !/^[a-z0-9-]{3,110}$/.test(String(row.id||''))||
  !/^[A-Z]{2}$/.test(String(row.state||''))||!str(row.name)||!str(row.city))return null;
 const source=https(row.source_url);
 if(!source||!sourceLinkAllowed(row.source_url,row.source_domain))return null;
 const star=row.quality_star==='★'&&Array.isArray(row.quality_sources)&&row.quality_sources.length>=2;
 return {id:'directory-store-'+row.id,sourceId:row.id,name:str(row.name,140),
  store:str(row.store,100),city:str(row.city,90),state:row.state,
  address:str(row.address,240),sourceName:str(row.source_name,120),sourceUrl:source.href,
  licenseStatus:str(row.license_status,60)||'unverified',
  accessType:row.access_type==='medical_only'?'medical_only':'unreviewed',
  qualityLabel:star?'★ Independently reviewed customer-experience evidence':'Unrated',
  qualitySources:star?row.quality_sources.filter(u=>!!https(u)).slice(0,3):[],
  sponsorLabel:'Independent directory listing',imageUrl:reviewMedia(row.media,row.source_domain),
  testimonial:reviewQuote(row.testimonial)};
}
export function uniqueStoreCards(rows,existing=[]){
 const seen=new Set(existing),out=[];
 for(const row of Array.isArray(rows)?rows:[]){
  if(!row||!row.id||seen.has('dispensary-'+row.id)||seen.has('directory-store-'+row.id))continue;
  seen.add('directory-store-'+row.id);
  out.push(row);
 }
 return out;
}
