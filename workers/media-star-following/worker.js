/* Followed X Spaces -> Media Star.
 * Verified following records come from an authorized X API user token.
 * A link being indexed never establishes playable audio or redistribution rights.
 */
const safe=(v,n=200)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,n);
const out=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json;charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const error=(name,status=400)=>Object.assign(new Error(name),{status});
const authPattern=/^Bearer (sq_[A-Za-z0-9_-]{32,})$/;
async function account(req,env){
 if(!env.IDENTITY_DB)throw error('identity_db_unavailable',503);
 const match=authPattern.exec(req.headers.get('Authorization')||'');
 if(!match)throw error('wallet_login_required',401);
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(match[1]));
 const hex=Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
 const row=await env.IDENTITY_DB.prepare('SELECT a.id AS owner FROM accounts a JOIN account_devices d ON a.id=d.account_id WHERE d.token_hash=?').bind(hex).first();
 if(!row)throw error('invalid_device_token',401);
 return row.owner;
}
function directSpace(input){
 try{const u=new URL(input);if(!['x.com','twitter.com','www.x.com','www.twitter.com'].includes(u.hostname))return null;
  const m=/^\/i\/spaces\/([A-Za-z0-9]{10,25})\/?$/.exec(u.pathname);
  return m?{id:m[1],url:'https://x.com/i/spaces/'+m[1]}:null;
 }catch{return null}
}
const cleanHandle=v=>safe(v,40).replace(/^@/,'').replace(/[^A-Za-z0-9_]/g,'').slice(0,15);
const randBelow=n=>{
 if(!Number.isInteger(n)||n<=0||n>0xffffffff)throw error('invalid_roll_range');
 const max=0x100000000,ceiling=Math.floor(max/n)*n;
 let x;do{const a=new Uint32Array(1);crypto.getRandomValues(a);x=a[0]}while(x>=ceiling);
 return x%n;
};
async function insertHost(env,host){
 return env.DB.prepare('INSERT INTO space_hosts(x_user_id,handle,display_name,profile_url,featured,updated_at) VALUES(?,?,?,?,0,?) ON CONFLICT(x_user_id) DO UPDATE SET handle=excluded.handle,display_name=excluded.display_name,profile_url=excluded.profile_url,updated_at=excluded.updated_at').bind(host.id,host.handle,host.name,'https://x.com/'+host.handle,Date.now()).run();
}
async function insertSpace(env,data){
 const link=directSpace(data.url);
 if(!link)throw error('direct_x_space_link_required');
 const host=await env.DB.prepare('SELECT x_user_id FROM space_hosts WHERE lower(handle)=lower(?)').bind(cleanHandle(data.handle)).first();
 if(!host)throw error('host_not_registered');
 const title=safe(data.title,250);if(title.length<3)throw error('space_title_required');
 const existing=await env.DB.prepare('SELECT host_user_id FROM space_episodes WHERE space_id=?').bind(link.id).first();
 if(existing&&existing.host_user_id!==host.x_user_id)throw error('space_host_conflict',409);
 await env.DB.prepare("INSERT OR IGNORE INTO space_episodes(space_id,host_user_id,title,space_url,started_at,duration_seconds,summary,source_type,availability,imported_at) VALUES(?,?,?,?,?,?,?,'owner_submitted','indexed',?)").bind(link.id,host.x_user_id,title,link.url,safe(data.date,45)||null,null,safe(data.summary,300),Date.now()).run();
 return link.id;
}
async function followImport(env,owner,hosts,source){
 if(!Array.isArray(hosts)||hosts.length>500)throw error('following_list_max_500');
 const clean=new Map();
 for(const h of hosts){
  const handle=cleanHandle(typeof h==='string'?h:h?.username||h?.handle);
  if(!handle)continue;
  const id=safe(typeof h==='string'?'handle:'+handle:h.id||'handle:'+handle,70);
  if(!/^(?:[0-9]{1,22}|handle:[A-Za-z0-9_]{1,15})$/.test(id))continue;
  clean.set(handle.toLowerCase(),{id,handle,name:safe(h?.name||handle,100)});
 }
 if(!clean.size)throw error('following_list_empty');
 const snapshot=crypto.randomUUID(),ts=Date.now();
 const statements=[env.DB.prepare('INSERT INTO follow_snapshots(owner_id,snapshot_id,source,imported_at,account_count) VALUES(?,?,?,?,?)').bind(owner,snapshot,source,ts,clean.size),
 env.DB.prepare('UPDATE followed_hosts SET active=0,updated_at=? WHERE owner_id=?').bind(ts,owner)];
 for(const h of clean.values()){
  // Include a host catalog row even when they have no Spaces yet.
  // Canonical identity is stable by handle until provider IDs are available.
  const known=await env.DB.prepare('SELECT x_user_id FROM space_hosts WHERE lower(handle)=lower(?)').bind(h.handle).first();
  const hostKey=known?.x_user_id||h.id;
  statements.push(env.DB.prepare('INSERT OR IGNORE INTO space_hosts(x_user_id,handle,display_name,profile_url,featured,updated_at) VALUES(?,?,?,?,0,?)').bind(hostKey,h.handle,h.name,'https://x.com/'+h.handle,ts));
  statements.push(env.DB.prepare('INSERT INTO followed_hosts(owner_id,x_user_id,handle,display_name,source,active,snapshot_id,updated_at) VALUES(?,?,?,?,?,1,?,?) ON CONFLICT(owner_id,x_user_id) DO UPDATE SET handle=excluded.handle,display_name=excluded.display_name,source=excluded.source,active=1,snapshot_id=excluded.snapshot_id,updated_at=excluded.updated_at').bind(owner,h.id,h.handle,h.name,source,snapshot,ts));
 }
 await env.DB.batch(statements);
 return {imported:clean.size,snapshot,source};
}
async function syncX(env,owner){
 if(!env.X_OWNER_ID||!env.X_USER_ACCESS_TOKEN||owner!==env.X_OWNER_ID)throw error('x_account_not_connected',503);
 const headers={Authorization:'Bearer '+env.X_USER_ACCESS_TOKEN,Accept:'application/json'};
 const profile=await fetch('https://api.x.com/2/users/me',{headers,signal:AbortSignal.timeout(12000)});
 if(!profile.ok)throw error('x_authentication_failed',502);
 const me=(await profile.json()).data;if(!me?.id)throw error('x_identity_missing',502);
 const all=[],seen=new Set();let cursor='',pages=0;
 do{
  const u=new URL('https://api.x.com/2/users/'+encodeURIComponent(me.id)+'/following');
  u.searchParams.set('max_results','1000');u.searchParams.set('user.fields','name,username');
  if(cursor)u.searchParams.set('pagination_token',cursor);
  const res=await fetch(u,{headers,signal:AbortSignal.timeout(15000)});
  if(!res.ok)throw error('x_following_api_'+res.status,502);
  const data=await res.json();
  for(const a of(data.data||[])){
   if(!a.id||!a.username)continue;
   if(!seen.has(a.id)){seen.add(a.id);all.push({id:a.id,username:a.username,name:a.name})}
  }
  if(all.length>500)throw error('following_limit_exceeded',409);
  const next=data.meta?.next_token||'';
  if(next===cursor)throw error('x_pagination_loop',502);
  cursor=next;pages++;
 }while(cursor&&pages<12);
 if(cursor)throw error('following_pagination_incomplete',502);
 if(!all.length)throw error('following_list_empty',409);
 return followImport(env,owner,all,'x_api_verified');
}
async function eligible(env,owner){
 const res=await env.DB.prepare(`SELECT f.handle,f.display_name AS name,h.x_user_id AS hostId,COUNT(e.space_id) AS count
 FROM followed_hosts f JOIN space_hosts h ON lower(h.handle)=lower(f.handle)
 JOIN space_episodes e ON e.host_user_id=h.x_user_id AND e.availability IN ('indexed','verified_replay')
 WHERE f.owner_id=? AND f.active=1 GROUP BY f.handle,h.x_user_id ORDER BY lower(f.handle)`).bind(owner).all();
 return res.results||[];
}
async function roll(env,owner,rollId){
 if(!/^[A-Za-z0-9_-]{8,100}$/.test(rollId))throw error('roll_id_required');
 const prior=await env.DB.prepare('SELECT r.host_roll AS hostRoll,r.host_range AS hostRange,r.episode_roll AS episodeRoll,r.episode_range AS episodeRange,e.title,e.space_url AS url,h.handle,h.display_name AS name,e.availability,e.space_id AS spaceId FROM space_rolls r JOIN space_episodes e ON e.space_id=r.space_id JOIN space_hosts h ON h.x_user_id=r.host_user_id WHERE r.owner_id=? AND r.roll_id=?').bind(owner,rollId).first();
 if(prior)return{roll:prior,reused:true};
 const hosts=await eligible(env,owner);if(!hosts.length)throw error('no_indexed_spaces_for_following',404);
 // Each eligible followed host gets precisely one ticket. A host with 33 Spaces
 // is not 33 times more likely to win the first host roll.
 const hostIndex=randBelow(hosts.length),host=hosts[hostIndex];
 const records=await env.DB.prepare(`SELECT e.space_id AS spaceId,e.title,e.space_url AS url,e.availability,e.started_at AS date
 FROM space_episodes e WHERE e.host_user_id=? AND e.availability IN ('indexed','verified_replay')
 ORDER BY e.started_at DESC,e.space_id`).bind(host.hostId).all();
 const episodes=records.results||[];
 if(!episodes.length)throw error('host_has_no_episodes',404);
 const seen=await env.DB.prepare('SELECT space_id AS id FROM space_seen WHERE owner_id=? AND space_id IN (SELECT space_id FROM space_episodes WHERE host_user_id=?)').bind(owner,host.hostId).all();
 const used=new Set((seen.results||[]).map(x=>x.id));
 let pool=episodes.filter(x=>!used.has(x.spaceId));
 if(!pool.length){await env.DB.prepare('DELETE FROM space_seen WHERE owner_id=? AND space_id IN (SELECT space_id FROM space_episodes WHERE host_user_id=?)').bind(owner,host.hostId).run();pool=episodes;}
 const chosenIndex=randBelow(pool.length),e=pool[chosenIndex];
 const ts=Date.now();
 // This persisted draw ensures repeat requests do not reshuffle the result.
 const batch=await env.DB.batch([
  env.DB.prepare('INSERT OR IGNORE INTO space_rolls(owner_id,roll_id,host_user_id,space_id,host_roll,host_range,episode_roll,episode_range,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(owner,rollId,host.hostId,e.spaceId,hostIndex+1,hosts.length,chosenIndex+1,pool.length,ts),
  env.DB.prepare('INSERT INTO space_seen(owner_id,space_id,last_seen,cycle) VALUES(?,?,?,1) ON CONFLICT(owner_id,space_id) DO UPDATE SET last_seen=excluded.last_seen,cycle=cycle+1').bind(owner,e.spaceId,ts)
 ]);
 // The draw slot is position among the currently unseen episodes. For 33 new
 // episodes, the second roll has the exact 1-33 range.
 return{roll:{hostRoll:hostIndex+1,hostRange:hosts.length,episodeRoll:chosenIndex+1,episodeRange:pool.length,handle:host.handle,name:host.name,spaceId:e.spaceId,title:e.title,url:e.url,availability:e.availability},reused:false};
}
async function handle(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(path==='/health')return out({ok:true,service:'media-star-following-spaces',xConnected:Boolean(env.X_OWNER_ID&&env.X_USER_ACCESS_TOKEN),playsAudioLocally:false});
 if(path==='/v1/featured'&&request.method==='GET'){
  const h=await env.DB.prepare("SELECT display_name AS name,handle FROM space_hosts WHERE featured=1 ORDER BY handle LIMIT 12").all();
  return out({featured:h.results||[]});
 }
 if(!env.DB)return out({error:'media_star_database_unavailable'},503);
 try{
  const owner=await account(request,env);
  if(path==='/v1/following'&&request.method==='GET'){
   const r=await env.DB.prepare('SELECT handle,display_name AS name,source FROM followed_hosts WHERE owner_id=? AND active=1 ORDER BY lower(handle) LIMIT 500').bind(owner).all();
   return out({following:r.results||[],count:(r.results||[]).length});
  }
  if(path==='/v1/hosts'&&request.method==='GET'){
   const h=await eligible(env,owner);return out({hosts:h,eligibleCount:h.length});
  }
  if(path==='/v1/episodes'&&request.method==='GET'){
   const handle=cleanHandle(url.searchParams.get('handle')),exists=await env.DB.prepare('SELECT 1 AS yes FROM followed_hosts WHERE owner_id=? AND lower(handle)=lower(?) AND active=1').bind(owner,handle).first();
   if(!exists)throw error('host_not_followed',404);
   const rows=await env.DB.prepare(`SELECT e.space_id AS id,e.title,e.space_url AS url,e.availability,e.started_at AS date
   FROM space_episodes e JOIN space_hosts h ON h.x_user_id=e.host_user_id WHERE lower(h.handle)=lower(?) AND e.availability IN ('indexed','verified_replay') ORDER BY e.started_at DESC,e.space_id LIMIT 2000`).bind(handle).all();
   return out({handle,episodes:rows.results||[],count:(rows.results||[]).length});
  }
  if(path==='/v1/roll'&&request.method==='POST'){
   const d=await request.json().catch(()=>({}));return out(await roll(env,owner,String(d.rollId||'')));
  }
  if(path==='/v1/following/sync'&&request.method==='POST')return out(await syncX(env,owner));
  if(path==='/v1/following/import'&&request.method==='POST'){
   const raw=await request.text();if(raw.length>90000)throw error('import_limit_exceeded',413);
   const d=JSON.parse(raw);return out(await followImport(env,owner,d.following,'owner_import'));
  }
  if(path==='/v1/space/import'&&request.method==='POST'){
   const raw=await request.text();if(raw.length>90000)throw error('import_limit_exceeded',413);
   const d=JSON.parse(raw),rows=Array.isArray(d.episodes)?d.episodes:[];
   if(rows.length>100)throw error('import_max_100_per_batch');
   const followed=await env.DB.prepare('SELECT handle FROM followed_hosts WHERE owner_id=? AND active=1').bind(owner).all();
   const handles=new Set((followed.results||[]).map(x=>x.handle.toLowerCase()));
   let added=0,rejected=[];
   for(const [i,episode] of rows.entries()){
    try{const handle=cleanHandle(episode?.handle);if(!handles.has(handle.toLowerCase()))throw error('host_not_followed');
     const host=await env.DB.prepare('SELECT x_user_id FROM space_hosts WHERE lower(handle)=lower(?)').bind(handle).first();
     if(!host)await insertHost(env,{id:'handle:'+handle,handle,name:handle});
     await insertSpace(env,episode);added++;
    }catch(e){rejected.push({index:i,reason:e.message})}
   }
   return out({added,rejected,recordingStatus:'indexed_links_unverified'});
  }
  return out({error:'not_found'},404);
 }catch(err){return out({error:err.message||'failed'},err.status||500)}
}
export {handle,randBelow,directSpace};
export default {fetch:handle};
