/* Executor evidence + Media Star engagement. Independent of the Unified Wallet
 * and Fred's payout ledger: NO HTTP endpoint mints, transfers or spends assets.
 * D1 receipts may only be written by an independently authorized receipt verifier.
 */
const ORIGINS=new Set(['https://quantaphi.org','https://www.quantaphi.org','https://www-infinity4.github.io','http://localhost:8000','http://127.0.0.1:8000']);
const CARDS=['media-star','fred-spaces','following-spaces','media-star-creator'];
const KINDS=['impression','card_click','play_intent'];
const ASSETS=['BUBBLE_BIT','GPT_BIT','GIT','QUANT'];
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const error=(message,status=400)=>Object.assign(new Error(message),{status});
export const eventOriginAllowed=origin=>ORIGINS.has(origin);
export function validateMediaEvent(value){
 if(!value||typeof value!=='object'||Array.isArray(value))throw error('invalid_event');
 const {eventId,sessionId,cardId,kind}=value;
 if(!UUID.test(eventId||'')||!UUID.test(sessionId||'')||!CARDS.includes(cardId)||!KINDS.includes(kind))throw error('invalid_event');
 const placement=value.placement===undefined?'homepage':value.placement;
 if(!['homepage','quick_card','bubbles'].includes(placement))throw error('invalid_placement');
 return {eventId,sessionId,cardId,kind,placement};
}
const safeCount=value=>{
 const n=Number(value);
 if(!Number.isSafeInteger(n)||n<0)throw error('invalid_aggregate',500);
 return n;
};
export function summarizeEarnings(rows){
 const result=Object.fromEntries(ASSETS.map(asset=>[asset,{pending:0,settled:0,receipts:0}]));
 for(const row of rows){
  if(!ASSETS.includes(row.asset)||!['pending','settled'].includes(row.status))throw error('invalid_aggregate',500);
  const units=safeCount(row.units),count=safeCount(row.receipts);
  result[row.asset][row.status]+=units;result[row.asset].receipts+=count;
 }
 return result;
}
export function summarizeMedia(rows){
 const result=Object.fromEntries(CARDS.map(card=>[card,{impressions:0,clickEvents:0,uniqueClicks:0,playIntents:0,ctrPercent:null,salesVerified:null}]));
 for(const row of rows){
  if(!CARDS.includes(row.card_id)||!KINDS.includes(row.kind))throw error('invalid_aggregate',500);
  const count=safeCount(row.events),sessions=safeCount(row.sessions),r=result[row.card_id];
  if(row.kind==='impression')r.impressions=sessions;
  if(row.kind==='card_click'){r.clickEvents=count;r.uniqueClicks=sessions}
  if(row.kind==='play_intent')r.playIntents=count;
 }
 for(const r of Object.values(result)){
  if(r.impressions>0&&r.uniqueClicks<=r.impressions)r.ctrPercent=Math.round(1000*r.uniqueClicks/r.impressions)/10;
 }
 return result;
}
function json(req,value,status=200){
 const origin=req.headers.get('Origin')||'';
 const headers={'Content-Type':'application/json;charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
 if(eventOriginAllowed(origin)){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Headers']='Authorization, Content-Type';headers['Access-Control-Allow-Methods']='GET, POST, OPTIONS';}
 return Response.json(value,{status,headers});
}
async function authOwner(req,env){
 const token=/^Bearer (sq_[A-Za-z0-9_-]{32,})$/.exec(req.headers.get('Authorization')||'');
 if(!token)throw error('wallet_login_required',401);
 if(!env.IDENTITY_DB)throw error('identity_binding_unavailable',503);
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token[1]));
 const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
 const owner=await env.IDENTITY_DB.prepare('SELECT a.id FROM accounts a JOIN account_devices d ON d.account_id=a.id WHERE d.token_hash=?1').bind(hash).first();
 if(!owner?.id)throw error('invalid_wallet_session',401);
 return owner.id;
}
async function readSummary(req,env){
 if(!env.DB)throw error('executor_db_unavailable',503);
 const owner=await authOwner(req,env);
 const earnings=await env.DB.prepare('SELECT asset,status,COALESCE(SUM(units),0) AS units,COUNT(*) AS receipts FROM executor_income_evidence WHERE owner_id=?1 GROUP BY asset,status').bind(owner).all();
 // A card owner is configured server-side, never selected by a visitor's event.
 let media=null;
 if(env.MEDIA_STAR_OWNER_ID&&owner===env.MEDIA_STAR_OWNER_ID){
  const since=Date.now()-30*86400000;
  const stats=await env.DB.prepare('SELECT card_id,kind,COUNT(*) AS events,COUNT(DISTINCT session_id) AS sessions FROM media_star_events WHERE owner_id=?1 AND created_at>=?2 GROUP BY card_id,kind').bind(owner,since).all();
  media=summarizeMedia(stats.results||[]);
 }
 return json(req,{ok:true,scope:'wallet_authenticated',periodDays:30,earnings:summarizeEarnings(earnings.results||[]),mediaStar:media,attributionOnly:true,spendableBalanceProvided:false,cashIncomeProvided:false,checkedAt:Date.now()});
}
async function recordEvent(req,env){
 if(!eventOriginAllowed(req.headers.get('Origin')||''))throw error('origin_not_allowed',403);
 if(!env.DB||!env.MEDIA_STAR_OWNER_ID)throw error('insights_not_configured',503);
 if(!req.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))throw error('json_required',415);
 if(Number(req.headers.get('Content-Length')||0)>512)throw error('event_too_large',413);
 const raw=await req.text();
 if(raw.length>512)throw error('event_too_large',413);
 let value;try{value=JSON.parse(raw)}catch{throw error('invalid_json')}
 const event=validateMediaEvent(value);
 const score=req.cf?.botManagement?.score;
 if(Number.isFinite(score)&&score<20)throw error('bot_traffic_rejected',403);
 // Privacy: no IP, email, cookie, browser fingerprint or source URL retained.
 // sessionId is random, per-session and can be cleared by the viewer.
 const result=await env.DB.prepare('INSERT OR IGNORE INTO media_star_events(event_id,owner_id,session_id,card_id,kind,placement,quality,created_at) VALUES(?1,?2,?3,?4,?5,?6,?7,?8)')
  .bind(event.eventId,env.MEDIA_STAR_OWNER_ID,event.sessionId,event.cardId,event.kind,event.placement,'browser_observed',Date.now()).run();
 return json(req,{ok:true,recorded:Number(result.meta?.changes||0)===1,classification:'browser_observed_not_verified_human'},202);
}
export default {async fetch(req,env){
 try{
  const path=new URL(req.url).pathname;
  if(req.method==='OPTIONS'&&eventOriginAllowed(req.headers.get('Origin')||''))return json(req,{ok:true},204);
  if(req.method==='GET'&&path==='/health')return json(req,{ok:true,service:'executor-insights',walletSettlement:false,clickTrackingConfigured:Boolean(env.DB&&env.MEDIA_STAR_OWNER_ID)});
  if(req.method==='GET'&&path==='/v1/executor/summary')return await readSummary(req,env);
  if(req.method==='POST'&&path==='/v1/media-star/event')return await recordEvent(req,env);
  return json(req,{ok:false,error:'not_found'},404);
 }catch(e){return json(req,{ok:false,error:e.message||'service_error'},e.status||500)}
}};
