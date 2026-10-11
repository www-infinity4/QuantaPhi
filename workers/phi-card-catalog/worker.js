/* Phi Card Catalog multi-tenant content API. No token minting, payouts, or automatic DB creation. */
const OWN_ORIGIN='https://quantaphi.org';
const PUBLISHABLE=new Set(['search-engine','search-viewer','reads-realms','asteroid','scholastic-reader','story-writer','image-builder','radio','media-card','code-workshop','website-builder','bubbles-ai','news-reader']);
const now=()=>Date.now();
const text=(v,n=160)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,n);
const safeLink=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href.slice(0,1800):''}catch{return''}};
const failure=(reason,status=400)=>Object.assign(new Error(reason),{status});
const json=(data,status=200,origin='')=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':origin||OWN_ORIGIN,'Vary':'Origin'}});
const publicJson=(data,status=200)=>{const r=json(data,status,'*');return r};
async function body(request){
 if(Number(request.headers.get('Content-Length')||0)>16000)throw failure('request_too_large',413);
 const raw=await request.text();if(raw.length>16000)throw failure('request_too_large',413);
 try{return JSON.parse(raw)}catch{throw failure('invalid_json')}
}
function originURL(value){try{const u=new URL(value);return u.protocol==='https:'?u.origin:''}catch{return''}}
async function userId(request,env){
 const bearer=request.headers.get('Authorization')||'';
 const match=/^Bearer\s+(sq_[A-Za-z0-9_-]{32,})$/.exec(bearer);
 if(!match)throw failure('authentication_required',401);
 if(!env.IDENTITY_DB)throw failure('identity_unavailable',503);
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(match[1]));
 const hash=[...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
 const id=await env.IDENTITY_DB.prepare('SELECT a.id AS id FROM accounts a JOIN account_devices d ON a.id=d.account_id WHERE d.token_hash=?').bind(hash).first();
 if(!id)throw failure('invalid_device',401);
 return id.id;
}
async function site(env,siteId,owner){
 const row=await env.DB.prepare("SELECT id,name,origin,slug FROM card_sites WHERE id=? AND owner_id=? AND status='active'").bind(siteId,owner).first();
 if(!row)throw failure('site_not_owned',404);return row;
}
function idPart(value){const s=String(value||'');if(!/^[a-zA-Z0-9_-]{1,100}$/.test(s))throw failure('invalid_id');return s}
function makeId(){return crypto.randomUUID()}
async function handle(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(request.method==='OPTIONS'){
  if(request.headers.get('Origin')!==OWN_ORIGIN)return new Response(null,{status:403});
  return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':OWN_ORIGIN,'Access-Control-Allow-Headers':'Authorization,Content-Type','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'}});
 }
 if(path==='/health'&&request.method==='GET')return json({ok:true,service:'phi-card-catalog',paidCheckout:false,isolatedTenants:true});
 if(!env.DB)return json({error:'database_unavailable'},503);
 // Public paths read only editorially published and free content.
 const publicMatch=/^\/v1\/public\/([a-zA-Z0-9_-]+)\/stories$/.exec(path);
 if(publicMatch){
  if(request.method!=='GET')return publicJson({error:'method_not_allowed'},405);
  const row=await env.DB.prepare("SELECT id,name FROM card_sites WHERE slug=? AND status='active'").bind(publicMatch[1]).first();
  if(!row)return publicJson({error:'not_found'},404);
  const data=await env.DB.prepare("SELECT id,title,body,sources_json,created_at FROM card_stories WHERE site_id=? AND editorial_status='published' AND access='free' ORDER BY created_at DESC LIMIT 25").bind(row.id).all();
  return publicJson({site:row.name,stories:(data.results||[]).map(x=>({id:x.id,title:x.title,body:x.body,sources:JSON.parse(x.sources_json),createdAt:x.created_at}))});
 }
 if(!path.startsWith('/v1/'))return json({error:'not_found'},404);
 if(!['GET','POST'].includes(request.method))return json({error:'method_not_allowed'},405);
 try{
  const owner=await userId(request,env);
  if(path==='/v1/sites'&&request.method==='GET'){
   const data=await env.DB.prepare("SELECT id,name,origin,slug,created_at FROM card_sites WHERE owner_id=? AND status='active' ORDER BY created_at DESC LIMIT 50").bind(owner).all();
   return json({sites:data.results||[]});
  }
  if(path==='/v1/sites'&&request.method==='POST'){
   const data=await body(request),name=text(data.name,60),key=idPart(data.requestKey),origin=originURL(data.origin);
   if(!name||name.length<2)throw failure('site_name_required');
   if(data.origin&&!origin)throw failure('https_origin_required');
   const previous=await env.DB.prepare('SELECT id,name,origin,slug FROM card_sites WHERE owner_id=? AND request_key=?').bind(owner,key).first();
   if(previous)return json({site:previous,created:false});
   const id=makeId(),slug='site-'+id.slice(0,18),stamp=now();
   await env.DB.prepare("INSERT INTO card_sites(id,owner_id,request_key,name,origin,slug,status,created_at) VALUES(?,?,?,?,?,?,'active',?)").bind(id,owner,key,name,origin||null,slug,stamp).run();
   return json({site:{id,name,origin:origin||null,slug},created:true},201);
  }
  const publishMatch=/^\\/v1\\/sites\\/([a-zA-Z0-9_-]+)\\/stories\\/([a-zA-Z0-9_-]+)\\/publish$/.exec(path);
  if(publishMatch&&request.method==='POST'){
   const home=await site(env,idPart(publishMatch[1]),owner),storyId=idPart(publishMatch[2]),d=await body(request);
   const reviewer=text(d.reviewedBy,100);
   if(reviewer.length<3||d.editorialReviewed!==true)throw failure('editorial_review_required',403);
   const draft=await env.DB.prepare("SELECT id,access,sources_json FROM card_stories WHERE id=? AND site_id=? AND editorial_status='draft'").bind(storyId,home.id).first();
   if(!draft)throw failure('draft_not_found',404);
   if(draft.access==='paid')throw failure('paid_settlement_not_connected',409);
   if(JSON.parse(draft.sources_json).length===0&&d.documentedStory===true)throw failure('documented_story_needs_sources',422);
   await env.DB.prepare("UPDATE card_stories SET editorial_status='published',reviewed_by=?,updated_at=? WHERE site_id=? AND id=? AND editorial_status='draft'").bind(reviewer,now(),home.id,storyId).run();
   return json({ok:true,published:true,id:storyId});
  }
  const siteMatch=/^\/v1\/sites\/([a-zA-Z0-9_-]+)(?:\/(cards|stories|events))?$/.exec(path);
  if(!siteMatch)return json({error:'not_found'},404);
  const home=await site(env,idPart(siteMatch[1]),owner),part=siteMatch[2];
  if(!part&&request.method==='GET')return json({site:home});
  if(part==='cards'&&request.method==='GET'){
   const records=await env.DB.prepare('SELECT id,card_id,options_json,updated_at FROM card_instances WHERE site_id=? ORDER BY updated_at DESC LIMIT 50').bind(home.id).all();
   return json({cards:(records.results||[]).map(x=>({id:x.id,cardId:x.card_id,options:JSON.parse(x.options_json),updatedAt:x.updated_at}))});
  }
  if(part==='cards'&&request.method==='POST'){
   const d=await body(request),cardId=text(d.cardId,60),instanceId=idPart(d.instanceId);
   if(!PUBLISHABLE.has(cardId))throw failure('card_not_in_registry');
   const options=d.options;
   if(!options||typeof options!=='object'||Array.isArray(options))throw failure('bad_card_options');
   const packed=JSON.stringify(options);
   if(packed.length>3500)throw failure('card_options_too_large');
   if(cardId==='reads-realms'&&options.access==='paid')return json({error:'paid_settlement_not_connected'},409);
   const saved=await env.DB.prepare('INSERT INTO card_instances(id,site_id,card_id,options_json,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET options_json=excluded.options_json,updated_at=excluded.updated_at WHERE site_id=excluded.site_id').bind(instanceId,home.id,cardId,packed,now()).run();
   if(saved.meta?.changes===0)throw failure('card_instance_conflict',409);
   return json({ok:true,instanceId});
  }
  if(part==='stories'&&request.method==='GET'){
   const records=await env.DB.prepare('SELECT id,title,body,sources_json,editorial_status,access,created_at FROM card_stories WHERE site_id=? ORDER BY created_at DESC LIMIT 50').bind(home.id).all();
   return json({stories:(records.results||[]).map(x=>({id:x.id,title:x.title,body:x.body,sources:JSON.parse(x.sources_json),editorialStatus:x.editorial_status,access:x.access,createdAt:x.created_at}))});
  }
  if(part==='stories'&&request.method==='POST'){
   const d=await body(request),title=text(d.title,160),story=String(d.body||'').trim().slice(0,14000),id=makeId();
   if(title.length<3||story.length<25)throw failure('story_title_and_body_required');
   const sources=(Array.isArray(d.sources)?d.sources:[]).slice(0,12).map(safeLink).filter(Boolean);
   const access=d.access==='paid'?'paid':'free',stamp=now();
   await env.DB.prepare("INSERT INTO card_stories(id,site_id,title,body,sources_json,editorial_status,access,reviewed_by,created_at,updated_at) VALUES(?,?,?,?,?,'draft',?,'',?,?)").bind(id,home.id,title,story,JSON.stringify(sources),access,stamp,stamp).run();
   return json({story:{id,title,editorialStatus:'draft',access},published:false},201);
  }
  if(part==='events'&&request.method==='POST'){
   const d=await body(request),instanceId=idPart(d.instanceId),eventId=idPart(d.eventId),kind=text(d.kind,20),q=text(d.query,200);
   if(!['search','click','research'].includes(kind)||!q)throw failure('bad_research_event');
   const owned=await env.DB.prepare('SELECT id FROM card_instances WHERE site_id=? AND id=?').bind(home.id,instanceId).first();
   if(!owned)throw failure('card_not_in_site',404);
   await env.DB.prepare('INSERT OR IGNORE INTO card_research_events(site_id,event_id,card_instance_id,kind,query_text,source_url,occurred_at) VALUES(?,?,?,?,?,?,?)').bind(home.id,eventId,instanceId,kind,q,safeLink(d.url)||'',now()).run();
   return json({ok:true,eventId});
  }
  return json({error:'route_not_supported'},404);
 }catch(error){return json({error:error.message||'failed'},error.status||500)}
}
export {handle};
export default {fetch:handle};
