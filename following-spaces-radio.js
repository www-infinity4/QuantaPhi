/* Followed Spaces Media Star — one eligible followed host roll then one episode. */
(()=>{'use strict';
const root=document.getElementById('followingSpacesRadio');if(!root)return;
const API='https://media-star-following-spaces.marvaseater.workers.dev';
const item=(tag,cls,str)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(str!==undefined)e.textContent=str;return e};
const state={following:[],hosts:[],featured:[],ownerAccount:null,xConnected:false,radio:{mode:'equal_hosts',includeFred:false},choice:null,loading:false,notice:'Connect the existing wallet and sync your X following list. Fred stays highlighted separately.'};
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
async function refresh(preserveNotice=false){
 if(state.loading)return;
 state.loading=true;render();
 const previousNotice=state.notice;
 try{
  const requests=[query('/v1/following'),query('/v1/hosts'),query('/v1/featured'),query('/v1/x/account'),query('/v1/radio/preferences')];
  const results=await Promise.allSettled(requests),problems=[];
  const read=(index,name)=>{const result=results[index];if(result.status==='fulfilled')return result.value;problems.push(name+': '+String(result.reason?.message||result.reason));return null};
  const following=read(0,'Following list'),hosts=read(1,'Spaces'),featured=read(2,'Featured'),xAccount=read(3,'X account'),radio=read(4,'Radio settings');
  if(following)state.following=following.following||[];
  if(hosts)state.hosts=hosts.hosts||[];
  if(featured)state.featured=featured.featured||[];
  if(xAccount){state.ownerAccount=xAccount.account||null;state.xConnected=!!xAccount.xConnected}
  if(radio)state.radio=radio;
  state.notice=problems.length
   ?'Could not confirm all Media Star data: '+problems.join(' · ')+'. Counts may be incomplete.'
   :(preserveNotice?previousNotice:state.following.length+' imported follows for this wallet · '+state.hosts.length+' hosts with indexed Spaces.');
 }finally{state.loading=false;render()}
}
function picked(result){
 const c=result.roll;
 const panel=root.querySelector('.fsr-picked');if(!panel)return;
 panel.replaceChildren();
 const weighted=result.selectionMode==='episodes_weighted'||state.radio.mode==='episodes_weighted';
 const selection=weighted?'Episode-weighted curated radio':'Equal chance per followed host';
 panel.append(item('strong','fsr-label',selection+' · host '+c.hostRoll+'/'+c.hostRange+' · episode '+c.episodeRoll+'/'+c.episodeRange),
 item('h3','',c.title),
 item('p','',c.name+' · @'+c.handle+' · '+(c.availability==='verified_replay'?'Source marked replay-verified':'Indexed original X recording; may not contain playable audio')));
 if(c.requiresOriginalUnlock){
  panel.append(item('p','','Fred is curated through your original Media Star ledger. Owner preview or existing entitlement is checked there; other listeners confirm 1 StarCoin only if locked.'));
  const a=link('#fredSpacesRadio','▶ Play selected Fred episode in Curio Spotlight');a.target='_self';
  a.addEventListener('click',()=>requestFredEpisode(c.spaceId));
  panel.append(a);
 }else if(c.url){
  const player=item('div','fsr-embedded-player');
  const iframe=item('iframe');iframe.title='Original X Space playback · '+c.title;iframe.src=c.url;
  iframe.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups');
  iframe.setAttribute('allow','autoplay; fullscreen; encrypted-media');
  iframe.setAttribute('referrerpolicy','no-referrer');
  iframe.loading='eager';player.append(iframe);
  panel.append(player);
  const a=link(c.url,'▶ Play on X when the internal viewer cannot load');
  panel.append(a);
  panel.append(item('p','','The original publisher controls whether an X Space can play inside this card. The player may require a login or block embedding; it cannot be bypassed.'));
 }
 const controls=item('div','fsr-playback-controls');
 controls.append(button('✓ Heard it',()=>void reportPlayback('played',c.spaceId)),
 button('✕ No audio · skip this link',()=>void reportPlayback('unavailable',c.spaceId)));
 panel.append(controls);
 panel.hidden=false;
}
function requestFredEpisode(spaceId){
 window.dispatchEvent(new CustomEvent('phi:media-star:fred-selected',{detail:{spaceId}}));
 const fred=document.getElementById('fredSpacesRadio');
 fred?.scrollIntoView?.({behavior:'smooth',block:'start'});
}
async function reportPlayback(stateName,spaceId){
 try{
  await query('/v1/playback/report','POST',{spaceId,state:stateName});
  state.notice=stateName==='unavailable'?'Unplayable link removed from your future rolls.':'Thanks. This episode stays in your personal listened history.';
  if(stateName==='unavailable')state.choice=null;
  render();
 }catch(e){notice('Could not save playback feedback: '+String(e.message||e))}
}
async function spin(){
 if(state.loading)return;
 state.choice=null;state.loading=true;render();
 try{
  const id='r'+crypto.randomUUID().replaceAll('-','');
  const result=await query('/v1/roll','POST',{rollId:id});
  state.choice=result;
  state.notice='Rolled a new original recording; no coin was charged for this selection. Playback depends on the source.';
 }catch(e){state.notice=String(e.message||e)}
 finally{
  state.loading=false;render();
  if(state.choice){
   picked(state.choice);
   if(state.choice.roll?.requiresOriginalUnlock)requestFredEpisode(state.choice.roll.spaceId);
  }
 }
}
async function sync(type){
 if(state.loading)return;
 state.loading=true;render();
 try{
  const d=await query(type==='following'?'/v1/following/sync':'/v1/spaces/sync','POST',{});
  state.notice=type==='following'?('X following imported: '+d.imported+'.'):('X reported '+d.reportedSpaces+' records; indexed '+d.indexed+'. Replay availability still requires verification.');
 }catch(e){
  state.notice=e.message==='x_account_not_connected'?'An authorized X connection is not configured yet. You can import your followed handles below; this does not verify an X follow.':String(e.message||e);
 }finally{state.loading=false;render();await refresh(true)}
}
function parseFollowing(txt){
 return [...new Set(String(txt||'').split(/[\s,;]+/).map(x=>x.replace(/^https?:\/\/(?:x|twitter)\.com\//i,'').replace(/^@/,'').replace(/\/.*$/,'')).filter(x=>/^[A-Za-z0-9_]{1,15}$/.test(x)))].slice(0,500);
}
async function importFollowing(raw){
 const list=parseFollowing(raw);if(!list.length){notice('Add X handles separated by commas or new lines.');return}
 try{
  const answer=await query('/v1/following/import','POST',{following:list});
  state.notice=answer.imported+' accounts imported as user-supplied follows (not verified by X).';
  await refresh(true);
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
 try{const d=await query('/v1/space/import','POST',{importId:'imp'+crypto.randomUUID().replaceAll('-',''),episodes});
  state.notice=d.added+' Space URLs indexed; '+d.rejected.length+' rejected. Link indexing does not prove replay audio works.';
  await refresh(true);
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
 const ownerPanel=item('section','fsr-owner-profile');
 ownerPanel.append(item('strong','','My X Following account'));
 if(state.ownerAccount){
  const profile=state.ownerAccount;
  ownerPanel.append(item('p','','@'+profile.handle+' · '+(profile.verification==='x_api_verified'?'Connected and verified by X':'Account saved · X authorization not yet connected')));
  const path=link('https://x.com/'+profile.handle+'/following','Open my Following on X ↗');ownerPanel.append(path);
  if(!state.xConnected)ownerPanel.append(item('small','','Saving an X username does not authorize a live Following import. The counts below reflect only follows returned for this wallet session. Use the import form below until authorized X access is available.'));
 }else{
  ownerPanel.append(item('p','','Register your X @username to identify which Following list Media Star should use.'));
 }
 const accountSettings=item('details','fsr-profile-edit');
 accountSettings.append(item('summary','',''+(state.ownerAccount?'Change X account':'Set my X username')));
 const claimInput=item('input');claimInput.type='text';claimInput.maxLength=16;claimInput.placeholder='@username';
 claimInput.value=state.ownerAccount?'@'+state.ownerAccount.handle:'';
 claimInput.setAttribute('aria-label','X account username');
 accountSettings.append(claimInput);
 accountSettings.append(button('Save my X account',async()=>{
  const name=claimInput.value.trim().replace(/^@/,'');
  if(!/^[A-Za-z0-9_]{1,15}$/.test(name)){notice('Enter a valid X @username, up to 15 letters, numbers, or underscores.');return}
  try{
   const response=await query('/v1/x/account','POST',{handle:name});
   state.ownerAccount=response.account;state.notice='X username saved. Official X authorization must match this username before the full list can sync.';
   render();
  }catch(e){notice(String(e.message||e))}
 }));
 ownerPanel.append(accountSettings);card.append(ownerPanel);
 const featured=item('div','fsr-feature');
 featured.append(item('strong','','Featured · Fred Krueger'),item('p','','The original Fred Curio Spotlight stays highlighted, with its independent StarCoin unlocks.'));
 const fred=link('#fredSpacesRadio','Open Fred Media Star →');fred.target='_self';featured.append(fred);card.append(featured);
 const priority=state.featured.filter(p=>p.handle.toLowerCase()!=='dotkrueger');
 if(priority.length){
  const chosen=item('section','fsr-feature fsr-priority');
  chosen.append(item('strong','','Priority Spaces · Aequitas & Cardones'),
   item('p','','Each person has a separate host index. Public archive pages are research leads; only exact X Space links enter the shuffle.'));
  for(const p of priority){
   const row=item('div','fsr-source');
   row.append(item('strong','',p.name+' · @'+p.handle),
     item('small','',p.episodes+' indexed direct X Spaces'));
   if(p.archiveUrl){row.append(link(p.archiveUrl,'Browse public Spaces archive ↗'))}
   else{row.append(link('https://x.com/'+p.handle,'Open original X profile ↗'))}
   chosen.append(row);
  }
  card.append(chosen);
 }
 if(state.following.length){
  const following=item('section','fsr-following');
  following.append(item('h3','','My followed accounts · '+state.following.length));
  for(const person of state.following){
   const row=item('div','fsr-follow-row');
   const display=item('div','');display.append(item('strong','',person.name+' · @'+person.handle),
    item('small','',Number(person.episodes||0)+' indexed X Spaces · '+(person.source==='x_api_verified'?'X-verified following':'Imported following')));
   row.append(display,link('https://x.com/'+person.handle,'View X profile ↗'));following.append(row);
  }
  card.append(following);
 }
 const counts=item('div','fsr-grid');
 const followed=item('div','fsr-stat');followed.append(item('strong','',String(state.following.length)),item('small','','Followed accounts imported'));
 const eligible=item('div','fsr-stat');eligible.append(item('strong','',String(state.hosts.length)),item('small','','Accounts with indexed Spaces'));
 counts.append(followed,eligible);card.append(counts);
 const radioOpts=item('section','fsr-radio-settings');
 radioOpts.append(item('strong','','My curation settings'),item('p','','More recorded episodes = more chances in episode-weighted mode. Fred stays in the playlist even when not separately followed, if enabled.'));
 const mode=item('select');mode.setAttribute('aria-label','Curation shuffle mode');
 for(const [value,label] of [['episodes_weighted','Weight by number of unplayed recordings'],['equal_hosts','Equal chance for each host']]){
  const o=item('option','',label);o.value=value;mode.append(o);
 }
 mode.value=state.radio.mode;
 const fredLabel=item('label','fsr-radio-toggle'),include=item('input');include.type='checkbox';include.checked=!!state.radio.includeFred;
 fredLabel.append(include,item('span','',' Include original Fred Curio Spotlight episodes'));
 const save=button('Save my radio mix',async()=>{try{
  state.radio=await query('/v1/radio/preferences','POST',{mode:mode.value,includeFred:include.checked});
  state.notice='Your personal curation mix is saved.';await refresh(true);
 }catch(e){notice(e.message||String(e))}});
 radioOpts.append(mode,fredLabel,save);card.append(radioOpts);
 const controls=item('div','fsr-actions');
 const xSync=button(state.xConnected?'Sync my X following':'X sync needs authorization',()=>void sync('following'));
 xSync.disabled=xSync.disabled||!state.xConnected;
 const spaceSync=button('Discover X Spaces',()=>void sync('spaces'));
 spaceSync.disabled=spaceSync.disabled||!state.xConnected;
 const rollButton=button('▶ Roll & Play · new recording',()=>void spin(),'fsr-roll');
 rollButton.disabled=rollButton.disabled||!state.hosts.length;
 controls.append(xSync,spaceSync,rollButton);
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
 if(!state.hosts.length)card.append(item('p','fsr-empty','No indexed Spaces available for this wallet yet. Import followed handles and original Space links, or enable Fred Curio Spotlight in your radio settings.'));
 const details=item('details','fsr-import'),summary=item('summary','','Import followed list or saved Space links');
 details.open=!state.following.length&&!state.xConnected;
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
