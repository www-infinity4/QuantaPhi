/* Read-only, first-party station catalogue. No scraping, ad injection, or audio rehosting. */
const US_STATES = new Set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' '));
export const validState = state => state==='all' || state==='WORLD' || US_STATES.has(state);
const headers = {'Content-Type':'application/json; charset=utf-8','Cache-Control':'public, max-age=120','X-Content-Type-Options':'nosniff'};
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});

export default {
 async fetch(request,env){
  const url=new URL(request.url);
  if(url.pathname!=='/api/radio-stations')return reply({error:'not_found'},404);
  if(request.method!=='GET'&&request.method!=='HEAD')
   return new Response(JSON.stringify({error:'read_only'}),{status:405,headers:{...headers,Allow:'GET, HEAD'}});
  const state=url.searchParams.get('state')??'all';
  if(!validState(state))return reply({error:'invalid_state'},400);
  if(!env?.RADIO_STATIONS_D1)return reply({error:'directory_not_configured'},503);
  if(request.method==='HEAD')return new Response(null,{status:200,headers});
  const fields='id,name,state_code,frequency,genre,city,player,source_url,stream_url,low_stream_url,schedule_url,playback_checked_at';
  const where="status IN ('listed','verified')";
  const q=state==='all'
   ? env.RADIO_STATIONS_D1.prepare(`SELECT ${fields} FROM radio_stations WHERE ${where} ORDER BY state_code,name LIMIT 250`)
   : env.RADIO_STATIONS_D1.prepare(`SELECT ${fields} FROM radio_stations WHERE ${where} AND state_code = ? ORDER BY name LIMIT 100`).bind(state);
  try {
   const rows=(await q.all()).results||[];
   return reply({schemaVersion:1,source:'curated_broadcaster_sources',state,count:rows.length,
    stations:rows.map(r=>({id:r.id,name:r.name,state:r.state_code,frequency:r.frequency,type:r.genre,city:r.city,
     player:r.player,url:r.source_url,stream:r.stream_url||null,low:r.low_stream_url||null,
     schedule:r.schedule_url||null,playbackVerified:Boolean(r.playback_checked_at)}))});
  } catch {
   return reply({error:'directory_temporarily_unavailable'},503);
  }
 }
};
