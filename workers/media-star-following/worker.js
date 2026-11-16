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
 const xToken=await xoOwnerToken(env,owner);
 const declared=await linkedAccount(env,owner);
 if(!declared?.handle)throw error('x_handle_not_registered',409);
 const headers={Authorization:'Bearer '+xToken,Accept:'application/json'};
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
 const xToken=await xoOwnerToken(env,owner);
 const following=await env.DB.prepare("SELECT x_user_id AS id,handle FROM followed_hosts WHERE owner_id=? AND source='x_api_verified' AND active=1").bind(owner).all();
 const hosts=(following.results||[]).filter(x=>/^[0-9]{1,22}$/.test(x.id));
 if(!hosts.length)throw error('verified_following_sync_required',409);
 const header={Authorization:'Bearer '+xToken,Accept:'application/json'};
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

// X social Quick Card: all data is provider-confirmed per user; no synthetic timeline.
// Requests are bounded, owner-authenticated, and only read or write requested X APIs.
const XT_FIELDS='tweet.fields=author_id,created_at,public_metrics,referenced_tweets&expansions=author_id&user.fields=username,name,profile_image_url,verified';
const xtId=x=>/^[0-9]{1,22}$/.test(String(x||''));
const xtTopic=x=>/^[\p{L}\p{N}\s#@_-]{2,60}$/u.test(String(x||'').trim());
async function xtAccount(env,owner){
 const row=await env.DB.prepare('SELECT x_user_id,x_handle,scope FROM x_oauth_tokens WHERE owner_id=?').bind(owner).first();
 const scopes=new Set(String(row?.scope||'').split(/\s+/).filter(Boolean));
 return {row,canPost:scopes.has('tweet.write'),canLike:scopes.has('like.write')};
}
async function xtFetch(token,url,{method='GET',body}={}){
 const response=await fetch(url,{method,headers:{Authorization:'Bearer '+token,Accept:'application/json',...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(12000)});
 if(!response.ok){
  const code=response.status===429?'x_rate_limited':(response.status===402||response.status===403)?'x_plan_or_permission_required':'x_api_'+response.status;
  throw xoErr(code,response.status===429?429:502);
 }
 return response.json().catch(()=>{throw xoErr('x_api_invalid_response',502)});
}
function xtPosts(payload){
 const people=new Map((payload.includes?.users||[]).filter(p=>xtId(p.id)).map(p=>[p.id,p]));
 return (Array.isArray(payload.data)?payload.data:[]).filter(post=>xtId(post.id)).slice(0,20).map(post=>{
  const person=people.get(post.author_id)||{};
  const authorHandle=/^[A-Za-z0-9_]{1,15}$/.test(person.username||'')?person.username:null;
  return {id:String(post.id),url:authorHandle?'https://x.com/'+authorHandle+'/status/'+post.id:'https://x.com/i/status/'+post.id,
   text:String(post.text||'').slice(0,2000),createdAt:post.created_at||null,
   author:{id:post.author_id||null,name:person.name||null,handle:authorHandle,avatarUrl:(/^https:\/\/pbs\.twimg\.com\//.test(person.profile_image_url||'')?person.profile_image_url:null),verified:person.verified===true},
   metrics:post.public_metrics||null,source:'x_api_verified'};
 });
}
async function xtSinglePost(env,owner,url){
 const id=String(url.searchParams.get('id')||'');
 if(!xtId(id))throw xoErr('invalid_post_id',400);
 const token=await xoOwnerToken(env,owner);
 const payload=await xtFetch(token,'https://api.x.com/2/tweets/'+id+'?'+XT_FIELDS);
 const post=xtPosts({data:payload.data?[payload.data]:[],includes:payload.includes})[0];
 if(!post)throw xoErr('x_post_not_available',404);
 return {post,source:'x_api_verified',fetchedAt:new Date().toISOString()};
}
async function xtTimeline(env,owner,url){
 const mode=url.searchParams.get('feed')||'following';
 if(!['public','following'].includes(mode))throw xoErr('invalid_feed',400);
 const token=await xoOwnerToken(env,owner),account=await xtAccount(env,owner);
 let path;
 if(mode==='following'){
  if(!xtId(account.row?.x_user_id))throw xoErr('x_oauth_account_required',401);
  path='/2/users/'+account.row.x_user_id+'/timelines/reverse_chronological?max_results=10&'+XT_FIELDS;
 }else{
  const topic=(url.searchParams.get('q')||'science technology').trim();
  if(!xtTopic(topic))throw xoErr('invalid_public_search',400);
  path='/2/tweets/search/recent?query='+encodeURIComponent('('+topic.replace(/\s+/g,' OR ')+') -is:retweet')+'&max_results=10&'+XT_FIELDS;
 }
 const payload=await xtFetch(token,'https://api.x.com'+path);
 return {feed:mode,posts:xtPosts(payload),source:'x_api_verified',fetchedAt:new Date().toISOString(),paginationToken:typeof payload.meta?.next_token==='string'?payload.meta.next_token:null};
}
async function xtLiveSpaces(env,owner,url){
 const token=await xoOwnerToken(env,owner);
 const topic=(url.searchParams.get('q')||'technology').trim();
 if(!xtTopic(topic))throw xoErr('invalid_space_search',400);
 const search=new URL('https://api.x.com/2/spaces/search');
 search.searchParams.set('query',topic);
 search.searchParams.set('state','live');
 search.searchParams.set('space.fields','title,state,creator_id,started_at,scheduled_start');
 search.searchParams.set('expansions','creator_id');
 search.searchParams.set('user.fields','username,name');
 const payload=await xtFetch(token,search.href);
 const people=new Map((payload.includes?.users||[]).filter(x=>xtId(x.id)).map(x=>[x.id,x]));
 const spaces=(payload.data||[]).filter(space=>xtId(space.creator_id)&&/^[A-Za-z0-9]{10,25}$/.test(space.id||'')&&space.state==='live').slice(0,15).map(space=>{
  const host=people.get(space.creator_id)||{};
  return {id:space.id,title:String(space.title||'Untitled live Space').slice(0,240),url:'https://x.com/i/spaces/'+space.id,
   state:'live',creatorId:space.creator_id,creatorHandle:host.username||null,creatorName:host.name||null,startedAt:space.started_at||null,source:'x_api_live'};
 });
 return {spaces,source:'x_api_live',fetchedAt:new Date().toISOString(),refreshAfterSeconds:90,endedExcluded:true,playbackOnXOnly:true};
}
async function xtProfile(env,owner){
 const token=await xoOwnerToken(env,owner);
 const payload=await xtFetch(token,'https://api.x.com/2/users/me?user.fields=username,name,description,profile_image_url,public_metrics');
 const person=payload.data;
 if(!person?.id||!xtId(person.id)||!/^[A-Za-z0-9_]{1,15}$/.test(person.username||''))throw xoErr('x_identity_unavailable',502);
 const cap=await xtAccount(env,owner);
 if(cap.row&&cap.row.x_user_id!==person.id)throw xoErr('x_profile_mismatch',403);
 return {profile:{id:person.id,name:person.name||null,handle:person.username,description:person.description||null,avatarUrl:/^https:\/\/pbs\.twimg\.com\//.test(person.profile_image_url||'')?person.profile_image_url:null,url:'https://x.com/'+person.username},canPost:cap.canPost,canLike:cap.canLike,source:'x_api_verified'};
}
async function xtWrite(env,owner,request,kind){
 const raw=await request.text();if(raw.length>1600)throw xoErr('x_request_too_large',413);
 let body;try{body=JSON.parse(raw)}catch{throw xoErr('invalid_json',400)}
 if(!body||typeof body!=='object'||Array.isArray(body))throw xoErr('invalid_payload',400);
 const cap=await xtAccount(env,owner);
 if(!cap.row)throw xoErr('x_reauthorization_required',401);
 if((kind==='like'&&!cap.canLike)||(kind!=='like'&&!cap.canPost))throw xoErr('x_write_permission_required',403);
 if(!xtId(cap.row.x_user_id))throw xoErr('x_identity_unavailable',403);
 const token=await xoOwnerToken(env,owner);
 if(kind==='like'){
  if(!xtId(body.postId))throw xoErr('invalid_post_id',400);
  const result=await xtFetch(token,'https://api.x.com/2/users/'+cap.row.x_user_id+'/likes',{method:'POST',body:{tweet_id:String(body.postId)}});
  if(result.data?.liked!==true)throw xoErr('x_like_not_confirmed',502);
  return {ok:true,action:'liked',postId:String(body.postId),source:'x_api_confirmed'};
 }
 if(kind==='repost'){
  if(!xtId(body.postId))throw xoErr('invalid_post_id',400);
  const result=await xtFetch(token,'https://api.x.com/2/users/'+cap.row.x_user_id+'/retweets',{method:'POST',body:{tweet_id:String(body.postId)}});
  if(result.data?.retweeted!==true)throw xoErr('x_repost_not_confirmed',502);
  return {ok:true,action:'reposted',postId:String(body.postId),source:'x_api_confirmed'};
 }
 const content=String(body.text||'').trim();
 if(!content||Array.from(content).length>280||/[\u0000-\u001f\u007f]/.test(content))throw xoErr('invalid_post_text',400);
 const replyTo=body.replyTo||null;
 if(replyTo!==null&&!xtId(replyTo))throw xoErr('invalid_reply_id',400);
 const payload={text:content};
 if(replyTo)payload.reply={in_reply_to_tweet_id:String(replyTo)};
 const result=await xtFetch(token,'https://api.x.com/2/tweets',{method:'POST',body:payload});
 if(!xtId(result.data?.id))throw xoErr('x_post_not_confirmed',502);
 return {ok:true,action:replyTo?'replied':'posted',postId:String(result.data.id),url:'https://x.com/i/status/'+result.data.id,source:'x_api_confirmed'};
}
async function xtArchive(env,owner){
 const query=await env.DB.prepare("SELECT e.space_id AS id,e.title,e.space_url AS url,e.availability,e.started_at AS startedAt,h.handle FROM space_episodes e JOIN space_hosts h ON e.host_user_id=h.x_user_id JOIN followed_hosts f ON f.owner_id=? AND f.active=1 AND lower(f.handle)=lower(h.handle) WHERE e.availability IN ('indexed','verified_replay') ORDER BY e.started_at DESC LIMIT 50").bind(owner).all();
 return {spaces:(query.results||[]).map(x=>({id:x.id,title:x.title,url:x.url,handle:x.handle,status:'archived_link_unverified',source:'media_star_index'})),playbackUnverified:true};
}

async function handle(request,env){
 const url=new URL(request.url),path=url.pathname;
 const connect=xoConnectPage(path);if(connect)return connect;
 if(path.startsWith('/connect-x'))return out({error:'not_found'},404);
 const legal=xoLegal(path);if(legal)return legal;
 if(path==='/api/x/oauth/callback'){if(request.method!=='GET')return out({error:'method_not_allowed'},405);return xoFinish(request,env)}
 if(path==='/health')return out({ok:true,service:'media-star-following-spaces',oauthConfigured:xoReady(env),playsAudioLocally:false});
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
  if(path==='/v1/x/oauth/start'&&request.method==='POST'){const body=await request.json().catch(()=>({}));return out(await xoBegin(env,owner,{write:body?.write===true}));}
  if(path==='/v1/x/oauth/disconnect'&&request.method==='POST')return out(await xoDisconnect(env,owner,(await request.json().catch(()=>({}))).confirmation));
  if(path==='/v1/x/post'&&request.method==='GET')return out(await xtSinglePost(env,owner,url));
   if(path==='/v1/x/timeline'&&request.method==='GET')return out(await xtTimeline(env,owner,url));
  if(path==='/v1/x/spaces/live'&&request.method==='GET')return out(await xtLiveSpaces(env,owner,url));
  if(path==='/v1/x/profile'&&request.method==='GET')return out(await xtProfile(env,owner));
  if(path==='/v1/x/archive'&&request.method==='GET')return out(await xtArchive(env,owner));
  if(path==='/v1/x/post'&&request.method==='POST')return out(await xtWrite(env,owner,request,'post'));
  if(path==='/v1/x/like'&&request.method==='POST')return out(await xtWrite(env,owner,request,'like'));
  if(path==='/v1/x/repost'&&request.method==='POST')return out(await xtWrite(env,owner,request,'repost'));
  if(path==='/v1/x/account'&&request.method==='GET'){
   const claimed=await linkedAccount(env,owner);
   const flags=await xtAccount(env,owner);return out({account:claimed||null,xConnected:await xoConnected(env,owner),oauthConfigured:xoReady(env),canPost:flags.canPost,canLike:flags.canLike});
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

// X OAuth2 authorization code + PKCE. All authorization state and encrypted
// provider credentials stay in the existing Media Star D1 database.

function xoConnectPage(path){
 if(path!=='/connect-x'&&path!=='/connect-x.js')return null;
 if(path==='/connect-x.js'){
  return new Response(XO_CONNECT_JS,{headers:{'Content-Type':'application/javascript; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
 }
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta name="description" content="Connect your existing QuantaPhi wallet to X for Media Star following and Spaces."><title>Connect X | QuantaPhi Media Star</title><style>:root{font-family:system-ui,-apple-system,Roboto,sans-serif;color:#2b2235;background:#f7f4fb}*{box-sizing:border-box}html,body{max-width:100%;overflow-x:hidden}body{margin:0}main{width:calc(100% - 24px);min-width:0;max-width:650px;margin:28px auto;padding:clamp(18px,5vw,36px);background:#fff;border:1px solid #d9cce4;border-radius:18px}h1{font-size:clamp(28px,6vw,36px);line-height:1.25;margin:0 0 16px}p{font-size:17px;line-height:1.6}a{color:#55218f;font-weight:650}button{padding:15px 20px;font:700 17px/1.3 system-ui;border:0;border-radius:12px;background:#55218f;color:#fff;min-height:48px}button:disabled{opacity:.5}input{font:16px system-ui;padding:12px;border-radius:10px;border:1px solid #a89caf;max-width:100%;width:250px}label{display:block;font-size:16px;font-weight:650;margin-bottom:6px}.stack{display:grid;gap:13px}.muted{color:#62596b}.bar{display:flex;gap:16px;flex-wrap:wrap}.status{padding:14px;border:1px solid #cfc4da;border-radius:12px;background:#f9f7fc}details{margin:16px 0;padding:13px;border:1px solid #ddd2e8;border-radius:12px}summary{font-weight:650;cursor:pointer}@media(max-width:700px){main{margin:14px;padding:22px}}</style></head><body><main><p><a href="https://quantaphi.org/">QuantaPhi home</a> / Media Star</p><h1>Connect your X account</h1><p>Use your existing QuantaPhi wallet and approve the connection directly on X. This page does not revoke permissions or delete saved following records.</p><section class="stack" aria-live="polite"><div class="status"><strong>Wallet connection</strong><p id="walletStatus">Checking this device...</p><a id="walletLink" href="https://quantaphi.org/wallet-recovery.html" hidden>Open QuantaPhi wallet sign-in</a></div><div class="status"><strong>X authorization</strong><p id="xStatus">Checking the Media Star connection...</p><p id="xHandle" class="muted"></p></div></section><p><button id="authorizeX" type="button" disabled>Authorize my X account</button></p><p id="actionStatus" role="status">Authorization only starts when you tap the button.</p><details><summary>Use a different X username</summary><p>This changes the claimed username for this wallet, not your actual X identity. X will verify it during authorization.</p><label for="xUsername">Your X username</label><div class="bar"><input id="xUsername" maxlength="15" autocapitalize="off" autocomplete="off" placeholder="@username"><button id="saveUsername" type="button" disabled>Save X username</button></div></details><p><a href="/connect-x?write=1">Enable posting, replies and likes (requires X developer Read and write permission)</a></p><p><a href="https://quantaphi.org/legal/privacy">X privacy policy</a> · <a href="https://quantaphi.org/legal/terms">Terms of Service</a></p></main><script>window.QuantaCloudConnectionDisableAutoRecovery=true;</script><script defer src="https://quantaphi.org/cloud-wallet-client.js"></script><script defer src="/connect-x.js"></script></body></html>';
 return new Response(html,{status:200,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self' https://media-star-following-spaces.marvaseater.workers.dev https://starquest-ledger.marvaseater.workers.dev https://unified-wallet.marvaseater.workers.dev; frame-src https://www-infinity4.github.io; form-action 'none'; frame-ancestors 'none'; base-uri 'none'"}});
}
const XO_CONNECT_JS=String.raw`
(function(){
 'use strict';
 const api='https://media-star-following-spaces.marvaseater.workers.dev';
 const $=id=>document.getElementById(id);
 const authButton=$('authorizeX'),saveButton=$('saveUsername');
 const wantsWrite=new URLSearchParams(window.location.search).get('write')==='1';
 if(wantsWrite)authButton.textContent='Authorize X posting';
 const set=(id,msg)=>{$(id).textContent=msg};
 let walletToken='',xAccount=null;
 async function getToken(){
  const bridge=window.QuantaCloudConnection;
  if(bridge?.ready)await Promise.race([bridge.ready,new Promise(resolve=>setTimeout(resolve,7500))]);
  const token=String(await bridge?.resolveDeviceToken?.()||'');
  return /^sq_[A-Za-z0-9_-]{32,}$/.test(token)?token:'';
 }
 async function request(path,method='GET',data){
  if(!walletToken)throw Error('Wallet sign-in required');
  const response=await fetch(api+path,{method,cache:'no-store',headers:{Authorization:'Bearer '+walletToken,'Content-Type':'application/json'},...(data===undefined?{}:{body:JSON.stringify(data)})});
  const json=await response.json().catch(()=>({}));
  if(!response.ok||json.error)throw Error(json.error||'Connection temporarily unavailable');
  return json;
 }
 async function refresh(){
  authButton.disabled=true;saveButton.disabled=true;
  try{
   walletToken=await getToken();
   if(!walletToken){
    set('walletStatus','No verified wallet session in this browser. Open the wallet sign-in, then return to this exact page.');
    $('walletLink').hidden=false;set('xStatus','Your X account will not be accessed until you sign in.');return;
   }
   $('walletLink').hidden=true;
   set('walletStatus','Verified wallet token found on this device.');
   const response=await request('/v1/x/account');
   xAccount=response.account||null;
   const handle=xAccount?.handle?'@'+xAccount.handle:'not selected';
   set('xHandle','Registered X username: '+handle);
   $('xUsername').value=xAccount?.handle||'';
   if(response.xConnected&&!(wantsWrite&&(!response.canPost||!response.canLike))){
    set('xStatus','Connected to X. Your authorization is saved securely.');
    set('actionStatus','X is connected. Use Media Star to sync your Following list.');
    authButton.hidden=true;
   }else{
    authButton.hidden=false;
    set('xStatus',response.oauthConfigured?'X developer credentials ready. Personal authorization is still required.':'X developer app credentials have not been configured yet.');
    authButton.disabled=!response.oauthConfigured||!xAccount?.handle;
    set('actionStatus',xAccount?.handle?'Tap Authorize my X account to open the official X consent page.':'Save your X username first.');
   }
   saveButton.disabled=false;
  }catch(e){set('xStatus','Could not verify account: '+String(e.message||e));set('actionStatus','No authorization was changed.')}
 }
 authButton.addEventListener('click',async()=>{
  authButton.disabled=true;
  set('actionStatus','Opening the official X authorization page. You may need to sign in to X.');
  try{
   const result=await request('/v1/x/oauth/start','POST',{write:wantsWrite});
   const target=new URL(result.authorizationUrl);
   if(target.origin!=='https://x.com'||target.pathname!=='/i/oauth2/authorize')throw Error('Unrecognized X destination');
   window.location.assign(target.href);
  }catch(e){set('actionStatus','Authorization did not start: '+String(e.message||e));authButton.disabled=false}
 });
 saveButton.addEventListener('click',async()=>{
  const handle=String($('xUsername').value||'').trim().replace(/^@/,'');
  if(!/^[A-Za-z0-9_]{1,15}$/.test(handle)){set('actionStatus','Enter a valid X username, without a URL.');return}
  saveButton.disabled=true;
  try{await request('/v1/x/account','POST',{handle});set('actionStatus','Username saved. Authorization still requires your approval on X.');await refresh()}
  catch(e){set('actionStatus','Username was not saved: '+String(e.message||e));saveButton.disabled=false}
 });
 void refresh();
})();
`;

const XO_REDIRECT='https://quantaphi.org/api/x/oauth/callback';
const XO_SCOPE='tweet.read users.read follows.read space.read offline.access';
const XO_WRITE_SCOPE=XO_SCOPE+' tweet.write like.write';
const XO_ENCODER=new TextEncoder();
const xoErr=(name,status=400)=>Object.assign(new Error(name),{status});
const xoB64=bytes=>btoa(Array.from(new Uint8Array(bytes),b=>String.fromCharCode(b)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const xoUnb64=text=>Uint8Array.from(atob(String(text).replace(/-/g,'+').replace(/_/g,'/')),x=>x.charCodeAt(0));
const xoHash=async text=>xoB64(await crypto.subtle.digest('SHA-256',XO_ENCODER.encode(text)));
const xoReady=e=>Boolean(e.X_OAUTH_CLIENT_ID&&e.X_OAUTH_CLIENT_SECRET&&e.X_OAUTH_ENCRYPTION_KEY);
async function xoKey(env){
 const raw=xoUnb64(env.X_OAUTH_ENCRYPTION_KEY||'');
 if(raw.byteLength!==32)throw xoErr('x_encryption_key_invalid',503);
 return crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);
}
async function xoSeal(env,text,owner){
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const value=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:XO_ENCODER.encode(owner)},await xoKey(env),XO_ENCODER.encode(text));
 return xoB64(iv)+'.'+xoB64(value);
}
async function xoOpen(env,text,owner){
 const parts=String(text||'').split('.');
 if(parts.length!==2)throw xoErr('x_invalid_ciphertext',503);
 try{
  return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:xoUnb64(parts[0]),additionalData:XO_ENCODER.encode(owner)},await xoKey(env),xoUnb64(parts[1])));
 }catch{throw xoErr('x_credential_decryption_failed',503)}
}
async function xoTokenRequest(env,params){
 const auth=btoa(env.X_OAUTH_CLIENT_ID+':'+env.X_OAUTH_CLIENT_SECRET);
 const r=await fetch('https://api.x.com/2/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+auth,'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(params),signal:AbortSignal.timeout(15000)});
 if(!r.ok)throw xoErr('x_token_exchange_failed',502);
 const j=await r.json();
 if(!j?.access_token||!Number.isFinite(Number(j.expires_in))||Number(j.expires_in)<=0)throw xoErr('x_invalid_token_response',502);
 return j;
}
async function xoSave(env,owner,token,profile,priorRefresh=''){
 const refresh=token.refresh_token||priorRefresh;
 const access=await xoSeal(env,token.access_token,owner);
 const encryptedRefresh=refresh?await xoSeal(env,refresh,owner):null;
 const expiry=Date.now()+Number(token.expires_in)*1000;
 await env.DB.prepare('INSERT INTO x_oauth_tokens(owner_id,x_user_id,x_handle,access_cipher,refresh_cipher,expires_at,scope,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(owner_id) DO UPDATE SET x_user_id=excluded.x_user_id,x_handle=excluded.x_handle,access_cipher=excluded.access_cipher,refresh_cipher=excluded.refresh_cipher,expires_at=excluded.expires_at,scope=excluded.scope,updated_at=excluded.updated_at').bind(owner,profile.id,profile.username,access,encryptedRefresh,expiry,String(token.scope||XO_SCOPE),Date.now()).run();
}
async function xoBegin(env,owner,{write=false}={}){
 if(!xoReady(env))throw xoErr('x_oauth_not_configured',503);
 const state=xoB64(crypto.getRandomValues(new Uint8Array(32)));
 const verifier=xoB64(crypto.getRandomValues(new Uint8Array(48)));
 const challenge=await xoHash(verifier);
 await env.DB.prepare('INSERT INTO x_oauth_pending(state_hash,owner_id,verifier_cipher,created_at,consumed_at) VALUES(?,?,?,?,NULL)').bind(await xoHash(state),owner,await xoSeal(env,JSON.stringify({verifier,write:write===true}),owner),Date.now()).run();
 const u=new URL('https://x.com/i/oauth2/authorize');
 for(const [k,v] of Object.entries({response_type:'code',client_id:env.X_OAUTH_CLIENT_ID,redirect_uri:XO_REDIRECT,scope:write===true?XO_WRITE_SCOPE:XO_SCOPE,state,code_challenge:challenge,code_challenge_method:'S256'}))u.searchParams.set(k,v);
 return {authorizationUrl:u.href,expiresInSeconds:600};
}
function xoPage(title,message,status=200){
 const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
 const html='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>'+escape(title)+' | QuantaPhi</title><style>body{background:#f7f4fb;color:#261c30;font:18px/1.6 system-ui;padding:24px}main{background:#fff;max-width:700px;margin:6vh auto;padding:28px;border-radius:16px}a{color:#5f259f}</style><main><h1>'+escape(title)+'</h1><p>'+escape(message)+'</p><a href="https://quantaphi.org/connect-x">Return to X connection</a></main></html>';
 return new Response(html,{status,headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'"}});
}
async function xoFinish(request,env){
 const url=new URL(request.url),state=url.searchParams.get('state')||'',code=url.searchParams.get('code')||'';
 if(url.searchParams.has('error'))return xoPage('Connection cancelled','No X connection was saved. Retry from Media Star.',400);
 if(!/^[A-Za-z0-9_-]{40,100}$/.test(state)||!code||code.length>2048)return xoPage('Invalid authorization','Please start a new authorization from Media Star.',400);
 if(!xoReady(env))return xoPage('X connection unavailable','The X developer credentials are not configured yet.',503);
 try{
  const digest=await xoHash(state),now=Date.now();
  const pending=await env.DB.prepare('SELECT owner_id,verifier_cipher,created_at,consumed_at FROM x_oauth_pending WHERE state_hash=?').bind(digest).first();
  if(!pending||pending.consumed_at!=null||pending.created_at>now||pending.created_at<now-600000)throw xoErr('x_state_invalid_or_expired',403);
  const claimed=await env.DB.prepare('UPDATE x_oauth_pending SET consumed_at=? WHERE state_hash=? AND consumed_at IS NULL AND created_at>=?').bind(now,digest,now-600000).run();
  if(Number(claimed.meta?.changes||0)!==1)throw xoErr('x_state_already_used',403);
  const encryptedVerifier=await xoOpen(env,pending.verifier_cipher,pending.owner_id);
  const verifier=encryptedVerifier.startsWith('{')?JSON.parse(encryptedVerifier).verifier:encryptedVerifier;
  if(!/^[A-Za-z0-9_-]{40,150}$/.test(verifier||''))throw xoErr('x_pkce_invalid',403);
  const token=await xoTokenRequest(env,{grant_type:'authorization_code',code,redirect_uri:XO_REDIRECT,code_verifier:verifier});
  const profileResponse=await fetch('https://api.x.com/2/users/me',{headers:{Authorization:'Bearer '+token.access_token},signal:AbortSignal.timeout(12000)});
  if(!profileResponse.ok)throw xoErr('x_profile_unavailable',502);
  const profile=(await profileResponse.json()).data;
  if(!profile?.id||!profile?.username)throw xoErr('x_profile_invalid',502);
  const declared=await env.DB.prepare('SELECT handle FROM x_account_links WHERE owner_id=?').bind(pending.owner_id).first();
  if(!declared||String(declared.handle).toLowerCase()!==profile.username.toLowerCase())throw xoErr('x_account_handle_mismatch',403);
  await xoSave(env,pending.owner_id,token,profile);
  return xoPage('X account connected','Media Star has securely saved this X authorization. You can now sync your Following list.');
 }catch(e){return xoPage('Connection not completed','No new X authorization was saved ('+String(e.message||'error')+'). Please retry.',e.status||500)}
}
async function xoOwnerToken(env,owner){
 const record=await env.DB.prepare('SELECT x_user_id,x_handle,access_cipher,refresh_cipher,expires_at FROM x_oauth_tokens WHERE owner_id=?').bind(owner).first();
 if(!record){
  if(env.X_OWNER_ID===owner&&env.X_USER_ACCESS_TOKEN)return env.X_USER_ACCESS_TOKEN;
  throw xoErr('x_account_not_connected',503);
 }
 if(record.expires_at>Date.now()+60000)return xoOpen(env,record.access_cipher,owner);
 if(!record.refresh_cipher)throw xoErr('x_reauthorization_required',401);
 if(!xoReady(env))throw xoErr('x_oauth_not_configured',503);
 const oldRefresh=await xoOpen(env,record.refresh_cipher,owner);
 const newToken=await xoTokenRequest(env,{grant_type:'refresh_token',refresh_token:oldRefresh});
 await xoSave(env,owner,newToken,{id:record.x_user_id,username:record.x_handle},oldRefresh);
 return newToken.access_token;
}
async function xoConnected(env,owner){
 const row=await env.DB.prepare('SELECT expires_at,refresh_cipher FROM x_oauth_tokens WHERE owner_id=?').bind(owner).first();
 return Boolean(row&&(row.refresh_cipher||row.expires_at>Date.now())||env.X_OWNER_ID===owner&&env.X_USER_ACCESS_TOKEN);
}
async function xoDisconnect(env,owner,confirmation){
 if(confirmation!=='DISCONNECT X')throw xoErr('explicit_disconnect_confirmation_required',400);
 await env.DB.prepare('DELETE FROM x_oauth_tokens WHERE owner_id=?').bind(owner).run();
 return {disconnected:true,alsoRevokeInXSettings:true,existingFollowingPreserved:true};
}
const XO_TERMS='<p>QuantaPhi offers experimental AI, research, Media Star, Bubbles, and token-ledger features. Use these features lawfully, respect intellectual property and other users, and keep your own sign-in credentials secure.</p><h2>Connected accounts</h2><p>Connecting X or another service is optional. The provider sets its own permissions, availability, and terms; you may disconnect your account. Connected third-party data should not be redistributed without permission.</p><h2>AI and content</h2><p>AI answers and generated code can contain errors; review important information and test software before relying on or deploying it. Media links are indexed original-source links, not guarantees that playback, embedding, or redistribution is permitted.</p><h2>Wallet and project units</h2><p>Quants, GIT, Bubble Bits, Star Coins, and other internal project units are experimental records. They are not automatically cash, legal tender, securities, or promises of redemption or investment return. Separate explicit purchase terms apply if paid transactions are offered.</p><h2>Safety, availability and changes</h2><p>Do not bypass authorization, falsify receipts, attack systems, or collect other users private information. Services may be temporarily unavailable or change; statutory rights remain unaffected. Revisions will be posted on this page.</p><h2>Contact</h2><p>See <a href="https://quantaphi.org/about.html">About QuantaPhi</a> and the official project repository. A dedicated private support address has not yet been published. Do not post secrets or private data in public GitHub issues.</p>';
const XO_PRIVACY='<p>This is the X/Media Star authorization notice. The general <a href="https://quantaphi.org/privacy.html">QuantaPhi privacy policy</a> also describes site analytics, advertising, AI services, and wallet records.</p><h2>What X access is requested</h2><p>With your consent, Media Star requests tweet.read, users.read, follows.read, space.read, and offline.access. It may use your X username, account ID, followed handles, and Space metadata for account verification and requested synchronization. X may provide only limited or partial content.</p><h2>Storage and security</h2><p>Short-lived OAuth state is kept in the existing Cloudflare D1 database for ten minutes. Access and refresh tokens are stored encrypted in that database for the linked QuantaPhi wallet account. Authorization tokens are not placed in public source code, local browser storage, or public media cards. The Cloudflare Worker exchanges and refreshes tokens server-side.</p><h2>Sharing, retention and choices</h2><p>X handles the authorization process, and Cloudflare hosts the service. Collected following lists, saved Space links, and playback history may remain after disconnecting until deleted by a supported account-data request. Disconnecting deletes QuantaPhi-stored X OAuth credentials, but you should separately revoke the app in your X settings. No universal retention deadline is promised.</p><h2>Questions</h2><p>See <a href="https://quantaphi.org/about.html">About QuantaPhi</a>. A private support address has not yet been published; do not send credentials in public issues.</p>';
function xoLegal(path){
 if(path!=='/legal/terms'&&path!=='/legal/privacy')return null;
 const isTerms=path==='/legal/terms',title=isTerms?'Terms of Service':'Privacy Policy';
 const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>'+title+' | QuantaPhi</title><style>:root{font-family:system-ui;color:#291f35;background:#f7f4fb}body{margin:0}main{max-width:850px;margin:20px auto;background:#fff;padding:clamp(20px,5vw,40px);border-radius:20px}p,li{line-height:1.7}a{color:#5f259f}nav{padding:20px;text-align:center}</style></head><body><nav><a href="https://quantaphi.org/">QuantaPhi</a> · <a href="/legal/privacy">Privacy</a> · <a href="/legal/terms">Terms</a></nav><main><h1>'+title+'</h1><p><strong>Effective November 5, 2026</strong></p>'+(isTerms?XO_TERMS:XO_PRIVACY)+'</main></body></html>';
 return new Response(html,{status:200,headers:{'Content-Type':'text/html;charset=utf-8','Cache-Control':'public,max-age=300','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"}});
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
