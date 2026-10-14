/** Private QuantaPhi aggregate traffic snapshots.
 * Populated by a separately connected Cloudflare analytics reader, not by
 * frontend clicks, untrusted visitor data, wallet events or HTTP 200 guesses.
 * Never stores IPs, user agents, referrer paths or owner credentials.
 */
export const AUDIENCE_ZONE='b1b4ce8b8ab433ec879238fc4a83a493';
export const SNAPSHOT_SCHEMA=1;
const METRICS=['http_requests','page_views','unique_clients','browser_loads_not_bot','browser_loads_bot','browser_visits_not_bot','browser_visits_bot'];
const n=v=>Number.isSafeInteger(Number(v))&&Number(v)>=0?Number(v):0;
export function summarizeAudience(rows,{at=new Date(),days=7}={}){
 if(!Array.isArray(rows))throw TypeError('Verified Cloudflare daily rows required');
 const latestDay=new Date(Date.UTC(at.getUTCFullYear(),at.getUTCMonth(),at.getUTCDate()));
 const until=latestDay.toISOString().slice(0,10);
 const count=Math.max(1,Math.min(14,Math.trunc(days)||7));
 const min=new Date(latestDay.valueOf()-count*86400000).toISOString().slice(0,10);
 const filtered=rows.filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r?.day||'')&&r.day<until&&r.day>=min)
  .sort((a,b)=>a.day.localeCompare(b.day)).slice(-count);
 const totals=Object.fromEntries(METRICS.map(k=>[k,filtered.reduce((sum,row)=>sum+n(row[k]),0)]));
 const last=filtered.at(-1);
 return {ok:true,schemaVersion:SNAPSHOT_SCHEMA,source:'Cloudflare HTTP analytics and RUM; stored daily aggregates',
  period:{from:min,through:new Date(latestDay.valueOf()-86400000).toISOString().slice(0,10),timezone:'UTC',requestedDays:count,daysAvailable:filtered.length},
  observedAt:last?.observed_at||null,dataState:filtered.length===0?'not_connected':last?.day<new Date(latestDay.valueOf()-86400000).toISOString().slice(0,10)?'stale':'recorded',
  totals,days:filtered.map(r=>({day:r.day,...Object.fromEntries(METRICS.map(k=>[k,n(r[k])])),observedAt:r.observed_at||null})),
  interpretation:[
   'HTTP requests include assets, scripts, crawlers and automated testing: not people or clicks.',
   'Page views and Cloudflare unique-client estimates include automated traffic; unique-client values are not deduplicated across days.',
   'RUM browser page-load counts labeled not bot are not guaranteed human visitors, unique users or conversions.',
   'Bot labels are Cloudflare RUM classifications, not proof that every other request is a real customer.',
   'Google Search Console clicks and impressions and X in-app referral attribution are separate measurements.',
   'Snapshot freshness is the observedAt timestamp. Missing days are not zero-traffic claims.'
  ]};
}
export async function readAudience(db,{at=new Date(),days=7}={}){
 if(!db||typeof db.prepare!=='function')throw Error('Cloudflare D1 work database not connected');
 const count=Math.max(1,Math.min(14,Math.trunc(days)||7));
 const cutoff=new Date(Date.UTC(at.getUTCFullYear(),at.getUTCMonth(),at.getUTCDate())).toISOString().slice(0,10);
 const start=new Date(new Date(cutoff+'T00:00:00.000Z').valueOf()-count*86400000).toISOString().slice(0,10);
 const result=await db.prepare('SELECT day,http_requests,page_views,unique_clients,browser_loads_not_bot,browser_loads_bot,browser_visits_not_bot,browser_visits_bot,observed_at FROM audience_daily WHERE zone=? AND day>=? AND day<? ORDER BY day ASC LIMIT ?').bind(AUDIENCE_ZONE,start,cutoff,count).all();
 if(!result?.success||!Array.isArray(result.results))throw Error('Cloudflare analytics snapshot read failed');
 return summarizeAudience(result.results,{at,days:count});
}
