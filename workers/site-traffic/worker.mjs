// Durable, cumulative verified traffic since the earliest available Cloudflare record.
// Calendar dates are upserted: overlapping windows are NEVER summed together.
const ZONE='b1b4ce8b8ab433ec879238fc4a83a493';
const SOURCE='Cloudflare GraphQL httpRequests1dGroups';
const DAY=86400000;
const isoDate=d=>d.toISOString().slice(0,10);
const isCount=n=>Number.isSafeInteger(n)&&n>=0;
function offsetDate(now,shift){
 const midnight=Date.parse(isoDate(now)+'T00:00:00.000Z');
 return isoDate(new Date(midnight+shift*DAY));
}
export function validateGroups(groups,now=new Date()){
 if(!Array.isArray(groups)||!groups.length||groups.length>32)throw Error('empty_or_oversized_analytics');
 const seen=new Set(),today=isoDate(now);
 return groups.map(g=>{
  const date=g?.dimensions?.date,requests=g?.sum?.requests,pageViews=g?.sum?.pageViews;
  if(typeof date!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(date)||
   Number.isNaN(Date.parse(date+'T00:00:00Z'))||date>today||seen.has(date)||
   !isCount(requests)||!isCount(pageViews))throw Error('invalid_analytics_day');
  seen.add(date);return {date,requests,pageViews};
 }).sort((a,b)=>a.date.localeCompare(b.date));
}
export async function queryTraffic({token,fetcher=fetch,now=new Date()}){
 if(typeof token!=='string'||token.length<12)throw Error('analytics_token_not_configured');
 const from=offsetDate(now,-29),to=isoDate(now);
 const query='{ viewer { zones(filter: { zoneTag: "'+ZONE+'" }) { httpRequests1dGroups(limit: 31, filter: { date_geq: "'+from+'", date_leq: "'+to+'" }) { dimensions { date } sum { requests pageViews } } } } }';
 const res=await fetcher('https://api.cloudflare.com/client/v4/graphql',{
  method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({query}),signal:AbortSignal.timeout(15000)});
 if(!res.ok)throw Error('analytics_http_'+res.status);
 const json=await res.json();
 if(json.errors?.length)throw Error('analytics_graphql_error');
 const zones=json?.data?.viewer?.zones;
 if(!Array.isArray(zones)||zones.length!==1)throw Error('analytics_zone_missing');
 return validateGroups(zones[0].httpRequests1dGroups,now);
}
export async function refreshLedger(db,{token,fetcher=fetch,now=new Date()}={}){
 if(!db)throw Error('ledger_unavailable');
 const days=await queryTraffic({token,fetcher,now});
 const timestamp=now.toISOString();
 const sql='INSERT INTO traffic_daily(date,requests,page_views,verified_at,source) VALUES(?1,?2,?3,?4,?5) '+
  'ON CONFLICT(date) DO UPDATE SET requests=MAX(traffic_daily.requests,excluded.requests), '+
  'page_views=MAX(traffic_daily.page_views,excluded.page_views), verified_at=excluded.verified_at';
 const statements=days.map(d=>db.prepare(sql).bind(d.date,d.requests,d.pageViews,timestamp,SOURCE));
 await db.batch(statements);
 return {dayCount:days.length,fetchedAt:timestamp};
}
export function cumulativeSnapshot(rows,now=new Date()){
 if(!Array.isArray(rows)||!rows.length)throw Error('ledger_empty');
 const sorted=[...rows].sort((a,b)=>a.date.localeCompare(b.date)),today=isoDate(now);
 let requests=0,pageViews=0,latest='';
 for(const r of sorted){
  if(typeof r.date!=='string'||!/^20\d{2}-\d{2}-\d{2}$/.test(r.date)||r.date>today||!isCount(r.requests)||!isCount(r.page_views))
   throw Error('ledger_invalid');
  requests+=r.requests;pageViews+=r.page_views;
  if(!isCount(requests)||!isCount(pageViews))throw Error('ledger_overflow');
  if(typeof r.verified_at==='string'&&r.verified_at>latest)latest=r.verified_at;
 }
 const first=sorted[0].date,mostRecent=sorted[sorted.length-1].date,begin7=offsetDate(now,-6);
 const recent=sorted.filter(x=>x.date>=begin7&&x.date<=today);
 const expected=Math.round((Date.parse(today+'T00:00:00Z')-Date.parse(first+'T00:00:00Z'))/DAY)+1;
 const last7Days={since:begin7,until:today,
  requests:recent.reduce((a,d)=>a+d.requests,0),pageViews:recent.reduce((a,d)=>a+d.page_views,0),
  daysRecorded:recent.length};
 return {schemaVersion:2,site:'quantaphi.org',source:SOURCE,scope:'recorded_since',
  since:first,through:mostRecent,fetchedAt:latest,requests,pageViews,last7Days,
  recordedDays:sorted.length,coverageContinuous:sorted.length===expected,
  historicComplete:false,includesBots:true,uniqueVisitors:false};
}
export async function readLedger(db,now=new Date()){
 if(!db)throw Error('ledger_unavailable');
 const result=await db.prepare('SELECT date,requests,page_views,verified_at FROM traffic_daily ORDER BY date ASC').all();
 return cumulativeSnapshot(result.results,now);
}
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=60, s-maxage=120','X-Content-Type-Options':'nosniff'};
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname!=='/api/site-traffic')return new Response('Not found',{status:404});
  if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  try{
   const snapshot=await readLedger(env.TRAFFIC_LEDGER);
   snapshot.refreshConfigured=Boolean(env.SITE_TRAFFIC_CLOUDFLARE_TOKEN);
   // Never block the accumulating counter when an analytics refresh fails.
   const stamp=Date.parse(snapshot.fetchedAt);
   if(env.SITE_TRAFFIC_CLOUDFLARE_TOKEN&&ctx?.waitUntil&&(!Number.isFinite(stamp)||Date.now()-stamp>15*60*1000)){
    ctx.waitUntil(refreshLedger(env.TRAFFIC_LEDGER,{token:env.SITE_TRAFFIC_CLOUDFLARE_TOKEN}).catch(e=>console.warn('traffic_refresh:',String(e?.message||e).slice(0,80))));
   }
   return new Response(request.method==='HEAD'?null:JSON.stringify(snapshot)+'\n',{status:200,headers});
  }catch(e){
   console.warn('traffic_read:',String(e?.message||e).slice(0,80));
   return new Response(JSON.stringify({ok:false,error:'traffic_ledger_unavailable'})+'\n',{status:503,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
  }
 },
 async scheduled(controller,env){
  try{await refreshLedger(env.TRAFFIC_LEDGER,{token:env.SITE_TRAFFIC_CLOUDFLARE_TOKEN});}
  catch(e){console.warn('scheduled_traffic_refresh:',String(e?.message||e).slice(0,80));}
 }
};
