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
const exactXHandle=v=>{const handle=String(v??'').trim().replace(/^@/,'');if(!/^[A-Za-z0-9_]{1,15}$/.test(handle))throw error('invalid_x_handle');return handle};
async function linkedAccount(env,owner){
 return await env.DB.prepare('SELECT handle,verification,x_user_id AS userId,verified_at AS verifiedAt FROM x_account_links WHERE owner_id=?').bind(owner).first();
}
async function declareAccount(env,owner,raw){
 const handle=exactXHandle(raw),stamp=Date.now(),previous=await linkedAccount(env,owner);
 if(previous?.handle.toLowerCase()===handle.toLowerCase())return previous;
 await env.DB.prepare("INSERT INTO x_account_links(owner_id,handle,verification,x_user_id,declared_at,verified_at) VALUES(? ,?,'owner_claimed',NULL,?,NULL) ON CONFLICT(owner_id) DO UPDATE SET handle=excluded.handle,verification='owner_claimed',x_user_id=NULL,declared_at=excluded.declared_at,verified_at=NULL").bind(owner,handle,stamp).run();
 return await linkedAccount(env,owner);
}
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
 const receipt=await env.DB.prepare("INSERT OR IGNORE INTO space_episodes(space_id,host_user_id,title,space_url,started_at,duration_seconds,summary,source_type,availability,imported_at) VALUES(?,?,?,?,?,?,?,'owner_submitted','indexed',?)").bind(link.id,host.x_user_id,title,link.url,safe(data.date,45)||null,null,safe(data.summary,300),Date.now()).run();
 return {id:link.id,created:Number(receipt.meta?.changes||0)===1};
}
async function followImport(env,owner,hosts,source){
 if(!Array.isArray(hosts)||hosts.length>500)throw error('following_list_max_500');
 const clean=new Map();
 for(const h of hosts){
  const handle=cleanHandle(typeof h==='string'?h:h?.username||h?.handle);
  if(!handle)continue;
  const id=safe(typeof h==='string'?'handle:'+handle:h?.id||'handle:'+handle,70);
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
 const declared=await linkedAccount(env,owner);
 if(!declared?.handle)throw error('x_handle_not_registered',409);
 const headers={Authorization:'Bearer '+env.X_USER_ACCESS_TOKEN,Accept:'application/json'};
 const profile=await fetch('https://api.x.com/2/users/me',{headers,signal:AbortSignal.timeout(12000)});
 if(!profile.ok)throw error('x_authentication_failed',502);
 const me=(await profile.json()).data;if(!me?.id||!me?.username)throw error('x_identity_missing',502);
 if(me.username.toLowerCase()!==declared.handle.toLowerCase())throw error('x_account_handle_mismatch',403);
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
  if(next&&next===cursor)throw error('x_pagination_loop',502);
  cursor=next;pages++;
 }while(cursor&&pages<12);
 if(cursor)throw error('following_pagination_incomplete',502);
 if(!all.length)throw error('following_list_empty',409);
 const imported=await followImport(env,owner,all,'x_api_verified');
 await env.DB.prepare("UPDATE x_account_links SET verification='x_api_verified',x_user_id=?,verified_at=? WHERE owner_id=? AND lower(handle)=lower(?)").bind(me.id,Date.now(),owner,declared.handle).run();
 return {...imported,verifiedXHandle:me.username};
}
async function syncSpaceMetadata(env,owner){
 // The X API may return only supported discoverable Spaces, not a full history
 // or accessible replay audio. Import only ended Space IDs, marked indexed.
 if(!env.X_OWNER_ID||!env.X_USER_ACCESS_TOKEN||owner!==env.X_OWNER_ID)throw error('x_account_not_connected',503);
 const following=await env.DB.prepare("SELECT x_user_id AS id,handle FROM followed_hosts WHERE owner_id=? AND source='x_api_verified' AND active=1").bind(owner).all();
 const hosts=(following.results||[]).filter(x=>/^[0-9]{1,22}$/.test(x.id));
 if(!hosts.length)throw error('verified_following_sync_required',409);
 const header={Authorization:'Bearer '+env.X_USER_ACCESS_TOKEN,Accept:'application/json'};
 let indexed=0,rejected=0,attempted=0;
 for(let offset=0;offset<hosts.length;offset+=25){
  const chunk=hosts.slice(offset,offset+25);
  const u=new URL('https://api.x.com/2/spaces/by/creator_ids');
  u.searchParams.set('user_ids',chunk.map(x=>x.id).join(','));
  u.searchParams.set('space.fields','creator_id,title,state,started_at,ended_at');
  const res=await fetch(u,{headers:header,signal:AbortSignal.timeout(15000)});
  if(!res.ok)throw error('x_spaces_api_'+res.status,502);
  const payload=await res.json();
  for(const sp of(payload.data||[])){
   attempted++;if(!/^[A-Za-z0-9]{10,25}$/.test(sp.id||'')||sp.state!=='ended'){rejected++;continue}
   const host=chunk.find(h=>h.id===sp.creator_id);if(!host){rejected++;continue}
   const row=await env.DB.prepare('SELECT x_user_id FROM space_hosts WHERE lower(handle)=lower(?)').bind(host.handle).first();
   if(!row){rejected++;continue}
   const url='https://x.com/i/spaces/'+sp.id,title=safe(sp.title||'X Space '+sp.id,250);
   const x=await env.DB.prepare("INSERT OR IGNORE INTO space_episodes(space_id,host_user_id,title,space_url,started_at,summary,source_type,availability,imported_at) VALUES(?,?,?,?,?,'','x_api','indexed',?)").bind(sp.id,row.x_user_id,title,url,safe(sp.started_at||sp.ended_at,45)||null,Date.now()).run();
   indexed+=Number(x.meta?.changes||0);
  }
 }
 return{hostsChecked:hosts.length,reportedSpaces:attempted,indexed,skipped:rejected,playabilityVerified:false,archiveCompletenessGuaranteed:false};
}

async function preferences(env,owner){
 const row=await env.DB.prepare('SELECT selection_mode AS mode,include_fred AS includeFred FROM space_radio_preferences WHERE owner_id=?').bind(owner).first();
 return {mode:row?.mode||'equal_hosts',includeFred:!!row?.includeFred};
}
async function eligible(env,owner,opts){
 // All curated episodes are indexed original-source links. Missing host
 // catalogs and explicitly reported dead links have zero raffle tickets.
 const sql = `SELECT h.x_user_id AS hostId,h.handle,h.display_name AS name,
 COUNT(e.space_id) AS total,
 SUM(CASE WHEN sn.space_id IS NULL THEN 1 ELSE 0 END) AS unseen
 FROM space_hosts h
 JOIN space_episodes e ON e.host_user_id=h.x_user_id AND e.availability IN ('indexed','verified_replay')
 LEFT JOIN followed_hosts f ON lower(f.handle)=lower(h.handle) AND f.owner_id=? AND f.active=1
 LEFT JOIN space_playback_reports dead ON dead.space_id=e.space_id AND dead.owner_id=? AND dead.state='unavailable'
 LEFT JOIN space_seen sn ON sn.space_id=e.space_id AND sn.owner_id=?
 WHERE (f.owner_id IS NOT NULL OR (lower(h.handle)='dotkrueger' AND ?=1))
 AND dead.space_id IS NULL
 GROUP BY h.x_user_id,h.handle,h.display_name ORDER BY lower(h.handle)`;
 const q=await env.DB.prepare(sql).bind(owner,owner,owner,opts.includeFred?1:0).all();
 return (q.results||[]).map(x=>({...x,total:Number(x.total),count:Number(x.total),unseen:Number(x.unseen)})).filter(x=>x.total>0);
}
async function roll(env,owner,rollId){
 if(!/^[A-Za-z0-9_-]{8,100}$/.test(rollId))throw error('roll_id_required');
 const prior=await env.DB.prepare('SELECT r.host_roll AS hostRoll,r.host_range AS hostRange,r.episode_roll AS episodeRoll,r.episode_range AS episodeRange,e.title,e.space_url AS url,h.handle,h.display_name AS name,e.availability,e.space_id AS spaceId FROM space_rolls r JOIN space_episodes e ON e.space_id=r.space_id JOIN space_hosts h ON h.x_user_id=r.host_user_id WHERE r.owner_id=? AND r.roll_id=?').bind(owner,rollId).first();
 if(prior){
  if(prior.handle.toLowerCase()==='dotkrueger'){prior.url=null;prior.requiresOriginalUnlock=true;prior.curatedBy='fred-spaces-ledger'}
  return {roll:prior,reused:true};
 }
 const opts=await preferences(env,owner);
 let hosts=await eligible(env,owner,opts);
 if(!hosts.length)throw error('no_indexed_spaces_for_following',404);
 // Avoid repeats across the entire eligible playlist, rather than resetting
 // the first host while unplayed episodes remain with other followed hosts.
 if(!hosts.some(h=>h.unseen>0)){
  await env.DB.prepare('DELETE FROM space_seen WHERE owner_id=? AND space_id IN (SELECT e.space_id FROM space_episodes e JOIN space_hosts h ON e.host_user_id=h.x_user_id WHERE e.availability IN (\'indexed\',\'verified_replay\'))').bind(owner).run();
  hosts=await eligible(env,owner,opts);
 }
 const available=hosts.filter(h=>h.unseen>0);
 if(!available.length)throw error('no_unplayed_episodes',409);
 let chosenHost;
 if(opts.mode==='episodes_weighted'){
  // Every eligible, unseen episode contributes one ticket.
  // 342 Fred entries against 1 entry elsewhere: Fred has 342/343 chance.
  const tickets=available.reduce((sum,h)=>sum+h.unseen,0);
  const winning=randBelow(tickets);let cursor=0;
  for(const h of available){cursor+=h.unseen;if(winning<cursor){chosenHost=h;break}}
 }else{
  chosenHost=available[randBelow(available.length)];
 }
 const hostIndex=hosts.findIndex(h=>h.hostId===chosenHost.hostId);
 const recorded=await env.DB.prepare(`SELECT e.space_id AS spaceId,e.title,e.space_url AS url,e.availability,e.started_at AS date
 FROM space_episodes e
 LEFT JOIN space_seen sn ON sn.owner_id=? AND sn.space_id=e.space_id
 LEFT JOIN space_playback_reports dead ON dead.owner_id=? AND dead.space_id=e.space_id AND dead.state='unavailable'
 WHERE e.host_user_id=? AND e.availability IN ('indexed','verified_replay') AND sn.space_id IS NULL AND dead.space_id IS NULL
 ORDER BY e.started_at DESC,e.space_id`).bind(owner,owner,chosenHost.hostId).all();
 const episodes=recorded.results||[];
 if(!episodes.length)throw error('host_has_no_unplayed_episodes',409);
 const episodeIndex=randBelow(episodes.length),e=episodes[episodeIndex],ts=Date.now();
 const receipt=await env.DB.batch([
  env.DB.prepare('INSERT OR IGNORE INTO space_rolls(owner_id,roll_id,host_user_id,space_id,host_roll,host_range,episode_roll,episode_range,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(owner,rollId,chosenHost.hostId,e.spaceId,hostIndex+1,hosts.length,episodeIndex+1,episodes.length,ts),
  env.DB.prepare('INSERT INTO space_seen(owner_id,space_id,last_seen,cycle) VALUES(?,?,?,1) ON CONFLICT(owner_id,space_id) DO UPDATE SET last_seen=excluded.last_seen,cycle=cycle+1').bind(owner,e.spaceId,ts)
 ]);
 if(receipt[0]?.meta?.changes===0)return roll(env,owner,rollId);
 const fred=chosenHost.handle.toLowerCase()==='dotkrueger';
 return {roll:{hostRoll:hostIndex+1,hostRange:hosts.length,episodeRoll:episodeIndex+1,episodeRange:episodes.length,handle:chosenHost.handle,name:chosenHost.name,spaceId:e.spaceId,title:e.title,url:fred?null:e.url,availability:e.availability,requiresOriginalUnlock:fred,curatedBy:fred?'fred-spaces-ledger':null},reused:false,
 selectionMode:opts.mode,remainingUnplayed:available.reduce((n,h)=>n+h.unseen,0)-1};
}
async function playbackReport(env,owner,body){
 if(!body||!['played','unavailable'].includes(body.state))throw error('invalid_playback_state');
 const id=String(body.spaceId||'');
 if(!/^[A-Za-z0-9]{10,25}$/.test(id))throw error('invalid_space_id');
 const opts=await preferences(env,owner);
 const record=await env.DB.prepare(`SELECT e.space_id FROM space_episodes e
 JOIN space_hosts h ON h.x_user_id=e.host_user_id
 LEFT JOIN followed_hosts f ON f.owner_id=? AND f.active=1 AND lower(f.handle)=lower(h.handle)
 WHERE e.space_id=? AND (f.owner_id IS NOT NULL OR (lower(h.handle)='dotkrueger' AND ?=1))`).bind(owner,id,opts.includeFred?1:0).first();
 if(!record)throw error('recording_not_in_curated_library',404);
 await env.DB.prepare("INSERT INTO space_playback_reports(owner_id,space_id,state,reported_at) VALUES(?,?,?,?) ON CONFLICT(owner_id,space_id) DO UPDATE SET state=excluded.state,reported_at=excluded.reported_at").bind(owner,id,body.state,Date.now()).run();
 return {ok:true,spaceId:id,state:body.state,globalPlaybackVerified:false};
}
async function handle(request,env){
 const url=new URL(request.url),path=url.pathname;
 if(path==='/health')return out({ok:true,service:'media-star-following-spaces',xConnected:Boolean(env.X_OWNER_ID&&env.X_USER_ACCESS_TOKEN),playsAudioLocally:false});
 if(!env.DB)return out({error:'media_star_database_unavailable'},503);
 if(path==='/v1/featured'&&request.method==='GET'){
  // A priority source URL is a discovery lead, NOT a playable X replay.
  const h=await env.DB.prepare(`SELECT h.display_name AS name,h.handle,h.x_user_id AS hostId,
    COUNT(DISTINCT e.space_id) AS episodes,
    MAX(CASE WHEN s.source_kind='public_archive' THEN s.source_url ELSE NULL END) AS archiveUrl
    FROM space_hosts h
    LEFT JOIN space_episodes e ON e.host_user_id=h.x_user_id AND e.availability IN ('indexed','verified_replay')
    LEFT JOIN space_host_sources s ON s.host_user_id=h.x_user_id
    WHERE h.featured=1
    GROUP BY h.x_user_id,h.display_name,h.handle ORDER BY CASE WHEN h.handle='dotkrueger' THEN 0 ELSE 1 END,lower(h.handle) LIMIT 12`).all();
  return out({featured:(h.results||[]).map(x=>({...x,episodes:Number(x.episodes||0),archiveUrl:x.archiveUrl||null})),discoveryLinksNotReplays:true});
 }
 try{
  const owner=await account(request,env);
  if(path==='/v1/x/account'&&request.method==='GET'){
   const claimed=await linkedAccount(env,owner);
   return out({account:claimed||null,xConnected:Boolean(env.X_OWNER_ID&&env.X_USER_ACCESS_TOKEN&&owner===env.X_OWNER_ID)});
  }
  if(path==='/v1/x/account'&&request.method==='POST'){
   const raw=await request.text();
   if(raw.length>1024)throw error('request_too_large',413);
   let data;try{data=JSON.parse(raw)}catch{throw error('invalid_json')}
   const claimed=await declareAccount(env,owner,data?.handle);
   return out({account:claimed,verifiedByX:claimed.verification==='x_api_verified',followListSynced:false});
  }
  if(path==='/v1/following'&&request.method==='GET'){
   const r=await env.DB.prepare(`SELECT f.handle,f.display_name AS name,f.source,COUNT(DISTINCT e.space_id) AS episodes
     FROM followed_hosts f
     LEFT JOIN space_hosts h ON lower(h.handle)=lower(f.handle)
     LEFT JOIN space_episodes e ON e.host_user_id=h.x_user_id AND e.availability IN ('indexed','verified_replay')
     WHERE f.owner_id=? AND f.active=1 GROUP BY f.x_user_id,f.handle,f.display_name,f.source
     ORDER BY lower(f.handle) LIMIT 500`).bind(owner).all();
   return out({following:r.results||[],count:(r.results||[]).length});
  }
  if(path==='/v1/hosts'&&request.method==='GET'){
   const h=await eligible(env,owner,await preferences(env,owner));return out({hosts:h,eligibleCount:h.length});
  }
  if(path==='/v1/episodes'&&request.method==='GET'){
   const handle=cleanHandle(url.searchParams.get('handle')),exists=await env.DB.prepare('SELECT 1 AS yes FROM followed_hosts WHERE owner_id=? AND lower(handle)=lower(?) AND active=1').bind(owner,handle).first();
   const config=await preferences(env,owner);
   if(!exists&&!(handle.toLowerCase()==='dotkrueger'&&config.includeFred))throw error('host_not_followed',404);
   const rows=await env.DB.prepare(`SELECT e.space_id AS id,e.title,e.space_url AS url,e.availability,e.started_at AS date
   FROM space_episodes e JOIN space_hosts h ON h.x_user_id=e.host_user_id WHERE lower(h.handle)=lower(?) AND e.availability IN ('indexed','verified_replay') ORDER BY e.started_at DESC,e.space_id LIMIT 2000`).bind(handle).all();
   return out({handle,episodes:(rows.results||[]).map(x=>handle.toLowerCase()==='dotkrueger'?{...x,url:null,requiresOriginalUnlock:true}:x),count:(rows.results||[]).length});
  }
  if(path==='/v1/radio/preferences'&&request.method==='GET')return out(await preferences(env,owner));
  if(path==='/v1/radio/preferences'&&request.method==='POST'){
   const d=await request.json().catch(()=>({}));
   if(!['equal_hosts','episodes_weighted'].includes(d.mode)||typeof d.includeFred!=='boolean')throw error('invalid_radio_preferences');
   await env.DB.prepare('INSERT INTO space_radio_preferences(owner_id,selection_mode,include_fred,updated_at) VALUES(?,?,?,?) ON CONFLICT(owner_id) DO UPDATE SET selection_mode=excluded.selection_mode,include_fred=excluded.include_fred,updated_at=excluded.updated_at').bind(owner,d.mode,d.includeFred?1:0,Date.now()).run();
   return out(await preferences(env,owner));
  }
  if(path==='/v1/playback/report'&&request.method==='POST')return out(await playbackReport(env,owner,await request.json().catch(()=>({}))));
  if(path==='/v1/history'&&request.method==='GET'){
   const history=await env.DB.prepare('SELECT roll_id AS rollId,host_user_id AS hostId,space_id AS spaceId,host_roll AS hostRoll,host_range AS hostRange,episode_roll AS episodeRoll,episode_range AS episodeRange,created_at AS createdAt FROM space_rolls WHERE owner_id=? ORDER BY created_at DESC LIMIT 100').bind(owner).all();
   return out({rolls:history.results||[],count:(history.results||[]).length});
  }
  if(path==='/v1/roll'&&request.method==='POST'){
   const d=await request.json().catch(()=>({}));return out(await roll(env,owner,String(d.rollId||'')));
  }
  if(path==='/v1/following/sync'&&request.method==='POST')return out(await syncX(env,owner));
  if(path==='/v1/spaces/sync'&&request.method==='POST')return out(await syncSpaceMetadata(env,owner));
  if(path==='/v1/following/import'&&request.method==='POST'){
   const raw=await request.text();if(raw.length>90000)throw error('import_limit_exceeded',413);
   const d=JSON.parse(raw);return out(await followImport(env,owner,d.following,'owner_import'));
  }
  if(path==='/v1/space/import'&&request.method==='POST'){
   const raw=await request.text();if(raw.length>90000)throw error('import_limit_exceeded',413);
   const d=JSON.parse(raw),rows=Array.isArray(d.episodes)?d.episodes:[];
   if(rows.length>100)throw error('import_max_100_per_batch');
   const importKey=String(d.importId||crypto.randomUUID());
   if(!/^[A-Za-z0-9_-]{8,100}$/.test(importKey))throw error('invalid_import_id');
   const runId=owner+':'+importKey;
   const previous=await env.DB.prepare('SELECT imported_episodes,rejected FROM space_import_runs WHERE run_id=? AND owner_id=?').bind(runId,owner).first();
   if(previous)return out({added:previous.imported_episodes,rejectedCount:previous.rejected,unchanged:true,recordingStatus:'indexed_links_unverified'});
   const followed=await env.DB.prepare('SELECT handle FROM followed_hosts WHERE owner_id=? AND active=1').bind(owner).all();
   const handles=new Set((followed.results||[]).map(x=>x.handle.toLowerCase()));
   let added=0,rejected=[];
   for(const [i,episode] of rows.entries()){
    try{const handle=cleanHandle(episode?.handle);if(!handles.has(handle.toLowerCase()))throw error('host_not_followed');
     const host=await env.DB.prepare('SELECT x_user_id FROM space_hosts WHERE lower(handle)=lower(?)').bind(handle).first();
     if(!host)await insertHost(env,{id:'handle:'+handle,handle,name:handle});
     const saved=await insertSpace(env,episode);if(saved.created)added++;
    }catch(e){rejected.push({index:i,reason:e.message})}
   }
   await env.DB.prepare("INSERT INTO space_import_runs(run_id,owner_id,source,imported_hosts,imported_episodes,rejected,created_at) VALUES(?,?,'owner_submitted',0,?,?,?)").bind(runId,owner,added,rejected.length,Date.now()).run();
   return out({added,rejected,importId:importKey,recordingStatus:'indexed_links_unverified'});
  }
  return out({error:'not_found'},404);
 }catch(err){return out({error:err.message||'failed'},err.status||500)}
}
export {handle,randBelow,directSpace};
const allowedOrigins=new Set(['https://quantaphi.org','https://www.quantaphi.org']);
async function browserFetch(request,env){
 const origin=request.headers.get('Origin')||'';
 if(request.method==='OPTIONS'){
  return new Response(null,{status:allowedOrigins.has(origin)?204:403,headers:allowedOrigins.has(origin)?{
   'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Authorization,Content-Type',
   'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin'
  }:{}});
 }
 const response=await handle(request,env);
 if(!allowedOrigins.has(origin))return response;
 const headers=new Headers(response.headers);
 headers.set('Access-Control-Allow-Origin',origin);headers.set('Vary','Origin');
 return new Response(response.body,{status:response.status,headers});
}
export default {fetch:browserFetch};
