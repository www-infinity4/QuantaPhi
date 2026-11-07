/* Isolated Trend-to-Card Cloudflare D1 Worker. Scheduled intake ≠ live AI bots.
 * No wallet writes, payment endpoints, model-generated publication or unapproved scraping.
 */
import {BOT_ROLES,canPublishCard} from '../../trend-card-core.mjs';
const FEED='https://trends.google.com/trending/rss?geo=US';
const LIMIT=750000;
const send=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'no-store','Access-Control-Allow-Origin':'https://quantaphi.org','Vary':'Origin'}});
const decode=s=>String(s||'').replace(/^<!\[CDATA\[|\]\]>$/g,'').replace(/&#(x[0-9a-f]+|\d+);|&(amp|lt|gt|quot|apos);/gi,(_,n,e)=>{
 if(e)return ({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"})[e.toLowerCase()]||'';
 const cp=n.startsWith('x')?parseInt(n.slice(1),16):parseInt(n,10);
 return cp>0&&cp<=0x10ffff?String.fromCodePoint(cp):'';
}).replace(/<[^>]*>/g,'').trim();
const tag=(part,name)=>decode(part.match(new RegExp('<(?:[\\w-]+:)?'+name+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:[\\w-]+:)?'+name+'>','i'))?.[1]||'');
export function parseGoogleTrendRss(xml,checkedAt){
 if(typeof xml!=='string'||xml.length>LIMIT||!xml.includes('<rss'))return [];
 const out=[],seen=new Set();
 for(const [,part] of xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)){
  if(out.length>=60)break;
  const query=tag(part,'title').slice(0,160),source_url=tag(part,'link'),traffic=tag(part,'approx_traffic');
  let url;try{url=new URL(source_url)}catch{continue}
  if(url.protocol!=='https:'||url.hostname!=='trends.google.com'||!query||seen.has(query.toLowerCase()))continue;
  seen.add(query.toLowerCase());
  out.push({query,source_url,approx_searches:/^\d[\d,.]*[KMB]?\+$/i.test(traffic)?traffic:'unknown',checked_at:checkedAt});
 }
 return out;
}
export const runKey=iso=>'trend-card-'+String(iso).slice(0,10);
export function workOrdersForRun(batchId){
 const depends={gpt:null,yellow:'gpt',orange:'yellow',blue:'orange',green:'blue',red:'green',purple:null,silver:'red'};
 return BOT_ROLES.map(({id,job})=>({id:batchId+':'+id,batch_id:batchId,role:id,objective:job,depends_on:depends[id],state:'queued',lease_owner:null}));
}
async function enqueue(db,now){
 for(const j of workOrdersForRun(runKey(now))){
  await db.prepare("INSERT OR IGNORE INTO continuity_jobs (id,batch_id,role,objective,depends_on,state,created_at,updated_at) VALUES (?,?,?,?,?,'queued',?,?)")
    .bind(j.id,j.batch_id,j.role,j.objective,j.depends_on,now,now).run();
 }
}
async function importTrends(db,now){
 const r=await fetch(FEED,{headers:{Accept:'application/rss+xml'},signal:AbortSignal.timeout(14000)});
 if(!r.ok||Number(r.headers.get('content-length')||0)>LIMIT)throw Error('Google Trends unavailable or too large');
 const rows=parseGoogleTrendRss(await r.text(),now);
 if(!rows.length)throw Error('No verified RSS entries; no invented cards');
 for(const item of rows){
  await db.prepare("INSERT INTO trend_signals(query,source_url,approx_searches,checked_at,source) VALUES (?,?,?,?,'google-trends-rss') ON CONFLICT(query) DO UPDATE SET source_url=excluded.source_url,approx_searches=excluded.approx_searches,checked_at=excluded.checked_at")
   .bind(item.query,item.source_url,item.approx_searches,item.checked_at).run();
 }
 return rows.length;
}
async function revive(db,now){
 const t=Math.floor(Date.parse(now)/1000);
 await db.prepare("UPDATE continuity_jobs SET state='queued',lease_owner=NULL,lease_until=NULL,updated_at=?,last_error='Lease expired; work preserved' WHERE state='running' AND lease_until<? AND attempts<4").bind(now,t).run();
 await db.prepare("UPDATE continuity_jobs SET state='blocked',lease_owner=NULL,lease_until=NULL,updated_at=?,last_error='Retry limit reached; manual review' WHERE state='running' AND lease_until<? AND attempts>=4").bind(now,t).run();
}
function authorized(req,token){
 if(typeof token!=='string'||token.length<24)return false;
 const actual=req.headers.get('Authorization')||'',expected='Bearer '+token;
 if(actual.length!==expected.length)return false;
 let miss=0;for(let i=0;i<expected.length;i++)miss|=actual.charCodeAt(i)^expected.charCodeAt(i);
 return miss===0;
}
async function featured(db,clock){
 const res=await db.prepare("SELECT s.*, d.role,d.status,d.quant_ai_receipt,d.approved_at FROM source_items s JOIN orange_decisions d ON d.source_id=s.id WHERE d.status='approved' AND d.role='orange' AND s.state='source_verified' ORDER BY d.approved_at DESC LIMIT 30").all();
 const out=[];
 for(const row of res.results||[]){
  let tags;try{tags=JSON.parse(row.tags||'[]')}catch{continue}
  const item={...row,tags,media_rights_verified:row.media_rights_verified===1,card_tests_passed:row.card_tests_passed===1};
  const decision={role:row.role,status:row.status,source_id:row.id,quant_ai_receipt:row.quant_ai_receipt,approved_at:row.approved_at};
  if(!canPublishCard(item,decision,Date.parse(clock)))continue;
  out.push({id:row.id,title:row.title,artist:row.artist,category:row.category,source_url:row.source_url,destination_url:row.destination_url,label:'Related discovery · not a paid advertisement',checked_at:row.checked_at,approved_at:row.approved_at});
 }
 return out.slice(0,12);
}
export default {
 async fetch(request,env){
  const path=new URL(request.url).pathname;
  if(path==='/health'&&request.method==='GET')return send({ok:true,db_connected:!!env.TREND_DB,quant_ai_configured:typeof env.QUANT_AI?.fetch==='function',active_bots:0,worker_queue:'not_a_live_agent_runner'});
  // Orange must be verified by a trusted server identity AND a real Quant AI receipt.
  // Approval remains deliberately unavailable until the upstream receipt contract is wired.
  if(path==='/orange/approve')return send({ok:false,error:'quant_ai_receipt_verification_not_configured'},503);
  if(!env.TREND_DB)return send({ok:false,error:'TREND_DB_not_configured'},503);
  if(path==='/featured'&&request.method==='GET')return send({ok:true,items:await featured(env.TREND_DB,new Date().toISOString())});
  if(path==='/jobs'&&request.method==='GET'){
   if(!authorized(request,env.OPERATOR_TOKEN))return send({ok:false,error:'unauthorized'},401);
   const jobs=await env.TREND_DB.prepare('SELECT id,batch_id,role,objective,depends_on,state,attempts,updated_at,last_error FROM continuity_jobs ORDER BY updated_at DESC LIMIT 80').all();
   return send({ok:true,jobs:jobs.results||[]});
  }
  return send({ok:false,error:'not_found'},404);
 },
 async scheduled(_event,env){
  if(!env.TREND_DB?.prepare)throw Error('TREND_DB is required; no fake successful import');
  const now=new Date().toISOString(),db=env.TREND_DB;
  await enqueue(db,now);await revive(db,now);
  return await importTrends(db,now);
 }
};
