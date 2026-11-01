// Isolated public restaurant discovery; wallet/auth/ads are not connected.
// Database source: Overture Maps Places (permissive licenses), with provenance.
const HEADERS={'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=120, s-maxage=300','X-Content-Type-Options':'nosniff'};
const safeText=(value,n=90)=>String(value||'').trim().slice(0,n);
const err=(message,status)=>Response.json({error:message},{status,headers:HEADERS});
function validWebsite(raw){
 try{const u=new URL(raw);return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.includes('.')?u.href:''}catch{return ''}
}
async function search(url,env){
 const q=safeText(url.searchParams.get('q'),65).replace(/[\\%_]/g,' ').trim();
 const city=safeText(url.searchParams.get('city')||'Denver',80);
 const state=safeText(url.searchParams.get('state')||'CO',2).toUpperCase();
 const category=safeText(url.searchParams.get('category'),60);
 const page=Math.min(1000,Math.max(0,Number.parseInt(url.searchParams.get('page')||'0',10)||0));
 const limit=24;
 if(!/^[A-Z]{2}$/.test(state)||!/^[\w .'-]{2,80}$/.test(city))return err('Invalid city or state',400);
 const terms=q?('%'+q+'%'):'%';
 const sql=`SELECT id,name,city,state,category,address,latitude,longitude,website,source_url,source_name,confidence,image_url,last_seen
 FROM restaurants WHERE state=? AND lower(city)=lower(?)
 AND (name LIKE ? OR category LIKE ?)
 AND (?='' OR category=?)
 ORDER BY name COLLATE NOCASE,id LIMIT 24 OFFSET ?`;
 const bound=[state,city,terms,terms,category,category,page*limit];
 const {results}=await env.RESTAURANTS.prepare(sql).bind(...bound).all();
 const items=(results||[]).map(x=>({...x,website:validWebsite(x.website),
  image_url:validWebsite(x.image_url),sponsored:false}));
 return Response.json({city,state,query:q,page,page_size:limit,count:items.length,has_more:items.length===limit,items,
  note:'Organic directory listings from named sources. No paid placements, real-time opening hours, booking availability, prices or sponsored endorsements.'},{headers:HEADERS});
}
async function stats(env){
 const {results}=await env.RESTAURANTS.prepare(
 'SELECT state,city,COUNT(*) AS total,MAX(last_seen) AS last_seen FROM restaurants GROUP BY state,city ORDER BY total DESC LIMIT 80').all();
 return Response.json({cities:results||[],source:'Overture Maps and individually sourced records'},{headers:HEADERS});
}

const SNAPSHOT_ROOT='https://raw.githubusercontent.com/www-infinity4/QuantaPhi/main/';
/** Only reviewed, explicitly approved non-Denver source snapshots can enter cron. */
export function approvedMetroSnapshots(manifest){
 if(manifest?.schema_version!==1||manifest.source_name!=='Overture Maps Places'||
    !/^20\d{2}-\d{2}-\d{2}\.\d+$/.test(manifest.release||''))throw Error('invalid_metro_manifest');
 const entries=Object.entries(manifest.cities||{});
 if(entries.length>100)throw Error('too_many_metros');
 const approved=[];
 for(const [key,cfg] of entries){
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)||!cfg||typeof cfg!=='object')throw Error('invalid_metro_key');
  if(cfg.approved_snapshot==null)continue;
  // Denver's completed 7,222-row import is immutable here; never retry it.
  if(key==='denver-co')continue;
  if(cfg.approved_snapshot!=='data/restaurants/'+key+'.json'||
     !/^[A-Za-z .'-]{2,80}$/.test(cfg.city||'')||
     !/^[A-Z]{2}$/.test(cfg.state||'')||
     !Array.isArray(cfg.bbox)||cfg.bbox.length!==4||
     !cfg.bbox.every(Number.isFinite)||
     !(cfg.bbox[0]<cfg.bbox[2]&&cfg.bbox[1]<cfg.bbox[3])||
     !Number.isSafeInteger(cfg.min_records)||cfg.min_records<1||cfg.min_records>20000)
   throw Error('invalid_approved_metro');
  approved.push({key,city:cfg.city,state:cfg.state,bbox:cfg.bbox,
   minimum:cfg.min_records,release:manifest.release,path:cfg.approved_snapshot});
 }
 return approved;
}
/** Validate every row before the first D1 mutation; no partial bad source acceptance. */
export function validateMetroSnapshot(payload,cfg){
 if(payload?.schema_version!==1||payload.source_name!=='Overture Maps'||
    payload.dataset_version!==cfg.release||payload.city!==cfg.city||payload.state!==cfg.state||
    !/^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(payload.generated_at||'')||
    payload.generated_at.length>40||!Array.isArray(payload.items)||
    payload.items.length<cfg.minimum||payload.items.length>20000)throw Error('invalid_metro_snapshot');
 const ids=new Set();
 for(const row of payload.items){
  if(!row||!/^overture:[a-zA-Z0-9-]{10,100}$/.test(row.id||'')||
     ids.has(row.id)||!row.name||row.name.length>160||
     row.city!==cfg.city||row.state!==cfg.state||
     !/^[a-z_]{1,60}$/.test(row.category||'')||
     row.source_name!=='Overture Maps'||row.source_url!=='https://overturemaps.org/'||
     row.sponsored!==false||row.image_url!==''||
     typeof row.confidence!=='number'||!Number.isFinite(row.confidence)||
     row.confidence<0.72||row.confidence>1||
     !Number.isFinite(row.latitude)||!Number.isFinite(row.longitude)||
     row.longitude<cfg.bbox[0]||row.longitude>cfg.bbox[2]||
     row.latitude<cfg.bbox[1]||row.latitude>cfg.bbox[3]||
     (row.website&&!validWebsite(row.website)))throw Error('invalid_metro_row');
  ids.add(row.id);
 }
 return payload.items;
}
export async function importApprovedMetro(env,cfg,payload){
 const rows=validateMetroSnapshot(payload,cfg);
 const runId=cfg.key+'|'+payload.generated_at;
 if(await env.RESTAURANTS.prepare('SELECT run_id FROM restaurant_ingest_runs WHERE run_id=?').bind(runId).first())
  return {skipped:true,records:0};
 let records=0;
 for(let i=0;i<rows.length;i+=50){
  const batch=rows.slice(i,i+50).map(x=>env.RESTAURANTS.prepare(
   "INSERT INTO restaurants(id,name,city,state,category,address,latitude,longitude,website,source_url,source_name,confidence,image_url,sponsored,last_seen) "+
   "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,0,?) ON CONFLICT(id) DO UPDATE SET "+
   "name=excluded.name,category=excluded.category,address=excluded.address,latitude=excluded.latitude,"+
   "longitude=excluded.longitude,website=excluded.website,confidence=excluded.confidence,"+
   "last_seen=excluded.last_seen,updated_at=CURRENT_TIMESTAMP "+
   "WHERE restaurants.city=excluded.city AND restaurants.state=excluded.state AND restaurants.source_name='Overture Maps'"
  ).bind(x.id,safeText(x.name,160),cfg.city,cfg.state,safeText(x.category,60),
   safeText(x.address,240),x.latitude,x.longitude,validWebsite(x.website),
   'https://overturemaps.org/','Overture Maps',x.confidence,'',safeText(payload.generated_at,40)));
  await env.RESTAURANTS.batch(batch);
  records+=batch.length;
 }
 await env.RESTAURANTS.prepare(
  'INSERT INTO restaurant_ingest_runs(run_id,city,state,source_name,dataset_version,records) VALUES(?,?,?,?,?,?)'
 ).bind(runId,cfg.city,cfg.state,'Overture Maps',cfg.release,records).run();
 return {skipped:false,records};
}

export default {
 async fetch(request,env){
  if(request.method!=='GET')return err('Read-only restaurant directory',405);
  if(!env.RESTAURANTS)return err('Restaurant database unavailable',503);
  const url=new URL(request.url);
  try{
   if(url.pathname==='/api/dining/search')return await search(url,env);
   if(url.pathname==='/api/dining/stats')return await stats(env);
   return err('No such restaurant endpoint',404);
  }catch{return err('Restaurant search temporarily unavailable',503)}
 },
 async scheduled(event,env,ctx){
  // Cloudflare-bound Cron is the sole writer. Reviewed main-branch snapshots only.
  // Completed Denver is deliberately excluded; its existing D1 receipt is preserved.
  if(!env.RESTAURANTS)return;
  ctx.waitUntil((async()=>{
   const manifestResponse=await fetch(SNAPSHOT_ROOT+'data/restaurants/city-manifest.json',
    {headers:{'User-Agent':'QuantaPhi-Restaurant-Directory/1.0'},signal:AbortSignal.timeout(25000)});
   if(!manifestResponse.ok)throw Error('metro_manifest_http_'+manifestResponse.status);
   const configs=approvedMetroSnapshots(await manifestResponse.json());
   for(const cfg of configs){
    const response=await fetch(SNAPSHOT_ROOT+cfg.path,
     {headers:{'User-Agent':'QuantaPhi-Restaurant-Directory/1.0'},signal:AbortSignal.timeout(25000)});
    if(!response.ok)throw Error('approved_metro_snapshot_http_'+response.status);
    await importApprovedMetro(env,cfg,await response.json());
   }
  })());
 }
};
