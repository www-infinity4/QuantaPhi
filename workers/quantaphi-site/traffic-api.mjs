// Public aggregate site statistics. The API token is a Worker secret, never browser-visible.
const ZONE_ID = 'b1b4ce8b8ab433ec879238fc4a83a493'; // quantaphi.org (not a credential)
const TTL_SECONDS = 600;
const QUERY = [
  'query Traffic($zoneTag: string, $start: Time, $end: Time) {',
  '  viewer { zones(filter: {zoneTag: $zoneTag}) {',
  '    totals: httpRequestsAdaptiveGroups(limit: 1, filter: {',
  '      datetime_geq: $start, datetime_lt: $end, requestSource: "eyeball"',
  '    }) { count sum { visits } }',
  '  } }',
  '}'
].join('\n');
const securityHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff'
};
const unavailable = () => Response.json(
  {ok:false, error:'cloudflare_traffic_unavailable'},
  {status:503,headers:{...securityHeaders,'Cache-Control':'no-store','Retry-After':'120'}}
);

export async function trafficAPI(request, env, fetcher = fetch, edgeCache = typeof caches === 'undefined' ? null : caches.default) {
  if (request.method !== 'GET') return new Response('Method not allowed',{status:405,headers:{Allow:'GET'}});
  // One fixed, public zone. No client-selected IDs, dates or GraphQL requests.
  const token = env?.CLOUDFLARE_ANALYTICS_TOKEN;
  if (!token || typeof token !== 'string') return unavailable();
  const cacheKey = new Request('https://quantaphi.org/api/site-traffic');
  try {
    const cached = await edgeCache?.match(cacheKey);
    if (cached) return cached;
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
    const upstream = await fetcher('https://api.cloudflare.com/client/v4/graphql',{
      method:'POST',
      headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json','Accept':'application/json'},
      body:JSON.stringify({
        query:QUERY,variables:{zoneTag:env.CLOUDFLARE_ZONE_ID || ZONE_ID,start:start.toISOString(),end:end.toISOString()}
      }),
      signal:AbortSignal.timeout(8000)
    });
    if (!upstream.ok) return unavailable();
    const data = await upstream.json();
    if (data.errors?.length || !data.data?.viewer?.zones?.length) return unavailable();
    const rows=data.data.viewer.zones[0]?.totals;
    if (!Array.isArray(rows)) return unavailable();
    // No matching rows is a legitimate zero-traffic period, not a made-up total.
    const total=rows[0] || {count:0,sum:{visits:0}};
    const requests=Number(total.count);
    const visits=Number(total.sum?.visits);
    if (![requests,visits].every(n=>Number.isFinite(n) && n>=0)) return unavailable();
    const response=Response.json({
      ok:true,source:'cloudflare',zone:'quantaphi.org',period:'rolling_24h',
      requests:Math.round(requests),visits:Math.round(visits),
      windowStart:start.toISOString(),windowEnd:end.toISOString(),updatedAt:end.toISOString(),
      note:'Traffic may be sampled. Visits are referrer-based arrivals, not unique users or page views.'
    },{headers:{...securityHeaders,'Cache-Control':'public, max-age=0, s-maxage='+TTL_SECONDS}});
    if (edgeCache) await edgeCache.put(cacheKey,response.clone()).catch(()=>{});
    return response;
  } catch {
    // Do not disclose bearer tokens, Cloudflare error messages or account data.
    return unavailable();
  }
}
