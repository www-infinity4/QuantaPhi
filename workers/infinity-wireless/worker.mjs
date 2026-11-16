/* Bubbles / Infinity Wireless: planning-request intake only.
 * Durable D1 receipts do not provision radio, SIMs, towers or Internet service.
 * No contact details, exact locations, account tokens, payments or carrier credentials.
 */
const ORIGIN='https://quantaphi.org';
const STATES=new Set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split(' '));
const GOALS=new Set(['home','community','business','pilot']);
const BACKHAUL=new Set(['unknown','fiber','fixed-wireless','carrier-partner']);
const hex64=/^[a-f0-9]{64}$/;
const allowed=new Set(['city','state','goal','backhaul','acceptedPlanningOnly','requestKey']);
const json=(value,status=200)=>Response.json(value,{status,headers:{
 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',
 'Access-Control-Allow-Origin':ORIGIN,'Vary':'Origin'
}});
export function validateOrder(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return {error:'Invalid order object.'};
 if(Object.keys(input).some(k=>!allowed.has(k)))return {error:'Unknown fields are not accepted.'};
 const {city,state,goal,backhaul,acceptedPlanningOnly,requestKey}=input;
 if(typeof city!=='string'||city!==city.trim()||!/^[A-Za-z][A-Za-z .'-]{1,59}$/.test(city)||/\b(street|road|avenue|drive|lane|boulevard|apt|suite|unit)\b/i.test(city))
  return {error:'Enter a city only, without a street address or personal information.'};
 if(typeof state!=='string'||!STATES.has(state))return {error:'Select a valid two-letter U.S. state.'};
 if(!GOALS.has(goal)||!BACKHAUL.has(backhaul))return {error:'Select a valid connection goal and possible backhaul.'};
 if(acceptedPlanningOnly!==true)return {error:'Confirm this is a planning request, not an active connection.'};
 if(typeof requestKey!=='string'||!hex64.test(requestKey))return {error:'A secure order key is required.'};
 return {order:{city,state,goal,backhaul},requestKey};
}
export function publicReceipt(row,events=[]){
 return {ok:true,id:row.id,city:row.city,state:row.state,goal:row.goal,
  proposedBackhaul:row.backhaul,createdAt:row.created_at,phase:'request_recorded',
  eligibility:'requires_operator_site_review',coverageVerified:false,serviceActive:false,
  dispatchStatus:'no_infrastructure_dispatch',events,
  notice:'Bubbles recorded a planning request. No radio, tower, SIM or Internet service was activated.'};
}
async function sha256(value){
 const bytes=new TextEncoder().encode(value);
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
function trustedOrigin(req){const o=req.headers.get('Origin');return o===ORIGIN||o==='https://www.quantaphi.org';}
async function loadReceipt(db,id,tokenHash){
 const row=await db.prepare('SELECT id,city,state,goal,backhaul,created_at FROM wireless_orders WHERE id=? AND token_hash=?').bind(id,tokenHash).first();
 if(!row)return null;
 const events=await db.prepare('SELECT kind,at,source FROM wireless_events WHERE order_id=? ORDER BY at,kind').bind(id).all();
 return publicReceipt(row,events.results||[]);
}
export default {async fetch(req,env={}){
 const url=new URL(req.url),p=url.pathname,method=req.method;
 if(method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':ORIGIN,'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization','Vary':'Origin','Cache-Control':'no-store'}});
 if(p==='/api/wireless/health'&&method==='GET'){
  if(!env.WIRELESS_DB)return json({ok:false,error:'storage_unavailable'},503);
  try{await env.WIRELESS_DB.prepare('SELECT COUNT(*) AS n FROM wireless_orders').first();
   return json({ok:true,service:'infinity-wireless-intake',storage:'connected',serviceActive:false});
  }catch{return json({ok:false,error:'schema_unavailable'},503)}
 }
 if(p==='/api/wireless/orders'&&method==='POST'){
  if(!trustedOrigin(req))return json({ok:false,error:'Open the official QuantaPhi page to issue a request.'},403);
  if(!String(req.headers.get('content-type')||'').toLowerCase().includes('application/json'))return json({ok:false,error:'JSON required.'},415);
  const raw=await req.text();
  if(raw.length>1500)return json({ok:false,error:'Request too large.'},413);
  let body;try{body=JSON.parse(raw)}catch{return json({ok:false,error:'Invalid JSON.'},400)}
  const valid=validateOrder(body);if(valid.error)return json({ok:false,error:valid.error},400);
  if(!env.WIRELESS_DB||!env.RATE_SALT)return json({ok:false,error:'Order intake is not configured.'},503);
  const db=env.WIRELESS_DB;
  try{
   const hash=await sha256(valid.requestKey),id='IW-'+hash.slice(0,20).toUpperCase();
   const existing=await loadReceipt(db,id,hash);
   if(existing){
    if(existing.city!==valid.order.city||existing.state!==valid.order.state||existing.goal!==valid.order.goal||existing.proposedBackhaul!==valid.order.backhaul)
     return json({ok:false,error:'This request key was already used for a different order.'},409);
    return json(existing,200);
   }
   const ip=req.headers.get('CF-Connecting-IP');
   if(!ip)return json({ok:false,error:'Cannot verify submission rate limit.'},503);
   const at=new Date().toISOString(),day=at.slice(0,10),ipHash=await sha256(env.RATE_SALT+'|'+day+'|'+ip);
   const limit=await db.prepare('INSERT INTO wireless_daily_limits(day,ip_hash,count) VALUES (?,?,1) ON CONFLICT(day,ip_hash) DO UPDATE SET count=count+1 RETURNING count').bind(day,ipHash).first();
   if(Number(limit?.count)>5)return json({ok:false,error:'Daily planning request limit reached. Please try another day.'},429);
   const v=valid.order;
   await db.batch([
    db.prepare('INSERT OR IGNORE INTO wireless_orders(id,token_hash,city,state,goal,backhaul,created_at) VALUES (?,?,?,?,?,?,?)').bind(id,hash,v.city,v.state,v.goal,v.backhaul,at),
    db.prepare('INSERT OR IGNORE INTO wireless_events(order_id,kind,at,source) VALUES (?,?,?,?)').bind(id,'request_received',at,'server_d1_write'),
    db.prepare('INSERT OR IGNORE INTO wireless_events(order_id,kind,at,source) VALUES (?,?,?,?)').bind(id,'preliminary_screening_pending',at,'unverified_customer_input')
   ]);
   const receipt=await loadReceipt(db,id,hash);
   if(!receipt)return json({ok:false,error:'Unable to confirm order was recorded.'},503);
   return json(receipt,201);
  }catch{return json({ok:false,error:'Order intake temporarily unavailable. No confirmed receipt was issued.'},503)}
 }
 const match=p.match(/^\/api\/wireless\/orders\/(IW-[A-F0-9]{20})$/);
 if(match&&method==='GET'){
  const header=req.headers.get('Authorization')||'',token=header.startsWith('Bearer ')?header.slice(7):'';
  if(!hex64.test(token))return json({ok:false,error:'Order tracking key required.'},401);
  if(!env.WIRELESS_DB)return json({ok:false,error:'Order storage unavailable.'},503);
  try{
   const hash=await sha256(token);
   if(match[1]!=='IW-'+hash.slice(0,20).toUpperCase())return json({ok:false,error:'Order not found.'},404);
   const receipt=await loadReceipt(env.WIRELESS_DB,match[1],hash);
   return receipt?json(receipt):json({ok:false,error:'Order not found.'},404);
  }catch{return json({ok:false,error:'Tracking unavailable.'},503)}
 }
 return json({ok:false,error:'Route not found.'},404);
},
async scheduled(event,env={}){
 if(!env.WIRELESS_DB)throw Error('wireless_retention_binding_unavailable');
 const now=Number.isFinite(event?.scheduledTime)?event.scheduledTime:Date.now();
 const expired=new Date(now-30*24*60*60*1000).toISOString();
 const oldBuckets=new Date(now-2*24*60*60*1000).toISOString().slice(0,10);
 // Child events before parent rows; only 30+ day pending planning records expire.
 await env.WIRELESS_DB.prepare('DELETE FROM wireless_events WHERE order_id IN (SELECT id FROM wireless_orders WHERE created_at < ?)').bind(expired).run();
 await env.WIRELESS_DB.prepare('DELETE FROM wireless_orders WHERE created_at < ?').bind(expired).run();
 await env.WIRELESS_DB.prepare('DELETE FROM wireless_daily_limits WHERE day < ?').bind(oldBuckets).run();
}};
