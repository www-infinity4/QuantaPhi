/* National source-backed business search, isolated from wallet and ad systems.
 * Public cards remain ORGANIC, regardless of any internal ad_status value.
 * Regulated-age businesses are excluded; only the separately verified 21+
 * advertising route may ever display their approved creative. */
const HEADERS={'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=60, s-maxage=180','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex'};
const RESTRICTED=/cannabis|marijuana|dispensar|\bthc\b|hemp|vape|nicotine|tobacco|adult.?store|erotic|porn|sex.?shop|firearm|gun.?shop|weapon|liquor|smoke.?shop/i;
const safeText=(x,n=160)=>String(x??'').replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,n);
function safeHttps(x){
 try{const u=new URL(x);if(u.protocol!=='https:'||u.username||u.password||u.port||!u.hostname.includes('.')||u.hostname.includes(':'))return '';return u.href}
 catch{return ''}
}
export function safeListing(x){
 if(!x||x.status!=='listed'||RESTRICTED.test(String(x.category||'')+' '+String(x.name||'')))return null;
 const name=safeText(x.name),source_url=safeHttps(x.source_url);
 if(!name||!source_url||!safeText(x.source_name))return null;
 const rights=safeText(x.image_rights,60);
 const image_url=/^(merchant_authorized|licensed|cc0|public_domain)$/i.test(rights)?safeHttps(x.image_url):'';
 return {id:safeText(x.id,100),name,city:safeText(x.city,80),state:safeText(x.state,2),
  category:safeText(x.category,70),address:safeText(x.address,240),
  latitude:Number.isFinite(Number(x.latitude))&&x.latitude!==null?Number(x.latitude):null,
  longitude:Number.isFinite(Number(x.longitude))&&x.longitude!==null?Number(x.longitude):null,
  website:safeHttps(x.website),source_url,source_name:safeText(x.source_name,120),
  source_license:safeText(x.source_license,90),confidence:Number.isFinite(Number(x.confidence))&&x.confidence!==null?Number(x.confidence):null,
  image_url,attribution:safeText(x.attribution,120),sponsored:false,
  last_seen:safeText(x.last_seen,55)};
}
export function normalizeSearch(url){
 const q=safeText(url.searchParams.get('q'),65).replace(/[\\%_]/g,' ').trim();
 const city=safeText(url.searchParams.get('city'),80),state=safeText(url.searchParams.get('state'),20).toUpperCase();
 const category=safeText(url.searchParams.get('category'),60);
 const page=Math.min(200,Math.max(0,Number.parseInt(url.searchParams.get('page')||'0',10)||0));
 if(!state)return {error:'state_required'};
 if(!/^[A-Z]{2}$/.test(state))return {error:'invalid_state'};
 if(city&&!/^[\p{L} .'-]{2,80}$/u.test(city))return {error:'invalid_city'};
 if(!city&&q.length<2)return {error:'city_or_query_required'};
 if(category&&!/^[a-z_]{2,60}$/.test(category))return {error:'invalid_category'};
 return {q,city,state,category,page,limit:24};
}
const fail=(status,message)=>Response.json({error:message,items:[]},{status,headers:HEADERS});
async function search(url,env){
 const filters=normalizeSearch(url);if(filters.error)return fail(400,filters.error);
 const {q,city,state,category,page,limit}=filters,query='%'+q+'%';
 const sql=`SELECT id,name,city,state,category,address,latitude,longitude,website,source_url,source_name,source_license,confidence,image_url,image_rights,attribution,status,ad_status,last_seen
 FROM businesses WHERE state=? AND (?='' OR lower(city)=lower(?))
 AND (name LIKE ? OR category LIKE ?)
 AND (?='' OR category=?)
 AND status='listed'
 ORDER BY name COLLATE NOCASE,id LIMIT 24 OFFSET ?`;
 const {results}=await env.BUSINESSES.prepare(sql)
  .bind(state,city,city,query,query,category,category,page*limit).all();
 const items=(results||[]).map(safeListing).filter(Boolean);
 return Response.json({query:q,city,state,category,page,page_size:limit,count:items.length,
  has_more:(results||[]).length===limit,items,
  disclosure:'Organic source-backed directory. Not paid ads. No verified opening hours, prices, inventory, reservations or implied partnerships.'},{headers:HEADERS});
}
async function stats(env){
 const {results}=await env.BUSINESSES.prepare(
  "SELECT state,COUNT(*) AS records,COUNT(DISTINCT city) AS cities FROM businesses WHERE status='listed' GROUP BY state ORDER BY records DESC LIMIT 60"
 ).all();
 return Response.json({jurisdictions:results||[],note:'Record counts indicate source-backed database listings, not advertiser approvals or completed image cards.'},{headers:HEADERS});
}
export default {
 async fetch(req,env){
  if(req.method!=='GET')return fail(405,'read_only');
  if(!env.BUSINESSES)return fail(503,'business_database_unavailable');
  const u=new URL(req.url);
  try{
   if(u.pathname==='/api/business/search')return await search(u,env);
   if(u.pathname==='/api/business/stats')return await stats(env);
   return fail(404,'no_such_business_endpoint');
  }catch{return fail(503,'business_directory_temporarily_unavailable')}
 }
};
