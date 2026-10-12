/* Followed Spaces Media Star — one eligible followed host roll then one episode. */
(()=>{'use strict';
const root=document.getElementById('followingSpacesRadio');if(!root)return;
const API='https://media-star-following-spaces.marvaseater.workers.dev';
const item=(tag,cls,str)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(str!==undefined)e.textContent=str;return e};
const state={following:[],hosts:[],featured:[],ownerAccount:null,xConnected:false,radio:{mode:'equal_hosts',includeFred:false},choice:null,loading:false,notice:'Loading your followed accounts…'};
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
 const box=root.querySelector('.fsr-episodes');if(!box)return;box.replaceChildren(item('p','','Loading indexed Spaces from @'+host.handle+'…'));
 try{
  const d=await query('/v1/episodes?handle='+encodeURIComponent(host.handle));
  box.replaceChildren(item('strong','',host.name+' · '+d.count+' indexed Spaces'));
  for(const episode of d.episodes.slice(0,120)){
   const line=item('div','fsr-episode');line.append(item('strong','',episode.title));
   if(episode.requiresOriginalUnlock){const a=button('Play episode',()=>requestFredEpisode(episode.id));line.append(a)}
   else if(episode.url)line.append(link(episode.url,'▶ Play recording on X'));
   box.append(line);
  }
  if(!d.episodes.length)box.append(item('p','','No recordings indexed for this person yet.'),link('https://x.com/'+host.handle,'View this person on X'));
 }catch(e){box.replaceChildren(item('p','',e.message||'Cannot load episodes'))}
}
function button(text,click,cls=''){const b=item('button',cls,text);b.type='button';b.onclick=click;b.disabled=state.loading;return b}
let selectedHandle='dotkrueger';
function mountInMediaStar(){
 const card=document.querySelector('#fredSpacesRadio .fs-card');
 if(!card)return;
 if(root.parentElement!==card)card.insertBefore(root,card.querySelector('.fs-stream'));
 // Fred's player and actions remain available only while Fred is selected.
 for(const child of card.children){
  if(child===root||child.classList.contains('fs-star-backdrop'))continue;
  child.hidden=selectedHandle.toLowerCase()!=='dotkrueger';
 }
}
async function choosePerson(handle){
 selectedHandle=handle;state.choice=null;render();
 if(handle.toLowerCase()==='dotkrueger')return;
 await browse({handle,name:state.following.find(p=>p.handle.toLowerCase()===handle.toLowerCase())?.name||handle});
}
function render(){
 root.replaceChildren();
 const panel=item('section','fsr-person-picker');
 panel.append(item('strong','','Choose a person'));
 const select=item('select');select.setAttribute('aria-label','Media Star person');
 const people=[{handle:'dotkrueger',name:'Fred Krueger'},...state.following.filter(p=>p.handle.toLowerCase()!=='dotkrueger')];
 for(const person of people){
  const option=item('option','',(person.name||person.handle)+' · @'+person.handle);
  option.value=person.handle;select.append(option);
 }
 select.value=selectedHandle;select.disabled=state.loading;
 select.onchange=()=>void choosePerson(select.value);
 panel.append(select,item('small','',state.following.length+' saved followed accounts · Fred included'));
 const episodes=item('div','fsr-episodes');panel.append(episodes);
 const status=item('p','fsr-status',state.notice);status.setAttribute('role','status');panel.append(status);
 const settings=item('details','fsr-import');settings.append(item('summary','','Update following list'));
 if(state.xConnected)settings.append(button('Sync my following',()=>void sync('following')));
 const handles=item('textarea');handles.setAttribute('aria-label','Followed X handles');
 handles.placeholder='Paste your followed @handles';
 settings.append(handles,button('Save following list',()=>void importFollowing(handles.value)));
 panel.append(settings);root.append(panel);mountInMediaStar();
}
const fredRoot=document.getElementById('fredSpacesRadio');
if(fredRoot)new MutationObserver(()=>mountInMediaStar()).observe(fredRoot,{childList:true});
render();void refresh();
})();
