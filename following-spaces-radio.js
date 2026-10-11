/* Followed Spaces Media Star — one eligible followed host roll then one episode. */
(()=>{'use strict';
const root=document.getElementById('followingSpacesRadio');if(!root)return;
const API='https://media-star-following-spaces.marvaseater.workers.dev';
const item=(tag,cls,str)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(str!==undefined)e.textContent=str;return e};
const state={following:[],hosts:[],choice:null,loading:false,notice:'Connect the existing wallet and sync your X following list. Fred stays highlighted separately.'};
let sessionRequest=null;
async function token(){return String(await window.QuantaCloudConnection?.resolveDeviceToken?.()||'')}
async function query(path,method='GET',data){
 const t=await token();if(!/^sq_[A-Za-z0-9_-]{32,}$/.test(t))throw Error('Connect your existing QuantaPhi wallet to load your personal followed list.');
 const response=await fetch(API+path,{method,headers:{'Authorization':'Bearer '+t,'Content-Type':'application/json'},
 cache:'no-store',...(data===undefined?{}:{body:JSON.stringify(data)})});
 const body=await response.json().catch(()=>({}));
 if(!response.ok||body.error)throw Error(body.error||'Space catalog temporarily unavailable');
 return body;
}
function notice(str){state.notice=str;const el=root.querySelector('.fsr-status');if(el)el.textContent=str}
function link(url,label){const a=item('a','',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a}
async function refresh(){
 if(state.loading)return;
 state.loading=true;render();
 try{const [following,hosts]=await Promise.all([query('/v1/following'),query('/v1/hosts')]);
  state.following=following.following||[];state.hosts=hosts.hosts||[];
  state.notice=state.following.length+' followed accounts in this library · '+state.hosts.length+' with indexed Space links.';
 }catch(e){state.notice=String(e.message||e)}
 finally{state.loading=false;render()}
}
function picked(result){
 const c=result.roll;
 const panel=root.querySelector('.fsr-picked');if(!panel)return;
 panel.replaceChildren();
 const hostRange=c.hostRange,episodeRange=c.episodeRange;
 panel.append(item('strong','fsr-label','ROLL '+c.hostRoll+' / '+hostRange+' · THEN '+c.episodeRoll+' / '+episodeRange),
 item('h3','',c.title),
 item('p','',c.name+' · @'+c.handle+' · '+(c.availability==='verified_replay'?'Reviewed replay status':'Indexed X Space link; playback on X is not guaranteed')));
 if(c.requiresOriginalUnlock){
  panel.append(item('p','','Fred remains in the original Curio Spotlight. The StarCoin unlock rules have not changed.'));
  const a=link('#fredSpacesRadio','Continue in Fred Media Star ↗');a.target='_self';panel.append(a);
 }else if(c.url){
  panel.append(link(c.url,'▶ Open the original X Space replay'));
  panel.append(item('p','','X may require sign-in or may no longer have audio. This player links to the original recording rather than rehosting it.'));
 }
 panel.hidden=false;
}
async function spin(){
 if(state.loading)return;
 state.loading=true;render();
 try{
  const id='r'+crypto.randomUUID().replaceAll('-','');
  const result=await query('/v1/roll','POST',{rollId:id});
  state.choice=result;
  state.notice='Randomly selected one followed person, then one of their indexed Space episodes. No StarCoin was charged.';
 }catch(e){state.notice=String(e.message||e)}
 finally{state.loading=false;render();if(state.choice)picked(state.choice)}
}
async function sync(type){
 if(state.loading)return;
 state.loading=true;render();
 try{
  const d=await query(type==='following'?'/v1/following/sync':'/v1/spaces/sync','POST',{});
  state.notice=type==='following'?('X following imported: '+d.imported+'.'):('X reported '+d.reportedSpaces+' records; indexed '+d.indexed+'. Replay availability still requires verification.');
 }catch(e){
  state.notice=e.message==='x_account_not_connected'?'An authorized X connection is not configured yet. You can import your followed handles below; this does not verify an X follow.':String(e.message||e);
 }finally{state.loading=false;render();await refresh()}
}
function parseFollowing(txt){
 return [...new Set(String(txt||'').split(/[\s,;]+/).map(x=>x.replace(/^https?:\/\/(?:x|twitter)\.com\//i,'').replace(/^@/,'').replace(/\/.*$/,'')).filter(x=>/^[A-Za-z0-9_]{1,15}$/.test(x)))].slice(0,500);
}
async function importFollowing(raw){
 const list=parseFollowing(raw);if(!list.length){notice('Add X handles separated by commas or new lines.');return}
 try{
  const answer=await query('/v1/following/import','POST',{following:list});
  state.notice=answer.imported+' accounts imported as user-supplied follows (not verified by X).';
  await refresh();
 }catch(e){notice(String(e.message||e))}
}
function parseSpaces(raw){
 const episodes=[];
 for(const line of String(raw||'').split(/\n+/)){
  const [handle,url,...rest]=line.split('|').map(x=>x.trim());
  if(handle&&url)episodes.push({handle:handle.replace(/^@/,''),url,title:rest.join(' | ').slice(0,250)||'X Space replay'});
 }
 return episodes.slice(0,100);
}
async function importSpaces(raw){
 const episodes=parseSpaces(raw);if(!episodes.length){notice('Use: @handle | https://x.com/i/spaces/SPACEID | Recorded Space title');return}
 try{const d=await query('/v1/space/import','POST',{episodes});
  state.notice=d.added+' Space URLs indexed; '+d.rejected.length+' rejected. Link indexing does not prove replay audio works.';
  await refresh();
 }catch(e){notice(String(e.message||e))}
}
async function browse(host){
 const box=root.querySelector('.fsr-episodes');box.replaceChildren(item('p','','Loading indexed Spaces from @'+host.handle+'…'));
 try{
  const d=await query('/v1/episodes?handle='+encodeURIComponent(host.handle));
  box.replaceChildren(item('strong','',host.name+' · '+d.count+' indexed Spaces'));
  for(const episode of d.episodes.slice(0,120)){
   const line=item('div','fsr-episode');line.append(item('strong','',episode.title));
   if(episode.requiresOriginalUnlock){const a=link('#fredSpacesRadio','Use Fred Media Star unlock →');a.target='_self';line.append(a)}
   else if(episode.url)line.append(link(episode.url,'Open original replay ↗'));
   box.append(line);
  }
  if(!d.episodes.length)box.append(item('p','','No direct X Space replay links indexed for this host yet.'));
 }catch(e){box.replaceChildren(item('p','',e.message||'Cannot load episodes'))}
}
function button(text,click,cls=''){const b=item('button',cls,text);b.type='button';b.onclick=click;b.disabled=state.loading;return b}
function render(){
 root.replaceChildren();const card=item('article','fsr-card'),head=item('div','fsr-head'),left=item('div');
 left.append(item('span','fsr-label','TWO-STAGE FOLLOWING RADIO'),item('strong','fsr-brand','⭐ Media Star'),item('h2','','Followed X Spaces · Radio'));
 head.append(left);card.append(head);
 const featured=item('div','fsr-feature');
 featured.append(item('strong','','Featured · Fred Krueger'),item('p','','The original Fred Curio Spotlight stays highlighted, with its independent StarCoin unlocks.'));
 const fred=link('#fredSpacesRadio','Open Fred Media Star →');fred.target='_self';featured.append(fred);card.append(featured);
 const counts=item('div','fsr-grid');
 const followed=item('div','fsr-stat');followed.append(item('strong','',String(state.following.length)),item('small','','Followed accounts imported'));
 const eligible=item('div','fsr-stat');eligible.append(item('strong','',String(state.hosts.length)),item('small','','Accounts with indexed Spaces'));
 counts.append(followed,eligible);card.append(counts);
 const controls=item('div','fsr-actions');
 controls.append(button('Sync my X following',()=>void sync('following')),
 button('Discover X Spaces',()=>void sync('spaces')),
 button('🎲 Roll a person → roll their Space',()=>void spin(),'fsr-roll'));
 card.append(controls);
 const current=item('div','fsr-picked');current.hidden=!state.choice;card.append(current);
 const status=item('p','fsr-status',state.notice);status.setAttribute('role','status');card.append(status);
 if(state.hosts.length){
  card.append(item('h3','','Browse followed accounts with indexed Spaces'));
  const hosts=item('div','fsr-hosts');
  for(const h of state.hosts){
   const b=button('@'+h.handle,()=>void browse(h));
   b.append(item('small','',h.count+' indexed Spaces'));hosts.append(b);
  }
  card.append(hosts,item('div','fsr-episodes'));
 }
 const details=item('details','fsr-import'),summary=item('summary','','Import followed list or saved Space links');
 details.append(summary,item('p','','For an X account without an authorized X API connection, paste the handles you follow. This is labeled a user-supplied list until X verifies it.'));
 const handles=item('textarea');handles.setAttribute('aria-label','Followed X handles');handles.placeholder='@PersonOne, @PersonTwo, @PersonThree';
 details.append(handles,button('Import my followed handles',()=>void importFollowing(handles.value)));
 details.append(item('p','','Import genuine X Space replay links from those handles; one link per line, with title. X controls actual replay availability.'));
 const links=item('textarea');links.setAttribute('aria-label','Space replay URLs');links.placeholder='@PersonOne | https://x.com/i/spaces/1xxxxxxxxxxxx | Episode title';
 details.append(links,button('Import Space links to Media Star',()=>void importSpaces(links.value)));card.append(details);
 root.append(card);if(state.choice)picked(state.choice);
}
render();void refresh();
})();
