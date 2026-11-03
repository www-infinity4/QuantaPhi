// First-party, anonymous sponsor engagement telemetry. Events are not payments.
const CAMPAIGNS = new Set(['lazercat-2026','illicit-smokos-bruce-banner-2026']);
const PLACEMENTS = new Set(['green-left-arm','green-right-arm','infinity-viewer']);
const KINDS = new Set(['view','click']);
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export async function sponsorEvents(request,env){
  if(!env.SPONSOR_EVENTS_DB)return json({ok:false,error:'sponsor_database_not_bound'},503);
  const url=new URL(request.url);
  if(url.pathname==='/api/sponsor-stats'&&request.method==='GET'){
    const result=await env.SPONSOR_EVENTS_DB.prepare('SELECT campaign, event_type, COUNT(*) AS events FROM sponsor_events GROUP BY campaign,event_type ORDER BY campaign,event_type').all();
    return json({ok:true,counts:result.results||[],note:'Anonymous interactions only; not purchases, earnings, verified users or payable ad traffic.'});
  }
  if(url.pathname!=='/api/sponsor-event')return json({ok:false,error:'not_found'},404);
  if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405);
  // Require same-origin browser requests, not a third-party tracker.
  if(request.headers.get('Origin')!==url.origin)return json({ok:false,error:'origin_not_allowed'},403);
  if(!(request.headers.get('Content-Type')||'').toLowerCase().startsWith('application/json'))return json({ok:false,error:'json_required'},415);
  if(Number(request.headers.get('Content-Length')||0)>1024)return json({ok:false,error:'body_too_large'},413);
  let raw;
  try{raw=await request.text()}catch{return json({ok:false,error:'body_unreadable'},400)}
  if(raw.length>1024)return json({ok:false,error:'body_too_large'},413);
  let data;
  try{data=JSON.parse(raw)}catch{return json({ok:false,error:'invalid_json'},400)}
  const id=String(data?.id||''),campaign=String(data?.campaign||''),event=String(data?.event||''),placement=String(data?.placement||'');
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||!CAMPAIGNS.has(campaign)||!KINDS.has(event)||!PLACEMENTS.has(placement))return json({ok:false,error:'invalid_event'},400);
  try{
    const result=await env.SPONSOR_EVENTS_DB.prepare('INSERT OR IGNORE INTO sponsor_events (event_id,campaign,event_type,placement) VALUES (?1,?2,?3,?4)').bind(id,campaign,event,placement).run();
    return json({ok:true,recorded:Number(result?.meta?.changes||0)===1});
  }catch{return json({ok:false,error:'sponsor_event_storage_failed'},503)}
}
