const CARDS=['search','research','reads','physics','story','images','fred','magoo','media-star','media-builder','bubbles','projects','halloween','shop','radio','media'];
const ACTIONS=['view','click','play','share','collect'];
const ORIGINS=new Set(['https://quantaphi.org','https://www.quantaphi.org']);
export function validate(body){
 if(!body||typeof body.session!=='string'||!/^[-a-zA-Z0-9]{20,64}$/.test(body.session)||!Array.isArray(body.events)||body.events.length>20)throw Error('invalid_events');
 return {session:body.session,events:body.events.map(e=>{if(!e||!CARDS.includes(e.card)||!ACTIONS.includes(e.action))throw Error('invalid_event');return {card:e.card,action:e.action}})};
}
export default {async fetch(request,env){
 const url=new URL(request.url),origin=request.headers.get('Origin');
 const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':ORIGINS.has(origin)?origin:'https://quantaphi.org','Vary':'Origin','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'};
 const reply=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 try{
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
