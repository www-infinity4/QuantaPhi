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
  // Only the authenticated Cloudflare Cron invokes this importer; visitors cannot write.
  ctx.waitUntil((async()=>{
   const url='https://raw.githubusercontent.com/www-infinity4/QuantaPhi/main/data/restaurants/denver-co.json';
   const r=await fetch(url,{headers:{'User-Agent':'QuantaPhi-Restaurant-Directory/1.0'},signal:AbortSignal.timeout(25000)});
   if(!r.ok)throw new Error('Restaurant snapshot unavailable '+r.status);
   const payload=await r.json();
   if(payload.schema_version!==1||payload.source_name!=='Overture Maps'||!Array.isArray(payload.items)||payload.items.length>20000)throw new Error('Invalid directory snapshot');
   const prior=await env.RESTAURANTS.prepare('SELECT run_id FROM restaurant_ingest_runs WHERE run_id=?').bind(safeText(payload.generated_at,40)).first();
   if(prior)return; // Immutable source snapshot already fully imported; avoid repeated D1 writes.
   let updated=0;
   for(let i=0;i<payload.items.length;i+=50){
    const statements=[];
    for(const x of payload.items.slice(i,i+50)){
     if(!x||!/^overture:[a-zA-Z0-9-]{10,}$/.test(x.id||'')||!x.name||x.city!=='Denver'||x.state!=='CO'||!String(x.source_url||'').startsWith('https://overturemaps.org/'))continue;
     if(!Number.isFinite(x.latitude)||!Number.isFinite(x.longitude)||x.latitude<39.4||x.latitude>40.1||x.longitude< -105.5||x.longitude> -104.3)continue;
     statements.push(env.RESTAURANTS.prepare(
      `INSERT INTO restaurants(id,name,city,state,category,address,latitude,longitude,website,source_url,source_name,confidence,image_url,sponsored,last_seen)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,0,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,category=excluded.category,address=excluded.address,
      latitude=excluded.latitude,longitude=excluded.longitude,website=excluded.website,confidence=excluded.confidence,
      last_seen=excluded.last_seen,updated_at=CURRENT_TIMESTAMP`
     ).bind(x.id,safeText(x.name,160),'Denver','CO',safeText(x.category,60),safeText(x.address,240),
      x.latitude,x.longitude,validWebsite(x.website),'https://overturemaps.org/','Overture Maps',
      Number(x.confidence)||0,'',safeText(payload.generated_at,40)));
    }
    if(statements.length){await env.RESTAURANTS.batch(statements);updated+=statements.length}
   }
   await env.RESTAURANTS.prepare(
    'INSERT OR REPLACE INTO restaurant_ingest_runs(run_id,city,state,source_name,dataset_version,records) VALUES(?,?,?,?,?,?)'
   ).bind(safeText(payload.generated_at,40),'Denver','CO','Overture Maps',safeText(payload.dataset_version,60),updated).run();
  })());
 }
};
