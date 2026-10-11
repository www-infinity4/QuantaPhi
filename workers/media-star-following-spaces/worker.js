/* Media Star followed X Spaces: owner-private import, dedupe, two independent rolls.
   This is an original-link index, NOT an audio rehost or a Fred unlock bypass. */
const CORS=new Set(['https://quantaphi.org','https://www.quantaphi.org']);
const json=(request,value,status=200)=>{
 const origin=request.headers.get('Origin');
 return new Response(JSON.stringify(value),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','vary':'Origin',...(CORS.has(origin)?{'access-control-allow-origin':origin}:{})}});
};
const bad=(error,status=400)=>Object.assign(new Error(error),{status});
const clean=(v,max=150)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,max);
const shortId=x=>{const v=String(x||'');if(!/^[A-Za-z0-9:_-]{1,110}$/.test(v))throw bad('invalid_id');return v};
const handle=x=>{const v=clean(x,30).replace(/^@/,'');return /^[A-Za-z0-9_]{1,15}$/.test(v)?v:null};
const spaceLink=value=>{
 try{const u=new URL(value);if(!['x.com','twitter.com','www.x.com','www.twitter.com'].includes(u.hostname))return null;
 const m=/^\/i\/spaces\/([A-Za-z0-9]{8,35})\/?$/.exec(u.pathname);return m?{spaceId:m[1],url:'https://x.com/i/spaces/'+m[1]}:null;}
 catch{return null}
};
const tokenHash=async token=>{
 const sum=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
 return [...new Uint8Array(sum)].map(x=>x.toString(16).padStart(2,'0')).join('');
};
async function owner(request,env){
 const value=request.headers.get('authorization')||'',token=/^Bearer (sq_[A-Za-z0-9_-]{32,})$/.exec(value)?.[1];
 if(!token)throw bad('device_session_required',401);
 if(!env.IDENTITY_DB)throw bad('identity_binding_missing',503);
 const found=await env.IDENTITY_DB.prepare('SELECT a.id AS id FROM accounts a JOIN account_devices d ON d.account_id=a.id WHERE d.token_hash=?').bind(await tokenHash(token)).first();
 if(!found)throw bad('invalid_device_session',401);
 return String(found.id);
}
function drawIndex(size){
 if(!Number.isInteger(size)||size<1)throw bad('empty_roll_pool',409);
 const MAX=4294967296,ceiling=MAX-(MAX%size),seed=new Uint32Array(1);let value;
 do{crypto.getRandomValues(seed);value=seed[0]}while(value>=ceiling);
 return value%size;
}
async function readBody(request){
 const data=await request.text();
 if(data.length>100000)throw bad('import_too_large',413);
 try{return JSON.parse(data)}catch{throw bad('invalid_json')}
}
const episodeFor=(host,episode)=>({
 id:episode.space_id,hostId:host.x_user_id,host:host.display_name,handle:host.handle,
 title:episode.title,availability:episode.availability,playbackVerified:episode.availability==='verified_replay',
 // Never return Fred's curated paid URLs through this free cross-person API.
 url:host.x_user_id==='dotkrueger'?null:episode.space_url,
 fredCurated:host.x_user_id==='dotkrueger',
 player:host.x_user_id==='dotkrueger'?'fred-curio-spotlight':'original-x',
 requiresExistingFredUnlock:host.x_user_id==='dotkrueger'
});
async function library(env,id){
 const r=await env.DB.prepare(
  "SELECT h.x_user_id,h.handle,h.display_name,h.featured,COUNT(e.space_id) AS count,"+
  "SUM(CASE WHEN e.availability='verified_replay' THEN 1 ELSE 0 END) AS verified_count "+
  "FROM followed_hosts f JOIN space_hosts h ON h.x_user_id=f.x_user_id "+
  "LEFT JOIN space_episodes e ON e.host_user_id=h.x_user_id AND e.availability IN ('verified_replay','indexed') "+
  "WHERE f.owner_id=? AND f.active=1 GROUP BY h.x_user_id,h.handle,h.display_name,h.featured ORDER BY LOWER(h.handle)"
 ).bind(id).all();
 return(r.results||[]).map(x=>({id:x.x_user_id,handle:x.handle,name:x.display_name,featured:!!x.featured,episodes:Number(x.count),verified:Number(x.verified_count||0)}));
}
async function importFollows(env,id,body){
 const accounts=body.accounts;
 if(!Array.isArray(accounts)||accounts.length===0||accounts.length>1000)throw bad('following_list_required');
 const snapshot=shortId(body.snapshotId||crypto.randomUUID()),seen=new Set(),valid=[];
 for(const item of accounts){
  const person=typeof item==='string'?{handle:item}:item||{},h=handle(person.handle);
  if(!h)throw bad('invalid_follow_handle');
  const existing=person.xUserId?null:await env.DB.prepare('SELECT x_user_id FROM space_hosts WHERE LOWER(handle)=? LIMIT 1').bind(h.toLowerCase()).first();
  const userId=person.xUserId?shortId(person.xUserId):(existing?.x_user_id||'handle:'+h.toLowerCase());
  if(seen.has(userId))continue;seen.add(userId);
  valid.push({id:userId,handle:h,name:clean(person.name||h,100)});
 }
 const old=await env.DB.prepare('SELECT account_count FROM follow_snapshots WHERE owner_id=? AND snapshot_id=?').bind(id,snapshot).first();
 if(old)return{ok:true,unchanged:true,imported:old.account_count};
 const stamp=Date.now();
 const writes=[env.DB.prepare("INSERT INTO follow_snapshots(owner_id,snapshot_id,source,imported_at,account_count) VALUES(?,?,'owner_import',?,?)").bind(id,snapshot,stamp,valid.length)];
 // Full snapshot: removed follows are deactivated, never permanently deleted.
 if(body.replace!==false)writes.push(env.DB.prepare('UPDATE followed_hosts SET active=0,updated_at=? WHERE owner_id=?').bind(stamp,id));
 for(const a of valid){
  writes.push(env.DB.prepare('INSERT OR IGNORE INTO space_hosts(x_user_id,handle,display_name,profile_url,featured,updated_at) VALUES(?,?,?,?,0,?)').bind(a.id,a.handle,a.name,'https://x.com/'+a.handle,stamp));
  writes.push(env.DB.prepare("INSERT INTO followed_hosts(owner_id,x_user_id,handle,display_name,source,active,snapshot_id,updated_at) VALUES(?,?,?,?,'owner_import',1,?,?) ON CONFLICT(owner_id,x_user_id) DO UPDATE SET active=1,handle=excluded.handle,display_name=excluded.display_name,snapshot_id=excluded.snapshot_id,updated_at=excluded.updated_at").bind(id,a.id,a.handle,a.name,snapshot,stamp));
 }
 await env.DB.batch(writes);
 return {ok:true,snapshotId:snapshot,imported:valid.length,followEvidence:'owner_import_unverified_by_x'};
}
async function importEpisodes(env,id,body){
 const hostId=shortId(body.hostId),items=body.episodes;
 if(!Array.isArray(items)||!items.length||items.length>120)throw bad('episode_list_required');
 const allowed=await env.DB.prepare('SELECT h.x_user_id FROM followed_hosts f JOIN space_hosts h ON f.x_user_id=h.x_user_id WHERE f.owner_id=? AND f.active=1 AND f.x_user_id=?').bind(id,hostId).first();
 if(!allowed)throw bad('host_not_followed',404);
 const parsed=[],seen=new Set();
 for(const item of items){
  const url=spaceLink(typeof item==='string'?item:item?.url),title=clean(item?.title||'X Space recording',200);
  if(!url||!title)throw bad('invalid_original_space_link');
  if(seen.has(url.spaceId))continue;seen.add(url.spaceId);
  parsed.push({...url,title});
 }
 const stamp=Date.now(),runId=shortId(body.importId||crypto.randomUUID());
 const previous=await env.DB.prepare('SELECT imported_episodes FROM space_import_runs WHERE owner_id=? AND run_id=?').bind(id,runId).first();
 if(previous)return{ok:true,unchanged:true,imported:previous.imported_episodes};
 // Import links as indexed; X replay playback has not been verified.
 const statements=[
  env.DB.prepare("INSERT INTO space_import_runs(run_id,owner_id,source,imported_hosts,imported_episodes,rejected,created_at) VALUES(?,?,'owner_submitted',0,?,0,?)").bind(runId,id,parsed.length,stamp)
 ];
 for(const episode of parsed){
  statements.push(env.DB.prepare("INSERT OR IGNORE INTO space_episodes(space_id,host_user_id,title,space_url,source_type,availability,imported_at) VALUES(?,?,?,?,'owner_submitted','indexed',?)").bind(episode.spaceId,hostId,episode.title,episode.url,stamp));
 }
 await env.DB.batch(statements);
 return{ok:true,runId,submitted:parsed.length,availability:'indexed',note:'Original links were validated, not verified playable'};
}
async function shuffle(env,id,body){
 const runId=shortId(body.rollId||crypto.randomUUID());
 const replay=await env.DB.prepare('SELECT host_user_id,space_id,host_roll,host_range,episode_roll,episode_range FROM space_rolls WHERE owner_id=? AND roll_id=?').bind(id,runId).first();
 const all=await library(env,id),hosts=all.filter(h=>h.episodes>0);
 if(!hosts.length)throw bad('no_followed_host_has_indexed_spaces',409);
 let person,episode,hostRoll,episodeRoll,hostRange,episodeRange;
 if(replay){
  person=hosts.find(h=>h.id===replay.host_user_id);
  if(!person)throw bad('replay_host_no_longer_followed',409);
  episode=await env.DB.prepare("SELECT space_id,title,space_url,availability FROM space_episodes WHERE space_id=? AND host_user_id=?").bind(replay.space_id,person.id).first();
  if(!episode)throw bad('replay_episode_unavailable',410);
  hostRoll=replay.host_roll;hostRange=replay.host_range;episodeRoll=replay.episode_roll;episodeRange=replay.episode_range;
 }else{
  hostRange=hosts.length;hostRoll=1+drawIndex(hostRange);person=hosts[hostRoll-1];
  let list=(await env.DB.prepare("SELECT space_id,title,space_url,availability FROM space_episodes WHERE host_user_id=? AND availability IN ('indexed','verified_replay') ORDER BY space_id").bind(person.id).all()).results||[];
  const existingSeen=(await env.DB.prepare('SELECT space_id FROM space_seen WHERE owner_id=?').bind(id).all()).results||[];
  const unseen=new Set(existingSeen.map(x=>x.space_id));
  let pool=list.filter(e=>!unseen.has(e.space_id));
  if(!pool.length)pool=list;
  episodeRange=pool.length;episodeRoll=1+drawIndex(episodeRange);episode=pool[episodeRoll-1];
  const stamp=Date.now();
  await env.DB.batch([
   env.DB.prepare('INSERT INTO space_rolls(owner_id,roll_id,host_user_id,space_id,host_roll,host_range,episode_roll,episode_range,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,runId,person.id,episode.space_id,hostRoll,hostRange,episodeRoll,episodeRange,stamp),
   env.DB.prepare('INSERT INTO space_seen(owner_id,space_id,last_seen,cycle) VALUES(?,?,?,1) ON CONFLICT(owner_id,space_id) DO UPDATE SET last_seen=excluded.last_seen,cycle=space_seen.cycle+1').bind(id,episode.space_id,stamp)
  ]);
 }
 return{ok:true,rollId:runId,hostRoll:{value:hostRoll,range:hostRange},episodeRoll:{value:episodeRoll,range:episodeRange},episode:episodeFor({...person,x_user_id:person.id,display_name:person.name},episode),warning:episode.availability==='indexed'?'Original X URL is indexed; actual replay playback is not confirmed':null};
}
async function handle(request,env){
 const u=new URL(request.url),path=u.pathname,origin=request.headers.get('Origin');
 if(request.method==='OPTIONS'){
  if(!CORS.has(origin))return new Response(null,{status:403});
  return new Response(null,{status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'authorization,content-type','vary':'Origin'}});
 }
 if(path==='/health')return json(request,{ok:true,service:'media-star-following-spaces',database:'tenant-following',xFollowingSynced:false,fredUnlocksSeparate:true});
 try{
  if(!env.DB)throw bad('spaces_db_missing',503);
  const id=await owner(request,env);
  if(path==='/v1/following'&&request.method==='GET')return json(request,{ok:true,accounts:await library(env,id)});
  if(path==='/v1/following/import'&&request.method==='POST')return json(request,await importFollows(env,id,await readBody(request)),201);
  if(path==='/v1/spaces/import'&&request.method==='POST')return json(request,await importEpisodes(env,id,await readBody(request)),201);
  if(path==='/v1/roll'&&request.method==='POST')return json(request,await shuffle(env,id,await readBody(request)));
  if(path==='/v1/history'&&request.method==='GET'){
   const rows=await env.DB.prepare('SELECT roll_id,host_user_id,space_id,host_roll,host_range,episode_roll,episode_range,created_at FROM space_rolls WHERE owner_id=? ORDER BY created_at DESC LIMIT 80').bind(id).all();
   return json(request,{ok:true,rolls:rows.results||[]});
  }
  return json(request,{error:'not_found'},404);
 }catch(err){return json(request,{ok:false,error:err.message||'internal_error'},err.status||500)}
}
export default {fetch:handle};
export {handle,spaceLink,drawIndex};
