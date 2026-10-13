/* Terra Phi and Petra Phi: one selection at a time, one automatic collection. */
(function(){
'use strict';
const mount=document.getElementById('halloweenPhi');if(!mount)return;mount.hidden=false;
const STARS='quantaPhi:halloweenStars:v1',COLLECTED='quantaPhiCollected';
const e=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n};
const append=(p,c)=>{p.append(c);return c};
const valid=raw=>{try{const u=new URL(String(raw||''),location.origin);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return''}};
const read=k=>{try{const v=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(v)?v:[]}catch{return[]}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
const project=()=>window.PhiProjectPackage;
const link=(p,label,url)=>{const u=valid(url);if(!u)return;const a=append(p,e('a',label,'hphi-btn'));a.href=u;a.target='_blank';a.rel='noopener noreferrer';return a};
const button=(p,label,fn)=>{const b=append(p,e('button',label));b.type='button';b.onclick=fn;return b};
const deck=append(mount,e('div',undefined,'hphi-deck'));
function ensure(){return project()?.active()||project()?.newToken('Terra & Petra collection')}
const filmSlots=new Map();
window.QuantaPhiHalloweenPlayer=Object.freeze({setArchiveMovie(id,identifier){const slot=filmSlots.get(id);if(!slot||!slot.approved.has(identifier))return false;slot.play('https://archive.org/embed/'+encodeURIComponent(identifier));return true}});
function actions(card,c){
 const controls=append(card,e('div',undefined,'hphi-controls'));
 const star=append(controls,e('button','☆ Star')),collect=append(controls,e('button','Collect')),share=append(controls,e('button','Share'));
 for(const b of [star,collect,share])b.type='button';
 const status=append(card,e('p','StarQuest rewards are requested through the connected host wallet.','hphi-status'));status.setAttribute('role','status');
 const key='halloween-phi|'+c.id;
 const info={key,type:'Halloween Phi',title:c.title,story:c.description,sourceUrl:location.origin+c.studioPath,media:c.movie?.watchUrl||''};
 const paint=()=>{star.textContent=read(STARS).includes(key)?'★ Starred':'☆ Star';collect.textContent=read(COLLECTED).some(x=>x?.key===key)?'Collected ✓':'Collect';};
 const credit=(kind,k,data)=>{
   try{const result=window.QuantaStarCredit?.(kind,k,data);return result?.awarded?'Ledger confirmed reward.':result?.pending?'Wallet reward pending server confirmation.':'Saved locally; wallet credit not confirmed.';}
   catch{return 'Saved locally; wallet service did not confirm a credit.'}
 };
 star.addEventListener('click',()=>{
   const items=read(STARS);
   if(!items.includes(key)&&!save(STARS,[...items,key])){status.textContent='Unable to save Star; no credit requested.';return;}
   paint();status.textContent=credit('star',key,info);
 });
 collect.addEventListener('click',()=>{
   const items=read(COLLECTED),old=items.find(x=>x?.key===key);
   const entry=old||{...info,createdAt:new Date().toISOString(),collectedAt:new Date().toISOString(),generator:'halloween-phi'};
   if(!old){
     if(!save(COLLECTED,[...items,entry].slice(-1000))){status.textContent='Unable to collect; no credit requested.';return;}
     window.dispatchEvent(new CustomEvent('quantaphi:collected',{detail:{...entry,kind:'card',originCard:c.id}}));
   }
   const captured=project()?.capture({kind:'card',title:c.title,sourceUrl:info.sourceUrl,description:c.description,originCard:c.id});
   paint();status.textContent=credit('collect',key,entry)+(captured?.ok?' · Added to project.':'');
 });
 share.addEventListener('click',async()=>{
   if(share.disabled)return;share.disabled=true;
   const url=location.origin+'/#'+c.id;
   try{
     if(navigator.share){await navigator.share({title:c.title,text:c.subtitle,url});status.textContent='Share completed. '+credit('share',key+':'+Date.now(),{...info,shareUrl:url});}
     else if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);status.textContent='Direct card link copied; share credit is not awarded for copying.';}
     else status.textContent='Share this card: '+url;
   }catch(x){status.textContent=x?.name==='AbortError'?'Share canceled, no credit requested.':'Sharing failed; no credit requested.';}
   finally{share.disabled=false}
 });
 paint();
}

function render(c){
 const card=append(deck,e('article',undefined,'hphi-card'));card.id=c.id;card.dataset.card=c.id;card.setAttribute('aria-label',c.title+' cinema and art');
 append(card,e('span','INFINITY 2026® · ORACLE OCTAVES · CURIO CINEMA','hphi-brand'));append(card,e('h2',c.title));append(card,e('p',c.subtitle,'hphi-subtitle'));append(card,e('p',c.description));
 const bar=append(card,e('div',undefined,'hphi-project-strip'));const note=append(bar,e('p','','hphi-project-note'));note.setAttribute('role','status');
 button(bar,'＋ New token',()=>{const next=project()?.newToken('Terra & Petra collection');note.textContent=next?'Previous collection saved. New collection started.':'Project storage unavailable.';refresh()});
 link(bar,'My collection ↗','/project-workspace/');
 const refresh=()=>{const p=project()?.active();note.textContent=p?'Collection token '+p.id.slice(-6)+' · '+p.assets.length+' items. Both cards collect here. New token keeps this collection and starts another.':'Collection storage unavailable.'};
 ensure();window.addEventListener('phi-projects:changed',refresh);refresh();
 append(card,e('p','Collection tokens are device-local project drafts; opening this card does not mint a wallet coin.','hphi-note'));
 const controls=append(card,e('div',undefined,'hphi-controls'));let type='video',position=0,filter=c.id==='terriphi'?'youtube':'archive';let movies=c.movies||[],images=c.images||[];
 const imageBtn=button(controls,'Images',()=>{type='image';position=0;paint()});const videoBtn=button(controls,'Videos',()=>{type='video';position=0;paint()});
 const provider=append(controls,e('select'));provider.setAttribute('aria-label',c.title+' movie source');for(const [value,label] of [['youtube','YouTube · 1970–1990'],['archive','Internet Archive'],['all','Both sources']]){const o=append(provider,e('option',label));o.value=value;}provider.value=filter;provider.onchange=()=>{filter=provider.value;position=0;paint()};
 const media=append(card,e('section',undefined,'hphi-film'));const navigation=append(card,e('div',undefined,'hphi-controls'));const count=append(card,e('p','','hphi-status'));count.setAttribute('role','status');
 const items=()=>type==='image'?images:movies.filter(x=>filter==='all'||x.provider===filter);
 const current=()=>items()[position%Math.max(1,items().length)];
 // The player lives INSIDE the selected movie, rather than several controls below it.
 const player=e('div',undefined,'hphi-player-host');
 function play(source,title){
  const m=typeof source==='string'?{embedUrl:source,watchUrl:source,title:title||c.title,provider:'archive'}:source;
  if(!m)return;
  const embed=valid(m.embedUrl),original=valid(m.watchUrl)||embed;
  player.replaceChildren();
  const status=append(player,e('p','Loading '+(m.title||'movie')+' here…','hphi-player-status'));status.setAttribute('role','status');
  const frame=()=>{
   if(!embed){status.textContent='No embeddable player is available for this edition.';return}
   player.querySelector('video')?.pause();
   player.querySelector('video')?.remove();
   player.querySelector('iframe')?.remove();
   const u=new URL(embed);
   if(u.hostname==='www.youtube-nocookie.com'||u.hostname==='www.youtube.com'){
    u.searchParams.set('autoplay','1');u.searchParams.set('playsinline','1');u.searchParams.set('rel','0');
   }else if(u.hostname==='archive.org'||u.hostname==='www.archive.org')u.searchParams.set('autoplay','1');
   else{status.textContent='This source cannot be embedded. Use Watch at source.';return}
   const f=append(player,e('iframe'));f.src=u.href;f.title=(m.title||c.title)+' full movie';f.loading='eager';
   f.allow='autoplay; encrypted-media; fullscreen; picture-in-picture';f.allowFullscreen=true;f.referrerPolicy='strict-origin-when-cross-origin';
   status.textContent='Movie player opened here. Tap its Play button if your browser requires it.';
  };
  if(m.provider==='archive'&&valid(m.originalMediaUrl||m.mediaUrl)){
   const src=valid(m.originalMediaUrl||m.mediaUrl);
   const v=append(player,e('video'));v.controls=true;v.playsInline=true;v.preload='metadata';v.src=src;
   v.setAttribute('aria-label',m.title+' full movie');v.addEventListener('error',()=>{status.textContent='Original video file did not load; opening its Archive player.';frame()},{once:true});
   try{const request=v.play();if(request?.catch)request.catch(()=>{status.textContent='Press Play on the movie controls to start.'})}catch(_){status.textContent='Press Play on the movie controls to start.'}
  }else frame();
  const fallback=append(player,e('div',undefined,'hphi-player-alternatives'));
  if(m.provider==='archive'&&embed)button(fallback,'Try Archive player',()=>frame());
  if(original)link(fallback,'Watch at source ↗',original);
  if(player.isConnected)player.scrollIntoView({block:'nearest',behavior:'auto'});
 }
 filmSlots.set(c.id,{approved:new Set(c.approvedArchiveIds||[]),play});
 button(navigation,'← Previous',()=>{const n=items().length;position=n?(position+n-1)%n:0;paint()});button(navigation,'Next →',()=>{position=(position+1)%Math.max(1,items().length);paint()});
 const collected=button(navigation,'＋ Collect selection',()=>{const m=current();if(!m)return;ensure();const r=project()?.capture({kind:type,title:m.title,sourceUrl:m.watchUrl||m.source,imageUrl:m.imageUrl||m.src,description:m.description,license:m.license||m.rightsNote,year:m.year,originCard:c.id});count.textContent=r?.ok?(r.duplicate?'Already in collection ✓':'Added to collection ✓'):(r?.reason||'Collection storage unavailable.');});
 const watch=button(navigation,'▶ Watch movie here',()=>{const m=current();if(type!=='video'){count.textContent='Choose Videos first.';return}if(m?.embedUrl)play(m)});
 let archivePage=1;const more=button(navigation,'More Archive movies',async()=>{if(more.disabled)return;more.disabled=true;count.textContent='Loading the Archive horror catalog…';
  try{const q='collection:feature_films AND mediatype:movies AND (subject:horror OR subject:Horror)';const u=new URL('https://archive.org/advancedsearch.php');u.searchParams.set('q',q);u.searchParams.set('output','json');u.searchParams.set('rows','24');u.searchParams.set('page',String(archivePage));['identifier','title','description','year'].forEach(v=>u.searchParams.append('fl[]',v));u.searchParams.append('sort[]','downloads desc');
   const response=await fetch(u,{signal:AbortSignal.timeout(20000)});if(!response.ok)throw Error('Archive catalog unavailable');const data=await response.json();let added=0;for(const m of data.response?.docs||[]){if(!/^[A-Za-z0-9_.-]{1,150}$/.test(m.identifier)||movies.some(x=>x.id===m.identifier))continue;const description=String(Array.isArray(m.description)?m.description[0]:m.description||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,650);movies.push({id:m.identifier,title:String(m.title||m.identifier).slice(0,180),year:m.year,provider:'archive',watchUrl:'https://archive.org/details/'+m.identifier,embedUrl:'https://archive.org/embed/'+m.identifier,imageUrl:'https://archive.org/services/img/'+m.identifier,description:description||'An Archive catalog selection. Read the original item for its edition and source details.',rightsNote:'Additional Archive catalog entry. Uploader rights and edition have not been reviewed.'});added++}archivePage++;filter='archive';provider.value=filter;type='video';position=Math.max(0,movies.filter(x=>x.provider==='archive').length-added);paint();count.textContent=added+' additional Archive catalog movies loaded. Original uploader descriptions; these are separate from the curated opening selections.';
  }catch(error){count.textContent=error.message+'. Curated films remain available.'}finally{more.disabled=false}});
 function paint(){player.replaceChildren();media.replaceChildren();const m=current();imageBtn.setAttribute('aria-pressed',String(type==='image'));videoBtn.setAttribute('aria-pressed',String(type==='video'));provider.hidden=type==='image';more.hidden=type==='image';watch.hidden=type==='image';collected.disabled=!m;if(!m){media.append(e('p','No selections in this source.'));return}
  const src=valid(m.imageUrl||m.src);if(src){const img=append(media,e('img',undefined,'hphi-feature-image'));img.src=src;img.alt=m.title||'Source artwork';img.loading='lazy';img.onerror=()=>{img.hidden=true;count.textContent='This source image is unavailable. The original source and collection controls still work.'};}
  append(media,e('span',(type==='image'?'IMAGE':'FULL MOVIE')+' · '+(m.provider==='youtube'?'YOUTUBE':m.provider==='archive'?'INTERNET ARCHIVE':'SOURCE ART')+(m.year?' · '+m.year:''),'hphi-brand'));append(media,e('h3',m.title));if(m.publisher)append(media,e('p',m.publisher,'hphi-note'));append(media,e('p',m.description||m.title));
   if(type==='video'&&m.embedUrl){
    const tap=button(media,'▶ Play movie here',()=>play(m));tap.classList.add('hphi-play-now');
    append(media,player);
   }
   append(media,e('p',m.rightsNote||m.license||'Source reference; see original for reuse information.','hphi-credit'));link(media,'Original source ↗',m.watchUrl||m.source);
   count.textContent=(position+1)+' of '+items().length+' '+(type==='image'?'images':'movies')+' · collect favorites into the current token.';
 }
 paint();
 const create=append(card,e('details',undefined,'hphi-studio'));append(create,e('summary','Create · image generator & reel editor'));
 const label=append(create,e('label','Describe your artwork'));const prompt=append(label,e('textarea'));prompt.setAttribute('aria-label',c.title+' artwork instructions');prompt.placeholder='Make a striking original horror cinema advertisement…';prompt.rows=3;
 const generationStatus=append(create,e('p','','hphi-status'));generationStatus.setAttribute('role','status');const generated=append(create,e('img',undefined,'hphi-feature-image'));generated.hidden=true;
 const generate=button(create,'Generate real artwork',async()=>{if(generate.disabled)return;if(!prompt.value.trim()){generationStatus.textContent='Describe the artwork first.';return}const renderer=window.PhiVisualRender;if(!renderer){generationStatus.textContent='Image service adapter has not loaded. Reload this page.';return}ensure();const projectId=project()?.active()?.id;generate.disabled=true;generationStatus.textContent='Rendering with Cloudflare Workers AI…';
  try{const description=prompt.value.trim().slice(0,3000);const wording=window.PhiImageLanguage?.infer(description,'Advertisement','')?.text||'';const plan=await renderer.direct({description,mode:'Advertisement',vision:'',story:'',search:'',hasUpload:false,designFile:false,exactText:wording,preferences:''}).catch(()=>description);const result=await renderer.render({description,mode:'Advertisement',prompt:plan,exactText:wording});await renderer.validate(result.src);const src=wording?await renderer.composeExactText(result.src,wording,'Advertisement'):result.src;generated.src=src;generated.hidden=false;const blob=await renderer.asBlob(src);const saved=await project()?.captureFile(new File([blob],'curio-artwork.png',{type:blob.type}),c.id,projectId);generationStatus.textContent='Artwork rendered by '+result.renderer+'. '+(saved?.ok?'Saved to this collection.':'Image is displayed; collection save failed. Use Save artwork.');generated.dataset.source=src;
  }catch(error){generationStatus.textContent='Image not generated: '+String(error.message||error)}finally{generate.disabled=false}});
 button(create,'Save artwork',()=>{if(!generated.dataset.source){generationStatus.textContent='Generate artwork first.';return}const a=e('a');a.href=generated.dataset.source;a.download='curio-artwork.png';a.click()});
 button(create,'Open full Image Builder',()=>{window.PhiImageBuilder?.prefill(prompt.value||'Create an original horror cinema advertisement for '+(project()?.active()?.title||c.title));document.getElementById('phiImageBuilder')?.scrollIntoView({block:'start',behavior:'smooth'})});
 window.PhiCinemaReel?.mount(create,{title:c.title,current:()=>type==='video'?current():movies[0]});
 actions(card,c);
}
fetch('/halloween-phi-content.json?v=20261013-cinema',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Catalog unavailable');return r.json()}).then(data=>{if(data.schema!=='quantaphi.halloween-phi/v1')throw Error('Invalid catalog');data.cards.filter(c=>['terriphi','petriphi'].includes(c.id)).forEach(render)}).catch(error=>append(mount,e('p','Cinema catalog could not load: '+error.message,'hphi-status')));
})();
