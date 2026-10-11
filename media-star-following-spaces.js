/* Media Star: random followed host -> random indexed X Space.
 * Never bypasses Fred's paid Curio Spotlight and never mints coins on rolls. */
(()=>{'use strict';
const root=document.getElementById('mediaStarFollowingSpaces');if(!root)return;
const API='https://media-star-following-spaces.marvaseater.workers.dev';
const el=(tag,cls,label)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(label!==undefined)n.textContent=label;return n};
let accounts=[],selected='',busy=false,last=null,status='';
function container(title){const n=el('section','mfs-block');n.append(el('h3','',title));return n}
async function token(){
 const raw=await window.QuantaCloudConnection?.resolveDeviceToken?.();
 if(!/^sq_[A-Za-z0-9_-]{32,}$/.test(String(raw||'')))throw Error('Connect your existing QuantaPhi wallet to use your private followed list.');
 return raw;
}
async function api(path,method='GET',body){
 const t=await token();const response=await fetch(API+path,{method,cache:'no-store',headers:{'authorization':'Bearer '+t,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok||payload.ok===false)throw Error(payload.error||'Spaces service unavailable');
 return payload;
}
function msg(value){status=value;render()}
function followLines(raw){
 const names=[],seen=new Set();
 for(const line of String(raw).split(/[\r\n,]+/)){
  let candidate=line.trim().replace(/^@/,'');
  try{const url=new URL(candidate);if(['x.com','www.x.com','twitter.com','www.twitter.com'].includes(url.hostname))candidate=url.pathname.split('/').filter(Boolean)[0]}catch{}
  if(!/^[A-Za-z0-9_]{1,15}$/.test(candidate))continue;
  if(!seen.has(candidate.toLowerCase())){seen.add(candidate.toLowerCase());names.push(candidate)}
 }
 return names.slice(0,1000);
}
function parseEpisodes(raw){
 const rows=[],ids=new Set();
 for(const line of String(raw).split(/[\r\n]+/)){
  const m=line.match(/https:\/\/(?:x\.com|twitter\.com|www\.x\.com|www\.twitter\.com)\/i\/spaces\/[A-Za-z0-9]{8,35}/i);
  if(!m)continue;const url=m[0],id=url.split('/').pop();if(ids.has(id))continue;ids.add(id);
  const title=line.replace(url,'').replace(/^[\s|·—:-]+|[\s|·—:-]+$/g,'').slice(0,180)||'X Space recording';
  rows.push({url,title});
 }
 return rows.slice(0,120);
}
function render(){
 root.replaceChildren();
 const shell=el('article','mfs-card'),head=el('header','mfs-head');
 head.append(el('small','mfs-eyebrow','MEDIA STAR · FOLLOWED PEOPLE'),el('h2','','My Spaces Radio'));
 head.append(el('p','','Two real random rolls: one followed person, then one of their indexed Space episodes. Fred Curio stays the featured player.'));
 shell.append(head);
 const summary=el('p','mfs-summary',accounts.length+' followed account'+(accounts.length===1?'':'s')+' loaded · '+accounts.reduce((n,a)=>n+a.episodes,0)+' indexed Space links.');
 shell.append(summary);
 const controls=el('div','mfs-actions');
 const roll=el('button','mfs-primary','🎲 Roll a person + Space');roll.type='button';roll.disabled=busy||!accounts.some(a=>a.episodes);
 roll.onclick=async()=>{busy=true;render();try{last=await api('/v1/roll','POST',{rollId:crypto.randomUUID()});status='Two rolls recorded in your Media Star history.'}catch(e){status=e.message}finally{busy=false;render()}};
 const refresh=el('button','','↻ Sync my catalog');refresh.type='button';refresh.disabled=busy;
 refresh.onclick=async()=>{busy=true;render();try{accounts=(await api('/v1/following')).accounts||[];status='Followed catalog loaded.'}catch(e){status=e.message}finally{busy=false;render()}};
 const fred=el('a','mfs-link','★ Fred featured · Curio Spotlight');fred.href='#fredSpacesRadio';
 controls.append(roll,refresh,fred);shell.append(controls);
 if(last?.episode){
  const item=last.episode,feature=container('Selected recording');
  feature.append(el('p','mfs-roll','Person '+last.hostRoll.value+' of '+last.hostRoll.range+' → Space '+last.episodeRoll.value+' of '+last.episodeRoll.range));
  feature.append(el('strong','mfs-title',item.host+' (@'+item.handle+')'),el('p','',item.title));
  if(item.fredCurated){
   const link=el('a','mfs-link','▶ Open Fred Curio Spotlight to verify/unlock');link.href='#fredSpacesRadio';feature.append(link);
   feature.append(el('p','mfs-hint','Fred episodes use the existing StarCoin unlock service; this shuffle cannot expose locked replay links.'));
  }else if(item.url){
   const link=el('a','mfs-link','▶ Open original X Space');link.href=item.url;link.target='_blank';link.rel='noopener noreferrer';feature.append(link);
   feature.append(el('p','mfs-hint',item.playbackVerified?'Replay verified by the index reviewer.':'Link indexed, but X replay playback has not yet been verified.'));
  }
  shell.append(feature);
 }
 const roster=container('Followed account library');
 if(!accounts.length)roster.append(el('p','mfs-hint','Your X following list is not yet connected. Import your real followed handles below; none are guessed.'));
 for(const a of accounts){
  const btn=el('button','mfs-person',a.name+' @'+a.handle+' · '+a.episodes+' Space'+(a.episodes===1?'':'s')+(a.featured?' ★':''));
  btn.type='button';btn.disabled=busy;btn.setAttribute('aria-pressed',String(selected===a.id));
  btn.onclick=()=>{selected=a.id;render()};roster.append(btn);
 }
 shell.append(roster);
 const importBox=container('Import your followed people and their Spaces');
 const details=el('details','mfs-import'),summaryTitle=el('summary','','Manage my imports');details.append(summaryTitle);
 const follows=el('textarea');follows.id='mfsFollowing';follows.rows=3;follows.placeholder='@personone\n@persontwo\nhttps://x.com/anotherperson';follows.setAttribute('aria-label','Your X followed handles, one per line');
 const followBtn=el('button','','Import my followed handles');followBtn.type='button';
 followBtn.onclick=async()=>{
  const accountsIn=followLines(follows.value);
  if(!accountsIn.length){msg('Enter real followed X handles first.');return}
  followBtn.disabled=true;
  try{const d=await api('/v1/following/import','POST',{snapshotId:crypto.randomUUID(),replace:true,accounts:accountsIn});accounts=(await api('/v1/following')).accounts||[];msg(d.imported+' followed handles indexed (owner-provided, not verified from X).')}catch(e){msg(e.message)}
  finally{followBtn.disabled=false}
 };
 details.append(el('label','','Followed people (complete snapshot)'),follows,followBtn);
 const episodeText=el('textarea');episodeText.rows=3;episodeText.placeholder='Title | https://x.com/i/spaces/...';episodeText.setAttribute('aria-label','Original X Spaces links for the selected followed person');
 const episodeBtn=el('button','','Import Space links for selected person');episodeBtn.type='button';
 episodeBtn.onclick=async()=>{
  if(!selected){msg('Choose a followed person first.');return}
  const entries=parseEpisodes(episodeText.value);if(!entries.length){msg('No canonical X Space links found.');return}
  episodeBtn.disabled=true;
  try{const d=await api('/v1/spaces/import','POST',{hostId:selected,importId:crypto.randomUUID(),episodes:entries});accounts=(await api('/v1/following')).accounts||[];msg(d.submitted+' original links indexed. Playback is not yet confirmed.')}
  catch(e){msg(e.message)}finally{episodeBtn.disabled=false}
 };
 details.append(el('label','','Original replay URLs for '+(accounts.find(a=>a.id===selected)?.handle||'selected host')),episodeText,episodeBtn);
 details.append(el('p','mfs-hint','No X account permission has been granted to the importer. Only handles and links you supply are recorded. A verified X following sync needs a separately authorized integration.'));
 importBox.append(details);shell.append(importBox);
 if(status){const p=el('p','mfs-status',status);p.setAttribute('role','status');shell.append(p)}
 root.append(shell);
}
render();void api('/v1/following').then(d=>{accounts=d.accounts||[];render()}).catch(e=>{status=e.message;render()});
})();
