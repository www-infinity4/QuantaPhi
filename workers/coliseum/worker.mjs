import {BETA_CAPACITY,clean,validModel,validSector,validIdea,validMessage,allowsOrigin,editionPolicy,publicMemberLabel} from '../../coliseum/room-api-core.mjs';
/* Independent Infinity Coliseum beta API, NOT an OpenAI model.
 * Starts disabled and requires a real StarQuest device credential, D1 migration,
 * a 32+ character member pseudonymization secret, and explicit beta allowlist.
 * No paid plan, token minting or AI replies are implemented here. */
const ACCOUNT_STATE='https://starquest-ledger.marvaseater.workers.dev/v1/state';
const ALLOW_HEADERS='authorization,content-type';
function reply(req,data,status=200){
 const origin=req.headers.get('origin')||'';
 const h=new Headers({'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','vary':'Origin'});
 if(allowsOrigin(origin)){h.set('access-control-allow-origin',origin);h.set('access-control-allow-methods','GET,POST,OPTIONS');h.set('access-control-allow-headers',ALLOW_HEADERS);h.set('access-control-max-age','600');}
 return new Response(JSON.stringify(data),{status,headers:h});
}
function error(req,code,status){return reply(req,{ok:false,error:code},status)}
const ready=env=>Boolean(env?.COLISEUM_DB&&typeof env.MEMBER_PEPPER==='string'&&env.MEMBER_PEPPER.length>=32&&env.OPEN_COLISEUM_BETA==='true'&&String(env.BETA_ALLOWED_MEMBERS||'').trim());
const sql=async(statement,...params)=>statement.bind(...params).run();
async function stateUser(req){
 const header=req.headers.get('authorization')||'';
 if(!/^Bearer sq_[A-Za-z0-9_-]{32,}$/.test(header))throw Error('signin_required');
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
 try{
  const res=await fetch(ACCOUNT_STATE,{headers:{authorization:header,'accept':'application/json'},cache:'no-store',signal:controller.signal,redirect:'error'});
  if(!res.ok)throw Error('wallet_verification_failed');
  const data=await res.json();
  const username=String(data?.state?.username||'').trim().toLowerCase();
  if(!data?.ok||!data?.state||!(/^[a-z0-9_.-]{2,64}$/.test(username)))throw Error('wallet_verification_failed');
  return username;
 }finally{clearTimeout(timer)}
}
async function pseudonym(username,pepper){
 const h=await crypto.subtle.importKey('raw',new TextEncoder().encode(pepper),'HMAC',{hash:'SHA-256'},false,['sign']);
 const digest=await crypto.subtle.sign('HMAC',h,new TextEncoder().encode(username));
 return [...new Uint8Array(digest)].slice(0,16).map(x=>x.toString(16).padStart(2,'0')).join('');
}
async function authenticated(req,env){
 const user=await stateUser(req),member=await pseudonym(user,env.MEMBER_PEPPER);
 const allowed=new Set(String(env.BETA_ALLOWED_MEMBERS||'').split(',').map(x=>x.trim()).filter(Boolean));
 if(!allowed.has(member))throw Error('beta_invitation_required');
 return member;
}
async function readBody(req){
 const raw=await req.text();
 if(raw.length>4000)throw Error('payload_too_large');
 try{const b=JSON.parse(raw);if(!b||Array.isArray(b)||typeof b!=='object')throw 0;return b}
 catch{throw Error('invalid_json')}
}
async function joined(db,modelId,member){
 const row=await db.prepare('SELECT 1 AS yes FROM coliseum_members WHERE model_id=? AND member_id=?').bind(modelId,member).first();
 return Boolean(row?.yes);
}
async function limit(db,member,action,max){
 const minute=Math.floor(Date.now()/60000);
 const result=await sql(db.prepare('INSERT INTO coliseum_rates (member_id,action,minute,count) VALUES (?,?,?,1) ON CONFLICT(member_id,action,minute) DO UPDATE SET count=count+1 WHERE count < ?'),member,action,minute,max);
 if(!result?.meta?.changes)throw Error('slow_down');
}
const validID=s=>typeof s==='string'&&/^[0-9a-f-]{36}$/.test(s);
async function handler(req,env){
 const url=new URL(req.url),path=url.pathname;
 if(req.method==='OPTIONS'){
  if(!allowsOrigin(req.headers.get('origin')||''))return error(req,'origin_not_allowed',403);
  return reply(req,{ok:true});
 }
 if(req.method==='POST'&&!allowsOrigin(req.headers.get('origin')||''))return error(req,'origin_not_allowed',403);
 if(path==='/v1/health'&&req.method==='GET')return reply(req,{ok:true,service:'Infinity Coliseum',betaEnabled:ready(env),liveRooms:ready(env)});
 if(path==='/v1/models'&&req.method==='GET')return reply(req,{ok:true,edition:'Infinity 2026',betaEnabled:ready(env),models:[
  {id:'zeus',version:'6.2',free:true,cap:BETA_CAPACITY},
  {id:'hermes',version:'6.6',free:true,cap:BETA_CAPACITY},
  {id:'athena',version:'7.0',free:false,enabled:false,proposedPrice:23},
  {id:'hephaestus',version:'7.3',free:false,enabled:false,proposedPrice:100}
 ]});
 if(!ready(env))return error(req,'beta_not_enabled',503);
 const db=env.COLISEUM_DB;
 let member;
 try{member=await authenticated(req,env)}
 catch(e){return error(req,e.message==='beta_invitation_required'?'beta_invitation_required':'signin_required',403)}
 try{
  if(path==='/v1/me'&&req.method==='GET'){
   const memberships=await db.prepare('SELECT model_id FROM coliseum_members WHERE member_id=?').bind(member).all();
   return reply(req,{ok:true,handle:publicMemberLabel(member),joined:(memberships.results||[]).map(x=>x.model_id)});
  }
  if(path==='/v1/join'&&req.method==='POST'){
   const b=await readBody(req),policy=editionPolicy(b.modelId);
   if(!policy.allowed)return error(req,policy.reason,400);
   await limit(db,member,'join',10);
   await sql(db.prepare('INSERT INTO coliseum_members (model_id,member_id,joined_at) SELECT ?,?,? WHERE (SELECT COUNT(*) FROM coliseum_members WHERE model_id=?) < ? ON CONFLICT DO NOTHING'),
    b.modelId,member,new Date().toISOString(),b.modelId,BETA_CAPACITY);
   if(!await joined(db,b.modelId,member))return error(req,'edition_full',409);
   const count=await db.prepare('SELECT COUNT(*) AS n FROM coliseum_members WHERE model_id=?').bind(b.modelId).first();
   return reply(req,{ok:true,modelId:b.modelId,handle:publicMemberLabel(member),memberCount:Number(count?.n||0),cap:BETA_CAPACITY});
  }
  if((path==='/v1/ideas'||path==='/v1/messages')&&req.method==='GET'){
   const modelId=url.searchParams.get('modelId'),sector=url.searchParams.get('sector');
   if(!validModel(modelId)||!validSector(sector))return error(req,'invalid_room',400);
   if(!await joined(db,modelId,member))return error(req,'join_room_first',403);
   const table=path==='/v1/ideas'?'coliseum_ideas':'coliseum_messages';
   const fields=table==='coliseum_ideas'?'id,parent_id,model_id,sector,member_id,title,description,created_at':'id,model_id,sector,member_id,text,created_at';
   const count=table==='coliseum_ideas'?40:50;
   const query=await db.prepare('SELECT '+fields+' FROM '+table+' WHERE model_id=? AND sector=? ORDER BY created_at DESC LIMIT '+count).bind(modelId,sector).all();
   const rows=(query.results||[]).map(({member_id,...r})=>({...r,author:publicMemberLabel(member_id)}));
   return reply(req,{ok:true,modelId,sector,items:rows});
  }
  if(path==='/v1/ideas'&&req.method==='POST'){
   const b=await readBody(req);
   if(!validIdea(b))return error(req,'invalid_idea',400);
   if(!await joined(db,b.modelId,member))return error(req,'join_room_first',403);
   await limit(db,member,'ideas',3);
   const id=crypto.randomUUID();
   await sql(db.prepare('INSERT INTO coliseum_ideas (id,model_id,sector,member_id,title,description,parent_id,created_at) VALUES (?,?,?,?,?,?,NULL,?)'),
    id,b.modelId,b.sector,member,clean(b.title,110),clean(b.description,1800),new Date().toISOString());
   return reply(req,{ok:true,id,posted:true},201);
  }
  if(path==='/v1/messages'&&req.method==='POST'){
   const b=await readBody(req);
   if(!validMessage(b))return error(req,'invalid_message',400);
   if(!await joined(db,b.modelId,member))return error(req,'join_room_first',403);
   await limit(db,member,'messages',8);
   const id=crypto.randomUUID();
   await sql(db.prepare('INSERT INTO coliseum_messages (id,model_id,sector,member_id,text,created_at) VALUES (?,?,?,?,?,?)'),
    id,b.modelId,b.sector,member,clean(b.text,1000),new Date().toISOString());
   return reply(req,{ok:true,id,posted:true},201);
  }
  if(path==='/v1/vote'&&req.method==='POST'){
   const b=await readBody(req);
   if(!validID(b.ideaId)||!['support','question'].includes(b.position))return error(req,'invalid_vote',400);
   const idea=await db.prepare('SELECT model_id FROM coliseum_ideas WHERE id=?').bind(b.ideaId).first();
   if(!idea)return error(req,'idea_not_found',404);
   if(!await joined(db,idea.model_id,member))return error(req,'join_room_first',403);
   await limit(db,member,'votes',12);
   const result=await sql(db.prepare('INSERT INTO coliseum_votes (idea_id,member_id,position,created_at) VALUES (?,?,?,?) ON CONFLICT DO NOTHING'),
    b.ideaId,member,b.position,new Date().toISOString());
   const votes=await db.prepare("SELECT position,COUNT(*) AS n FROM coliseum_votes WHERE idea_id=? GROUP BY position").bind(b.ideaId).all();
   return reply(req,{ok:true,accepted:Boolean(result?.meta?.changes),totals:Object.fromEntries((votes.results||[]).map(x=>[x.position,Number(x.n)]))});
  }
  if(path==='/v1/branch'&&req.method==='POST'){
   const b=await readBody(req);
   if(!validID(b.ideaId))return error(req,'invalid_parent_idea',400);
   const source=await db.prepare('SELECT model_id,sector,title,description FROM coliseum_ideas WHERE id=?').bind(b.ideaId).first();
   if(!source)return error(req,'idea_not_found',404);
   if(!await joined(db,source.model_id,member))return error(req,'join_room_first',403);
   await limit(db,member,'branch',3);
   const id=crypto.randomUUID();
   const title=clean(source.title+' — New Direction',110);
   await sql(db.prepare('INSERT INTO coliseum_ideas (id,model_id,sector,member_id,title,description,parent_id,created_at) VALUES (?,?,?,?,?,?,?,?)'),
    id,source.model_id,source.sector,member,title,source.description,b.ideaId,new Date().toISOString());
   return reply(req,{ok:true,id,parentId:b.ideaId},201);
  }
  return error(req,'not_found',404);
 }catch(e){
  const simple=String(e.message||'');
  if(['payload_too_large','invalid_json'].includes(simple))return error(req,simple,400);
  if(simple==='slow_down')return error(req,simple,429);
  return error(req,'service_unavailable',503);
 }
}
export default {fetch:handler};
