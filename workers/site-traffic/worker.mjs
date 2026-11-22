// Durable, cumulative verified traffic since the earliest available Cloudflare record.
// Calendar dates are upserted: overlapping windows are NEVER summed together.
const ZONE='b1b4ce8b8ab433ec879238fc4a83a493';
const SOURCE='Cloudflare GraphQL httpRequests1dGroups';
const DAY=86400000;
const isoDate=d=>d.toISOString().slice(0,10);
const isCount=n=>Number.isSafeInteger(n)&&n>=0;
// Reject invalid or implausibly future D1 verification timestamps (5m clock skew).
const validVerifiedAt=(value,now)=>typeof value==='string'&&
 /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)&&
 Number.isFinite(Date.parse(value))&&
 new Date(value).toISOString()===(value.includes('.')?value:value.replace(/Z$/,'.000Z'))&&
 Date.parse(value)<=now.getTime()+5*60*1000;
// Date.parse normalizes impossible days (e.g. February 30); reject them before D1 writes.
const validUtcDay=date=>typeof date==='string'&&/^20\d{2}-\d{2}-\d{2}$/.test(date)&&
 !Number.isNaN(Date.parse(date+'T00:00:00Z'))&&
 new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date;
function offsetDate(now,shift){
 const midnight=Date.parse(isoDate(now)+'T00:00:00.000Z');
 return isoDate(new Date(midnight+shift*DAY));
}
export function validateGroups(groups,now=new Date()){
 if(!Array.isArray(groups)||!groups.length||groups.length>32)throw Error('empty_or_oversized_analytics');
 const seen=new Set(),today=isoDate(now);
 return groups.map(g=>{
  const date=g?.dimensions?.date,requests=g?.sum?.requests,pageViews=g?.sum?.pageViews;
  if(!validUtcDay(date)||date>today||seen.has(date)||
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
  'page_views=MAX(traffic_daily.page_views,excluded.page_views), '+
  'verified_at=CASE WHEN julianday(excluded.verified_at)>julianday(traffic_daily.verified_at) '+
  'THEN excluded.verified_at ELSE traffic_daily.verified_at END';
 const statements=days.map(d=>db.prepare(sql).bind(d.date,d.requests,d.pageViews,timestamp,SOURCE));
 const receipts=await db.batch(statements);
 // A resolved D1 batch is not proof that every daily write succeeded.
 if(!Array.isArray(receipts)||receipts.length!==statements.length||
    receipts.some(r=>r?.success!==true))throw Error('ledger_write_unverified');
 return {dayCount:days.length,fetchedAt:timestamp};
}
export function cumulativeSnapshot(rows,now=new Date()){
 if(!Array.isArray(rows)||!rows.length)throw Error('ledger_empty');
 const sorted=[...rows].sort((a,b)=>a.date.localeCompare(b.date)),today=isoDate(now);
 let requests=0,pageViews=0,latest='',latestMs=-Infinity;
 const seenDates=new Set();
 for(const r of sorted){
  if(!validUtcDay(r.date)||r.date>today||seenDates.has(r.date)||!isCount(r.requests)||!isCount(r.page_views)||
     !validVerifiedAt(r.verified_at,now))
   throw Error('ledger_invalid');
  seenDates.add(r.date);
  requests+=r.requests;pageViews+=r.page_views;
  if(!isCount(requests)||!isCount(pageViews))throw Error('ledger_overflow');
  const verifiedMs=Date.parse(r.verified_at);
  if(verifiedMs>latestMs){latestMs=verifiedMs;latest=r.verified_at;}
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
// A manual read can demand fresh provider data, but never exposes the Analytics token.
// Five-minute provider cooldown avoids hitting Cloudflare on repeated button presses.
const MANUAL_COOLDOWN_MS=5*60*1000;
// Keep one public, verified snapshot per edge instead of scanning every daily
// record for every visitor's minute timer. The longer cache lifetime preserves
// the actual last verified counts during a shared D1 quota outage.
const SNAPSHOT_FRESH_MS=60*1000;
const snapshotKey=()=>new Request('https://quantaphi.org/api/site-traffic?cache=verified-snapshot-v1');
function validSnapshot(d,now){
 const recent=d?.last7Days,today=isoDate(now);
 return d?.schemaVersion===2&&d.site==='quantaphi.org'&&d.source===SOURCE&&
  d.scope==='recorded_since'&&d.historicComplete===false&&d.includesBots===true&&d.uniqueVisitors===false&&
  validUtcDay(d.since)&&validUtcDay(d.through)&&d.since<=d.through&&d.through<=today&&
  validVerifiedAt(d.fetchedAt,now)&&isCount(d.requests)&&isCount(d.pageViews)&&
  isCount(d.recordedDays)&&typeof d.coverageContinuous==='boolean'&&
  recent&&validUtcDay(recent.since)&&validUtcDay(recent.until)&&
  recent.until>=d.through&&recent.until<=today&&
  Date.parse(recent.until)-Date.parse(recent.since)===6*DAY&&
  isCount(recent.daysRecorded)&&recent.daysRecorded<=7&&recent.daysRecorded<=d.recordedDays&&
  isCount(recent.requests)&&isCount(recent.pageViews)&&recent.requests<=d.requests&&recent.pageViews<=d.pageViews;
}
async function cachedSnapshot(cache,now){
 try{
  const response=await cache?.match(snapshotKey());
  if(!response?.ok)return null;
  const snapshot=await response.json(),storedAt=Number(response.headers.get('X-Traffic-Cached-At'));
  return validSnapshot(snapshot,now)&&Number.isFinite(storedAt)&&storedAt>0&&storedAt<=now.getTime()+60000?
   {snapshot,storedAt}:null;
 }catch{return null;}
}
async function cacheSnapshot(cache,snapshot,now){
 if(!cache?.put)return;
 try{await cache.put(snapshotKey(),Response.json(snapshot,{headers:{
  'Cache-Control':'public, max-age=86400','X-Traffic-Cached-At':String(now.getTime())
 }}));}catch{}
}
export async function handleTrafficRequest(request,env,{fetcher=fetch,now=new Date(),ctx,cache=globalThis.caches?.default}={}){
 const url=new URL(request.url);
 if(url.pathname!=='/api/site-traffic')return new Response('Not found',{status:404});
 if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
 const manual=request.method==='GET'&&url.searchParams.get('refresh')==='1';
 const configured=Boolean(env.SITE_TRAFFIC_CLOUDFLARE_TOKEN);
 const cached=await cachedSnapshot(cache,now);
 if(!manual&&cached&&now.getTime()-cached.storedAt<SNAPSHOT_FRESH_MS){
  return new Response(request.method==='HEAD'?null:JSON.stringify({...cached.snapshot,refreshConfigured:configured})+'\n',{status:200,headers});
 }
 try{
  let snapshot=await readLedger(env.TRAFFIC_LEDGER,now);
  let refreshStatus;
  if(manual){
   if(!configured)refreshStatus='not_configured';
   else if(now.getTime()-Date.parse(snapshot.fetchedAt)<MANUAL_COOLDOWN_MS)refreshStatus='recent';
   else{
    try{
     // Await the provider query AND the D1 readback before claiming success.
     await refreshLedger(env.TRAFFIC_LEDGER,{token:env.SITE_TRAFFIC_CLOUDFLARE_TOKEN,fetcher,now});
     snapshot=await readLedger(env.TRAFFIC_LEDGER,now);
     refreshStatus='refreshed';
    }catch(e){
     console.warn('manual_traffic_refresh:',String(e?.message||e).slice(0,80));
     refreshStatus='failed';
    }
   }
  }else if(configured&&ctx?.waitUntil&&
    now.getTime()-Date.parse(snapshot.fetchedAt)>15*60*1000){
   ctx.waitUntil(refreshLedger(env.TRAFFIC_LEDGER,{
    token:env.SITE_TRAFFIC_CLOUDFLARE_TOKEN,fetcher,now
   }).catch(e=>console.warn('traffic_refresh:',String(e?.message||e).slice(0,80))));
  }
  // Read replicas or older fallback data must never replace a newer verified
  // total with fewer requests/views. Preserve its original verification time.
  if(cached&&cached.snapshot.since===snapshot.since&&
   (cached.snapshot.requests>snapshot.requests||cached.snapshot.pageViews>snapshot.pageViews||
    Date.parse(cached.snapshot.fetchedAt)>Date.parse(snapshot.fetchedAt)))snapshot=cached.snapshot;
  snapshot={...snapshot,refreshConfigured:configured};
  delete snapshot.storageStatus;delete snapshot.retryAt;
  if(cached?.snapshot.refreshStatus==='failed'&&
   Date.parse(snapshot.fetchedAt)<=Date.parse(cached.snapshot.fetchedAt)&&refreshStatus!=='refreshed')refreshStatus='failed';
  if(refreshStatus)snapshot.refreshStatus=refreshStatus;
  else delete snapshot.refreshStatus;
  await cacheSnapshot(cache,snapshot,now);
  return new Response(request.method==='HEAD'?null:JSON.stringify(snapshot)+'\n',{
   status:200,headers:manual?{...headers,'Cache-Control':'no-store'}:headers
  });
 }catch(e){
  console.warn('traffic_read:',String(e?.message||e).slice(0,80));
  if(cached){
   const snapshot={...cached.snapshot,refreshConfigured:configured,storageStatus:'unavailable'};
   if(manual)snapshot.refreshStatus='failed';
   if(String(e?.message||e).includes('free tier daily row'))snapshot.retryAt=new Date(Date.parse(isoDate(now))+DAY).toISOString();
   await cacheSnapshot(cache,snapshot,now);
   return new Response(request.method==='HEAD'?null:JSON.stringify(snapshot)+'\n',{
    status:200,headers:{...headers,'Cache-Control':'no-store'}
   });
  }
  return new Response(JSON.stringify({ok:false,error:'traffic_ledger_unavailable'})+'\n',{
   status:503,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}
  });
 }
}
export default {
 async fetch(request,env,ctx){
  return handleTrafficRequest(request,env,{ctx});
 },
 async scheduled(controller,env){
  try{await refreshLedger(env.TRAFFIC_LEDGER,{token:env.SITE_TRAFFIC_CLOUDFLARE_TOKEN});}
  catch(e){console.warn('scheduled_traffic_refresh:',String(e?.message||e).slice(0,80));}
 }
};
