const CARDS=['search','research','reads','physics','story','images','fred','magoo','media-star','media-builder','bubbles','projects','halloween','shop','radio','media','groups'];
const ACTIONS=['view','click','play','share','collect'];
const ORIGINS=new Set(['https://quantaphi.org','https://www.quantaphi.org']);
export function validate(body){
 if(!body||typeof body.session!=='string'||!/^[-a-zA-Z0-9]{20,64}$/.test(body.session)||!Array.isArray(body.events)||body.events.length>20)throw Error('invalid_events');
 return {session:body.session,events:body.events.map(e=>{if(!e||!CARDS.includes(e.card)||!ACTIONS.includes(e.action))throw Error('invalid_event');return {card:e.card,action:e.action}})};
}
async function dailyReview(env){
 const now=Date.now(),day=new Date(now).toISOString().slice(0,10),minute=Math.floor(now/60000);
 const r=await env.DB.prepare('SELECT card,action,COUNT(*) AS n FROM events WHERE minute>=? GROUP BY card,action').bind(minute-1439).all();
 const cards=CARDS.map(card=>{const rows=r.results.filter(x=>x.card===card);return {card,views:rows.find(x=>x.action==='view')?.n||0,interactions:rows.filter(x=>x.action!=='view').reduce((n,x)=>n+x.n,0)}});
 const candidates=cards.filter(c=>c.views>=20&&c.interactions===0).slice(0,3);
 const report={day,source:'QuantaPhi card events',cards,candidates,minimumViews:20,policy:'Review exposure before popularity. Improve original, vivid stories and usable controls; preserve wallet behavior and drafts. No fabricated crowds or facts.'};
 await env.DB.prepare('INSERT OR IGNORE INTO daily_reviews(day,report,created) VALUES(?,?,?)').bind(day,JSON.stringify(report),now).run();
 if(candidates.length&&env.WORK_DB&&env.OWNER_HASH){
  const id='IW-'+day.replaceAll('-','')+'-DA11A001';
  const jobs=candidates.map((c,i)=>({id:'TASK-'+(i+1),title:'Review low-interaction '+c.card+' card',agent:'greenbeans',color:'green',team:['blueberry','greenbeans','pink-panther','purple-pearl'],status:'queued',repository:'www-infinity4/QuantaPhi',instructions:'Read docs/GROUP_BUILD_BRAIN_BRIEF.md and the actual source. Daily measured evidence: '+JSON.stringify(c)+'. Investigate controls/content and implement one scoped, reversible improvement if evidence supports it. Keep source facts, wallet rules, drafts and anchors intact. Do not infer unpopular from low exposure or invent analytics. Existing reviewed writer only.',acceptance:['Source and interaction evidence explain the improvement','Relevant tests pass and no drafts or wallet behavior regress'],dependencies:[],tools:['Repository source reader','Bounded patch writer','Android browser acceptance'],design:'Oracle Octaves · Android first'}));
  const context={kind:'robot-directions',submission_id:'daily-card-review-'+day,color_jobs:jobs,analytics:report};
  await env.WORK_DB.prepare("INSERT OR IGNORE INTO work_tickets(id,owner_hash,handoff_hash,source_app,source_url,repository,title,request,storyboard,context_json,status,claimed_by,created_at,updated_at,completed_at,handoff_expires_at,result_summary,result_url) VALUES(?,?,?,'QuantaPhi daily card review','https://quantaphi.org/','www-infinity4/QuantaPhi',?,?,?,?,'ready','',?,?,NULL,?,'','')").bind(id,env.OWNER_HASH,crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-',''),'Daily card evidence review '+day,'Owner authorized daily analytics-driven card improvements. Read the durable group-building brief and use only these real aggregate observations.',JSON.stringify(jobs),JSON.stringify(context),now,now,now+30*86400000).run();
 }
 return report;
}
export default {async scheduled(event,env,ctx){ctx.waitUntil(dailyReview(env))},async fetch(request,env){
 const url=new URL(request.url),origin=request.headers.get('Origin');
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':ORIGINS.has(origin)?origin:'https://quantaphi.org','Vary':'Origin','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 try{
 if(request.method==='GET'&&url.pathname==='/daily-review'){const r=await env.DB.prepare('SELECT report FROM daily_reviews ORDER BY day DESC LIMIT 1').first();return reply({ok:true,review:r?JSON.parse(r.report):null})}
 if(request.method==='GET'&&url.pathname==='/summary'){
 const now=Date.now(),minute=Math.floor(now/60000);
 const [live,rows]=await env.DB.batch([
 env.DB.prepare('SELECT COUNT(*) AS n FROM presence WHERE seen >= ?').bind(now-300000),
 env.DB.prepare('SELECT card,action,COUNT(*) AS n FROM events WHERE minute >= ? GROUP BY card,action').bind(minute-1439)]);
 return reply({ok:true,source:'QuantaPhi public card tracking',activeSessions:live.results[0].n,activeWindowMinutes:5,windowHours:24,updatedAt:new Date(now).toISOString(),cards:CARDS.map(id=>({id,...Object.fromEntries(ACTIONS.map(a=>[a,rows.results.find(r=>r.card===id&&r.action===a)?.n||0]))}))});
 }
 if(request.method!=='POST'||url.pathname!=='/events')return reply({ok:false,error:'not_found'},404);
 if(!ORIGINS.has(origin))return reply({ok:false,error:'origin_not_allowed'},403);
 const raw=await request.text();if(raw.length>4096)return reply({ok:false,error:'body_too_large'},413);
 let data;try{data=validate(JSON.parse(raw))}catch{return reply({ok:false,error:'invalid_events'},400)}
 const now=Date.now(),minute=Math.floor(now/60000);
 const existing=await env.DB.prepare('SELECT seen FROM presence WHERE session=?').bind(data.session).first();
 if(existing&&now-existing.seen<5000)return reply({ok:false,error:'rate_limited'},429);
 await env.DB.batch([
 env.DB.prepare('INSERT INTO presence(session,seen) VALUES(?,?) ON CONFLICT(session) DO UPDATE SET seen=excluded.seen').bind(data.session,now),
 ...data.events.map(e=>env.DB.prepare('INSERT OR IGNORE INTO events(session,minute,card,action) VALUES(?,?,?,?)').bind(data.session,minute,e.card,e.action)),
 env.DB.prepare('DELETE FROM presence WHERE seen < ?').bind(now-86400000),
 env.DB.prepare('DELETE FROM events WHERE minute < ?').bind(minute-2880)]);
 return reply({ok:true});
 }catch{return reply({ok:false,error:'tracking_unavailable'},503)}
}};
