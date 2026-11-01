/* Read-only public attractions directory. Isolated from restaurant/wallet databases. */
const STATES=new Set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));
const HEADERS={'Cache-Control':'public,max-age=90','Access-Control-Allow-Origin':'*','X-Content-Type-Options':'nosniff'};
const answer=(data,status=200)=>Response.json(data,{status,headers:HEADERS});
const text=(v,n=120)=>String(v??'').trim().slice(0,n);
export const validState=v=>STATES.has(String(v||'').toUpperCase());
export const seedSources=s=>s==='CO'?['co-seed.json','co-overture-nw.json','co-overture-ne.json','co-overture-sw.json','co-overture-se.json']:[s.toLowerCase()+'-overture.json'];
export const safeSite=v=>{try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&u.hostname.includes('.')&&u.hostname!=='localhost'&&u.href.length<401?u.href:''}catch{return ''}};
export function cleanRecord(o,state,seen){
 if(!o||!validState(state)||String(o.state||'').toUpperCase()!==state)return null;
 const id=text(o.id,110),name=text(o.name,160),category=text(o.category,70);
 const latitude=Number(o.latitude),longitude=Number(o.longitude),source_url=safeSite(o.source_url);
 if(!/^(curated|overture):[a-zA-Z0-9-]{8,100}$/.test(id)||!name||!category||!source_url||!o.source_name||!o.license||!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)return null;
 const photo=safeSite(o.image_url),credit=text(o.image_attribution,200);
 return {id,name,city:text(o.city,100),state,category,address:text(o.address,240),latitude,longitude,
  website:safeSite(o.website),source_name:text(o.source_name,100),source_url,license:text(o.license,100),
  confidence:Math.max(0,Math.min(1,Number(o.confidence)||0)),image_url:photo&&credit?photo:'',
  image_attribution:photo?credit:'',last_seen:text(seen,45)};
}
async function search(url,env,feed=false){
 const state=text(url.searchParams.get('state')||'CO',2).toUpperCase();
 if(!validState(state))return answer({error:'Invalid U.S. state'},400);
 const city=text(url.searchParams.get('city'),80),category=text(url.searchParams.get('category'),65);
 const q=text(url.searchParams.get('q'),65).replace(/[\\%_]/g,' ');
 const requestedPage=Number(url.searchParams.get('page')||'0');
 const page=Number.isSafeInteger(requestedPage)&&requestedPage>=0?Math.min(100000,requestedPage):0;
 const sql="SELECT id,name,city,state,category,address,latitude,longitude,website,source_name,source_url,license,confidence,image_url,image_attribution,last_seen FROM attractions WHERE state=? AND status='listed' AND (?='' OR lower(city)=lower(?)) AND (?='' OR category=?) AND (name LIKE ? OR category LIKE ?) ORDER BY name COLLATE NOCASE,id LIMIT 25 OFFSET ?";
 const {results}=await env.ATTRACTIONS.prepare(sql).bind(state,city,city,category,category,'%'+q+'%','%'+q+'%',page*24).all();
 const rows=results||[];
 const items=rows.slice(0,24).map(o=>({...o,website:safeSite(o.website),source_url:safeSite(o.source_url),image_url:safeSite(o.image_url),sponsored:false,card_eligible:!!(o.name&&o.source_url&&o.license),...(feed?{card_kind:'attraction'}:{})}));
 return answer({state,city,category,query:q,page,page_size:24,count:items.length,has_more:page<100000&&rows.length>24,items,
  note:'Organic source-backed directory, not advertising or live booking. No guaranteed prices, hours, reviews, slots, availability or sponsorship.'});
}
export async function importSnapshot(env,payload){
 const state=text(payload?.state,2).toUpperCase();
 if(payload?.schema_version!==1||!validState(state)||!Array.isArray(payload.items)||payload.items.length>5000||!payload.generated_at||!payload.source_name||!payload.dataset_version)throw Error('invalid_snapshot');
 const closedIds=Array.isArray(payload.closed_ids)?payload.closed_ids:[];
 if(closedIds.length>5000||closedIds.some(id=>!/^overture:[a-zA-Z0-9-]{10,100}$/.test(id)))throw Error('invalid_closure_ids');
 const run_id=[state,text(payload.source_name,80),text(payload.dataset_version,90),text(payload.generated_at,45)].join('|')+
  (payload.shard?'|'+text(payload.shard,30):'');
 if(await env.ATTRACTIONS.prepare('SELECT run_id FROM attraction_ingest_runs WHERE run_id=?').bind(run_id).first())return {skipped:true,records:0};
 let records=0;
 for(let i=0;i<payload.items.length;i+=40){
  const batch=payload.items.slice(i,i+40).map(o=>cleanRecord(o,state,payload.generated_at)).filter(Boolean).map(o=>
   env.ATTRACTIONS.prepare("INSERT INTO attractions(id,name,city,state,category,address,latitude,longitude,website,source_name,source_url,license,confidence,image_url,image_attribution,last_seen) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,city=excluded.city,state=excluded.state,category=excluded.category,address=excluded.address,latitude=excluded.latitude,longitude=excluded.longitude,website=excluded.website,source_name=excluded.source_name,source_url=excluded.source_url,license=excluded.license,confidence=excluded.confidence,image_url=excluded.image_url,image_attribution=excluded.image_attribution,last_seen=excluded.last_seen,status='listed',updated_at=CURRENT_TIMESTAMP")
   .bind(o.id,o.name,o.city,o.state,o.category,o.address,o.latitude,o.longitude,o.website,o.source_name,o.source_url,o.license,o.confidence,o.image_url,o.image_attribution,o.last_seen));
  if(batch.length){await env.ATTRACTIONS.batch(batch);records+=batch.length}
 }
 // Closure changes require explicit source tombstones in a complete reviewed snapshot.
 // Never close curated records, unrelated shards, or rows merely absent from a download.
 let closureCandidates=0;
 if(payload.source_name==='Overture Maps'&&!payload.truncated){
  for(let i=0;i<closedIds.length;i+=40){
   const batch=closedIds.slice(i,i+40).map(id=>env.ATTRACTIONS.prepare(
    "UPDATE attractions SET status='closed',updated_at=CURRENT_TIMESTAMP WHERE id=? AND state=? AND source_name='Overture Maps' AND id LIKE 'overture:%'"
   ).bind(id,state));
   if(batch.length){await env.ATTRACTIONS.batch(batch);closureCandidates+=batch.length}
  }
 }
 await env.ATTRACTIONS.batch([
  env.ATTRACTIONS.prepare('INSERT INTO attraction_ingest_runs(run_id,state,source_name,records) VALUES(?,?,?,?)').bind(run_id,state,text(payload.source_name,100),records),
  env.ATTRACTIONS.prepare("UPDATE attraction_states SET status='ingesting',last_snapshot=? WHERE state=?").bind(text(payload.generated_at,45),state)
 ]);
 return {skipped:false,records,closureCandidates};
}
export default {
 async fetch(request,env){
  if(request.method!=='GET')return answer({error:'Read-only directory'},405);
  if(!env.ATTRACTIONS)return answer({error:'Cloudflare D1 binding unavailable'},503);
  const url=new URL(request.url);
  try{
   if(url.pathname==='/api/attractions/search')return await search(url,env);
   if(url.pathname==='/api/attractions/feed')return await search(url,env,true);
   if(url.pathname==='/api/attractions/stats'){
    const a=await env.ATTRACTIONS.prepare("SELECT state,COUNT(*) total,MAX(last_seen) last_seen FROM attractions WHERE status='listed' GROUP BY state ORDER BY CASE state WHEN 'CO' THEN 0 ELSE 1 END,state").all();
    const b=await env.ATTRACTIONS.prepare("SELECT state,display_name,status,last_snapshot FROM attraction_states ORDER BY CASE state WHEN 'CO' THEN 0 ELSE 1 END,state").all();
    return answer({states:b.results||[],populated:a.results||[],first_state:'CO',note:'Queued states are not populated until verified records are ingested.'});
   }
   if(url.pathname==='/api/attractions/health'){
    const row=await env.ATTRACTIONS.prepare('SELECT COUNT(*) AS total FROM attractions').first();
    return answer({ok:true,database:'connected',service:'Infinity Attractions Directory',records:row?.total||0});
   }
   return answer({error:'Unknown route'},404);
  }catch{return answer({error:'Attractions search temporarily unavailable'},503)}
 },
 async scheduled(event,env,ctx){if(!env.ATTRACTIONS)return;ctx.waitUntil((async()=>{
   for(const file of seedSources('CO')){
    const url='https://raw.githubusercontent.com/www-infinity4/QuantaPhi/main/data/attractions/'+file;
    const r=await fetch(url,{signal:AbortSignal.timeout(25000)});
    if(r.status===404)continue;if(!r.ok)throw Error('snapshot_http_'+r.status);
    const payload=await r.json();if(payload?.state!=='CO')throw Error('bad_state_snapshot');
    await importSnapshot(env,payload);
   }
  })())}
};