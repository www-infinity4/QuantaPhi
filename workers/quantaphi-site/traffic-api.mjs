// Public aggregate site statistics. The API token is a Worker secret, never browser-visible.
const ZONE_ID='b1b4ce8b8ab433ec879238fc4a83a493'; // quantaphi.org: not a credential
const TTL_SECONDS=600;
const QUERY=[
 'query Traffic($zoneTag: string, $start: Date, $end: Date) {',
 ' viewer { zones(filter: {zoneTag: $zoneTag}) {',
 '  days: httpRequests1dGroups(limit: 7, orderBy: [date_ASC],',
 '    filter: {date_geq: $start, date_lt: $end}) {',
 '    dimensions { date } sum { requests pageViews }',
 '  }',
 ' } }',
 '}'
].join('\n');
const unavailable=()=>Response.json({ok:false,error:'cloudflare_traffic_unavailable'},
 {status:503,headers:{'Cache-Control':'no-store','Retry-After':'120','X-Content-Type-Options':'nosniff'}});
const safeInteger=value=>Number.isSafeInteger(value)&&value>=0;

export async function trafficAPI(request,env,fetcher=fetch,edgeCache=typeof caches==='undefined'?null:caches.default) {
 if(request.method!=='GET')return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});
 const token=env?.CLOUDFLARE_ANALYTICS_TOKEN;
 if(typeof token!=='string'||!token)return unavailable();
 // The zone and date window are fixed by the server: visitors cannot query other accounts.
 const cacheKey=new Request('https://quantaphi.org/api/site-traffic');
 try{
  const cached=await edgeCache?.match(cacheKey);
  if(cached)return cached;
  const now=new Date();
  const today=new Date(now.toISOString().slice(0,10)+'T00:00:00.000Z');
  const start=new Date(today.getTime()-6*86400000);
  const end=new Date(today.getTime()+86400000);
  const date=v=>v.toISOString().slice(0,10);
  const upstream=await fetcher('https://api.cloudflare.com/client/v4/graphql',{
   method:'POST',
   headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','Accept':'application/json'},
   body:JSON.stringify({query:QUERY,variables:{zoneTag:env.CLOUDFLARE_ZONE_ID||ZONE_ID,start:date(start),end:date(end)}}),
   signal:AbortSignal.timeout(8000)
  });
  if(!upstream.ok)return unavailable();
  const responseData=await upstream.json();
  if(responseData.errors?.length || !responseData.data?.viewer?.zones?.length)return unavailable();
  const rows=responseData.data.viewer.zones[0]?.days;
  if(!Array.isArray(rows)||rows.length>7)return unavailable();
  const byDate=new Map();
  for(const row of rows){
   const day=row?.dimensions?.date,requests=Number(row?.sum?.requests),pageViews=Number(row?.sum?.pageViews);
   if(typeof day!=='string'||byDate.has(day)||!safeInteger(requests)||!safeInteger(pageViews))return unavailable();
   byDate.set(day,{date:day,requests,pageViews});
  }
  const days=Array.from({length:7},(_x,i)=>{
   const day=date(new Date(start.getTime()+i*86400000));
   return byDate.get(day)||{date:day,requests:0,pageViews:0};
  });
  if(byDate.size!==days.filter(d=>byDate.has(d.date)).length)return unavailable();
  const requests=days.reduce((total,d)=>total+d.requests,0);
  const pageViews=days.reduce((total,d)=>total+d.pageViews,0);
  if(!safeInteger(requests)||!safeInteger(pageViews))return unavailable();
  const response=Response.json({
   schemaVersion:1,site:'quantaphi.org',source:'Cloudflare GraphQL httpRequests1dGroups',
   fetchedAt:now.toISOString(),
   period:{since:date(start),untilExclusive:date(end),timeZone:'UTC',todayPartial:true},
   requests,pageViews,includesBots:true,uniqueVisitors:false,days
  },{headers:{'Cache-Control':'public, max-age=0, s-maxage='+TTL_SECONDS,'X-Content-Type-Options':'nosniff'}});
  if(edgeCache)await edgeCache.put(cacheKey,response.clone()).catch(()=>{});
  return response;
 }catch{
  return unavailable();
 }
}
