/* Infinity National Business Directory API: D1-backed, public read-only.
 * No wallet, tokens, advertisements, private customer data, or checkout.
 * Cloudflare API + verified imports are the only database writers.
 */
const headers={
 'Content-Type':'application/json; charset=utf-8',
 'Access-Control-Allow-Origin':'https://quantaphi.org',
 'Access-Control-Allow-Methods':'GET, OPTIONS',
 'Access-Control-Allow-Headers':'Content-Type',
 'Cache-Control':'public, max-age=60'
};
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
const sourceUrl=value=>{
 try{const u=new URL(String(value||''));return u.protocol==='https:'&&!u.username&&!u.password&&!u.port?u.href:''}
 catch{return ''}
};
const text=(value,max=160)=>String(value??'').trim().slice(0,max);
export const escapeLike=value=>String(value).replace(/[%_\\]/g,'\\$&');
export function parseFilters(url){
 const search=url.searchParams;
 const rawState=text(search.get('state'),2).toUpperCase();
 const state=/^[A-Z]{2}$/.test(rawState)&&text(search.get('state'),4).length===2?rawState:'';
 const rawCity=text(search.get('city'),80);
 const city=/^[A-Za-z][A-Za-z .'-]{0,79}$/.test(rawCity)?rawCity:'';
 const category=text(search.get('category'),65).replace(/[^A-Za-z0-9 &/-]/g,'');
 const q=text(search.get('q'),80);
 const lim=Number(search.get('limit')||24),off=Number(search.get('offset')||0);
 return {state,city,category,q,
  limit:Number.isFinite(lim)?Math.max(1,Math.min(40,Math.floor(lim))):24,
  offset:Number.isFinite(off)?Math.max(0,Math.min(10000,Math.floor(off))):0};
}
export function safeBusiness(row){
 const claimed=Number(row.claimed)===1;
 return {
  id:text(row.id,120),name:text(row.name,180),
  city:text(row.city,80),state:text(row.state,2),
  category:text(row.category,80),address:text(row.address,250),
  latitude:typeof row.latitude==='number'?row.latitude:null,
  longitude:typeof row.longitude==='number'?row.longitude:null,
  website:sourceUrl(row.website),source_url:sourceUrl(row.source_url),
  source_name:text(row.source_name,100),source_license:text(row.source_license,90),
  attribution:text(row.attribution,250),last_seen:text(row.last_seen,40),
  image_url:row.image_rights?sourceUrl(row.image_url):'',
  claimed,sponsored:claimed&&row.ad_status==='approved_partner'
 };
}
async function records(url,db){
 const f=parseFilters(url),where=["status='listed'"],values=[];
 if(f.state){where.push('state = ?');values.push(f.state)}
 if(f.city){where.push('city = ? COLLATE NOCASE');values.push(f.city)}
 if(f.category){where.push('category = ? COLLATE NOCASE');values.push(f.category)}
 if(f.q){
  where.push("(name LIKE ? ESCAPE '\\' OR category LIKE ? ESCAPE '\\' OR address LIKE ? ESCAPE '\\')");
  const query='%'+escapeLike(f.q)+'%';values.push(query,query,query);
 }
 const sql="SELECT id,name,city,state,category,address,latitude,longitude,website,source_url,source_name,source_license,attribution,image_url,image_rights,ad_status,claimed,last_seen FROM businesses WHERE "+where.join(' AND ')+' ORDER BY name COLLATE NOCASE,id LIMIT ? OFFSET ?';
 const r=await db.prepare(sql).bind(...values,f.limit+1,f.offset).all();
 const rows=r.results||[];
 const next=f.offset+f.limit;
 const hasMore=rows.length>f.limit&&next<=10000;
 return {ok:true,records:rows.slice(0,f.limit).map(safeBusiness),has_more:hasMore,
  next_offset:hasMore?next:null,filters:f,
  notice:'Independent public business directory; listing does not indicate sponsorship, product availability, or an endorsement.'};
}
async function health(db){
 const p=await db.prepare("SELECT (SELECT COUNT(*) FROM businesses WHERE status='listed') AS businesses,(SELECT COUNT(DISTINCT state) FROM businesses WHERE status='listed') AS states,(SELECT COUNT(*) FROM city_import_jobs WHERE status='queued') AS queued,(SELECT COUNT(DISTINCT state) FROM city_import_jobs WHERE status='queued') AS queued_states").first();
 return {ok:true,...p,database:'quantaphi-business-directory',version:'2026-11-01',source_policy:'curated metadata with attributed source records'};
}
async function cities(db){
 const data=await db.prepare("SELECT j.job_id,j.city,j.state,j.priority,j.phase,j.status,j.source,j.dataset_version,j.imported,j.attempts,j.last_error,COUNT(b.id) AS listed FROM city_import_jobs j LEFT JOIN businesses b ON b.state=j.state AND b.city=j.city AND b.status='listed' GROUP BY j.job_id ORDER BY j.priority ASC,j.state,j.city LIMIT 100").all();
 return {ok:true,jobs:data.results||[],notice:'Queued is not populated. Import counts require receipts; no invented card coverage.'};
}
async function receipts(db){
 const d=await db.prepare('SELECT receipt_id,source,dataset_version,city,state,inspected,accepted,duplicates,rejected,job_id,created_at FROM business_ingest_receipts ORDER BY created_at DESC LIMIT 30').all();
 return {ok:true,receipts:d.results||[]};
}
export default {
 async fetch(request,env){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(request.method!=='GET')return json({ok:false,error:'read_only_directory'},405);
  if(!env?.BUSINESS_DB)return json({ok:false,error:'directory_binding_unavailable'},503);
  const url=new URL(request.url);
  const suffix=url.pathname.replace(/^.*?\/api\/business-directory/,'').replace(/\/+$/,'');
  try{
   if(!suffix||suffix==='/records'||suffix==='/cards')return json(await records(url,env.BUSINESS_DB));
   if(suffix==='/health')return json(await health(env.BUSINESS_DB));
   if(suffix==='/cities')return json(await cities(env.BUSINESS_DB));
   if(suffix==='/receipts')return json(await receipts(env.BUSINESS_DB));
   return json({ok:false,error:'not_found'},404);
  }catch{
   return json({ok:false,error:'directory_temporarily_unavailable'},503);
  }
 }
};
