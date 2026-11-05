/* QuantaPhi nationwide internet-radio directory.
 * Radio Browser is a community stream index, not an exhaustive FCC registry.
 * First-party D1 caches metadata; the broadcaster serves audio directly.
 */
export const US_STATES=Object.freeze([
 ['AL','Alabama'],['AK','Alaska'],['AZ','Arizona'],['AR','Arkansas'],
 ['CA','California'],['CO','Colorado'],['CT','Connecticut'],['DE','Delaware'],
 ['DC','District of Columbia'],['FL','Florida'],['GA','Georgia'],['HI','Hawaii'],
 ['ID','Idaho'],['IL','Illinois'],['IN','Indiana'],['IA','Iowa'],
 ['KS','Kansas'],['KY','Kentucky'],['LA','Louisiana'],['ME','Maine'],
 ['MD','Maryland'],['MA','Massachusetts'],['MI','Michigan'],['MN','Minnesota'],
 ['MS','Mississippi'],['MO','Missouri'],['MT','Montana'],['NE','Nebraska'],
 ['NV','Nevada'],['NH','New Hampshire'],['NJ','New Jersey'],['NM','New Mexico'],
 ['NY','New York'],['NC','North Carolina'],['ND','North Dakota'],['OH','Ohio'],
 ['OK','Oklahoma'],['OR','Oregon'],['PA','Pennsylvania'],['RI','Rhode Island'],
 ['SC','South Carolina'],['SD','South Dakota'],['TN','Tennessee'],['TX','Texas'],
 ['UT','Utah'],['VT','Vermont'],['VA','Virginia'],['WA','Washington'],
 ['WV','West Virginia'],['WI','Wisconsin'],['WY','Wyoming']
]);
const NAMES=new Map(US_STATES);
const MIRRORS=Object.freeze([
 'https://de2.api.radio-browser.info',
 'https://nl1.api.radio-browser.info',
 'https://fi1.api.radio-browser.info'
]);
const PAGE=24, TTL_MS=12*60*60*1000, MAX_PAGE=100;
const ID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clean=(str,max=160)=>String(str??'').replace(/[\u0000-\u001f\u007f]/g,' ').trim().slice(0,max);
const safeUrl=(raw,allowHttp=false)=>{
 try{
  const u=new URL(String(raw||''));
  if(!['https:',...(allowHttp?['http:']:[])].includes(u.protocol)||u.username||u.password)return null;
  return u.href;
 }catch{return null}
};
const yes=v=>v===true||v===1||v==='1';
export function stationSearchParams(code,search='',page=0){
 if(!NAMES.has(code))throw Error('Invalid radio state');
 if(!Number.isInteger(page)||page<0||page>MAX_PAGE)throw Error('Invalid radio page');
 const params=new URLSearchParams({
  countrycode:'US',state:NAMES.get(code),stateExact:'true',
  hidebroken:'true',order:'votes',reverse:'true',limit:String(PAGE+1),offset:String(page*PAGE)
 });
 const q=clean(search,80);
 if(q)params.set('name',q);
 return params;
}
export function normalizeStation(source,code){
 if(!NAMES.has(code)||!source||source.countrycode!=='US')return null;
 const inState=clean(source.state,80).toLowerCase()===NAMES.get(code).toLowerCase()
  ||String(source.iso_3166_2||'').toUpperCase()==='US-'+code;
 if(!inState||!ID.test(String(source.stationuuid||''))||!yes(source.lastcheckok))return null;
 const name=clean(source.name,140);
 if(!name)return null;
 const codec=clean(source.codec,24).toUpperCase();
 const rawStream=safeUrl(source.url_resolved||source.url);
 const canPlayInline=!!rawStream&&!yes(source.hls)&&/^(MP3|AAC|AAC\+|OGG|OPUS)$/.test(codec);
 const checkedAt=/^\d{4}-\d\d-\d\dT/.test(String(source.lastchecktime_iso8601||''))
  ?String(source.lastchecktime_iso8601).slice(0,30):null;
 return {
  id:String(source.stationuuid).toLowerCase(),state:code,name,
  website:safeUrl(source.homepage,true),favicon:safeUrl(source.favicon),
  stream:canPlayInline?rawStream:null,canPlayInline,codec,genre:clean(source.tags,90),
  checkedAt,quality:'Community-check passed; device audio not yet confirmed'
 };
}
const headers=origin=>({
 'Access-Control-Allow-Origin':['https://quantaphi.org','https://www.quantaphi.org'].includes(origin)?origin:'https://quantaphi.org',
 'Access-Control-Allow-Methods':'GET, OPTIONS',
 'Access-Control-Allow-Headers':'Accept, Content-Type',
 'Vary':'Origin','Content-Type':'application/json; charset=utf-8',
 'Cache-Control':'public, max-age=60','X-Content-Type-Options':'nosniff'
});
const json=(body,status,origin)=>new Response(JSON.stringify(body),{status,headers:headers(origin)});
async function queryMirrors(params,fetcher){
 let error='Source temporarily unavailable';
 for(const mirror of MIRRORS){
  try{
   const url=mirror+'/json/stations/search?'+params.toString();
   const r=await fetcher(url,{
    headers:{Accept:'application/json','User-Agent':'QuantaPhi-State-Radio/1.0 (quantaphi.org)'},
    signal:AbortSignal.timeout(9000)
   });
   if(!r.ok)throw Error('Provider HTTP '+r.status);
   const rows=await r.json();
   if(!Array.isArray(rows))throw Error('Provider response is not a station array');
   return rows;
  }catch(e){error=String(e?.message||e).slice(0,120)}
 }
 throw Error(error);
}
export const stateRadioWorker={
 async fetch(request,env,ctx={}){
  const url=new URL(request.url),origin=request.headers.get('Origin')||'';
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:headers(origin)});
  if(request.method!=='GET')return json({error:'method_not_allowed'},405,origin);
  if(url.pathname==='/health')return json({ok:true,source:'Radio Browser',storage:!!env?.RADIO_DB},200,origin);
  if(url.pathname==='/v1/states')return json({states:US_STATES},200,origin);
  if(url.pathname!=='/v1/stations')return json({error:'not_found'},404,origin);
  const code=String(url.searchParams.get('state')||'').toUpperCase();
  const search=clean(url.searchParams.get('q'),80);
  const page=Number(url.searchParams.get('page')||'0');
  let params;
  try{params=stationSearchParams(code,search,page)}catch{return json({error:'invalid_state_or_page'},400,origin)}
  if(!env?.RADIO_DB)return json({error:'station_database_not_configured'},503,origin);
  const now=typeof ctx.now==='function'?ctx.now():Date.now();
  let previous=null;
  try{
   previous=await env.RADIO_DB.prepare('SELECT payload, fetched_at FROM radio_station_pages WHERE state_code=? AND query=? AND page=?')
    .bind(code,search,page).first();
   if(previous&&now-Number(previous.fetched_at)<TTL_MS){
    const data=JSON.parse(previous.payload);
    return json({...data,cached:true,cacheAgeSeconds:Math.floor((now-Number(previous.fetched_at))/1000)},200,origin);
   }
  }catch{return json({error:'station_database_query_failed'},503,origin)}
  let data;
  try{
   const raw=await queryMirrors(params,ctx.fetcher||fetch);
   const stations=raw.slice(0,PAGE).map(row=>normalizeStation(row,code)).filter(Boolean);
   data={state:code,stateName:NAMES.get(code),query:search,page,
    hasMore:raw.length>PAGE,totalKnown:null,stations,
    source:'Radio Browser community database',fetchedAt:new Date(now).toISOString()};
  }catch{
   if(previous){
    try{return json({...JSON.parse(previous.payload),cached:true,stale:true,
      warning:'Station provider unavailable; displaying last saved results.'},200,origin)}catch{}
   }
   return json({error:'radio_directory_source_unavailable'},503,origin);
  }
  try{
   const cacheSql='INSERT INTO radio_station_pages (state_code,query,page,payload,fetched_at) VALUES (?,?,?,?,?) '+
    'ON CONFLICT(state_code,query,page) DO UPDATE SET payload=excluded.payload,fetched_at=excluded.fetched_at';
   await env.RADIO_DB.prepare(cacheSql).bind(code,search,page,JSON.stringify(data),now).run();
   const stationSql='INSERT INTO radio_stations (id,state_code,name,website,favicon,stream_url,codec,genre,checked_at,updated_at,can_play_inline) '+
    'VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET state_code=excluded.state_code,name=excluded.name,'+
    'website=excluded.website,favicon=excluded.favicon,stream_url=excluded.stream_url,codec=excluded.codec,'+
    'genre=excluded.genre,checked_at=excluded.checked_at,updated_at=excluded.updated_at,can_play_inline=excluded.can_play_inline';
   const writes=data.stations.map(s=>env.RADIO_DB.prepare(stationSql)
    .bind(s.id,code,s.name,s.website,s.favicon,s.stream,s.codec,s.genre,s.checkedAt,now,s.canPlayInline?1:0));
   if(writes.length)await env.RADIO_DB.batch(writes);
  }catch{
   return json({...data,cached:false,warning:'Live records loaded; database save needs retry.'},200,origin);
  }
  return json({...data,cached:false},200,origin);
 }
};
export default stateRadioWorker;
