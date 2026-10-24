// QuantaPhi traffic: authenticated server-side Cloudflare GraphQL, never from the browser.
const ZONE='b1b4ce8b8ab433ec879238fc4a83a493';
const SOURCE='Cloudflare GraphQL httpRequests1dGroups';
const DAY=86400000;
const validCount=n=>Number.isSafeInteger(n)&&n>=0;
const isoDay=d=>d.toISOString().slice(0,10);
export function buildSnapshot(groups,now=new Date()){
 const to=isoDay(now),from=isoDay(new Date(Date.parse(to+'T00:00:00.000Z')-6*DAY));
 if(!Array.isArray(groups)||groups.length!==7)throw Error('incomplete_analytics_window');
 const days=groups.map(x=>({date:x?.dimensions?.date,requests:x?.sum?.requests,pageViews:x?.sum?.pageViews}))
  .sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 for(let i=0;i<7;i++){
  const expected=isoDay(new Date(Date.parse(from+'T00:00:00.000Z')+i*DAY));
  if(days[i]?.date!==expected||!validCount(days[i].requests)||!validCount(days[i].pageViews))throw Error('invalid_analytics_day');
 }
 const requests=days.reduce((n,x)=>n+x.requests,0),pageViews=days.reduce((n,x)=>n+x.pageViews,0);
 if(!validCount(requests)||!validCount(pageViews))throw Error('analytics_total_overflow');
 return {schemaVersion:1,site:'quantaphi.org',source:SOURCE,fetchedAt:now.toISOString(),
  period:{since:from,untilExclusive:isoDay(new Date(Date.parse(to+'T00:00:00.000Z')+DAY)),timeZone:'UTC',todayPartial:true},
  requests,pageViews,includesBots:true,uniqueVisitors:false,days};
}
export async function queryTraffic({token,fetcher=fetch,now=new Date()}){
 if(typeof token!=='string'||token.length<12)throw Error('analytics_secret_not_configured');
 const to=isoDay(now),from=isoDay(new Date(Date.parse(to+'T00:00:00.000Z')-6*DAY));
 const query=`{ viewer { zones(filter: { zoneTag: "${ZONE}" }) { httpRequests1dGroups(limit: 7, filter: { date_geq: "${from}", date_leq: "${to}" }) { dimensions { date } sum { requests pageViews } } } } }`;
 const response=await fetcher('https://api.cloudflare.com/client/v4/graphql',{
  method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({query}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('analytics_upstream_http_'+response.status);
 const result=await response.json();
 if(result.errors?.length)throw Error('analytics_graphql_error');
 const zones=result?.data?.viewer?.zones;
 if(!Array.isArray(zones)||zones.length!==1)throw Error('analytics_zone_unavailable');
 return buildSnapshot(zones[0].httpRequests1dGroups,now);
}
const publicHeaders={'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=60, s-maxage=300','X-Content-Type-Options':'nosniff'};
export default {
 async fetch(request,env,ctx){
  const url=new URL(request.url);
  if(url.pathname!=='/api/site-traffic')return new Response('Not found',{status:404});
  if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405,headers:{Allow:'GET, HEAD'}});
  // The cache key is stable regardless of the caller's timestamp query string.
  const cache=typeof caches!=='undefined'?caches.default:null;
  const key=new Request(url.origin+url.pathname);
  if(cache){
   const hit=await cache.match(key);
   if(hit)return request.method==='HEAD'?new Response(null,{status:200,headers:hit.headers}):hit;
  }
  try{
   const snapshot=await queryTraffic({token:env.SITE_TRAFFIC_CLOUDFLARE_TOKEN});
   const response=new Response(JSON.stringify(snapshot)+'\n',{headers:publicHeaders});
   if(cache&&ctx?.waitUntil)ctx.waitUntil(cache.put(key,response.clone()));
   return request.method==='HEAD'?new Response(null,{status:200,headers:response.headers}):response;
  }catch(e){
   console.warn('site traffic refresh unavailable:',String(e?.message||e).slice(0,80));
   return new Response(JSON.stringify({ok:false,error:'traffic_temporarily_unavailable'})+'\n',{
    status:503,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Retry-After':'120'}});
  }
 }
};
