/* Two independent Halloween Phi experiences, backed by curated data.
   No automatic wallet credits, popups, or autoplay. */
(function(){
'use strict';
const mount=document.getElementById('halloweenPhi');
if(!mount)return;
if(new Date().getMonth()!==9&&!new URLSearchParams(location.search).has('halloweenPreview')){mount.hidden=true;return;}
const STARS='quantaPhi:halloweenStars:v1',COLLECTED='quantaPhiCollected';
const e=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=String(text);if(cls)n.className=cls;return n;};
const append=(p,c)=>{p.append(c);return c;};
const valid=raw=>{try{const u=new URL(String(raw||''),location.origin);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return''}};
const embed=raw=>{const u=valid(raw);return /^https:\/\/(www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]+|archive\.org\/embed\/[A-Za-z0-9_-]+)$/.test(u)?u:''};
const read=k=>{try{const x=JSON.parse(localStorage.getItem(k)||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));return true}catch{return false}};
const link=(parent,label,url)=>{const u=valid(url);if(!u)return null;const a=append(parent,e('a',label,'hphi-btn'));a.href=u;a.rel='noopener noreferrer';a.target='_blank';return a;};
const deck=append(mount,e('div',undefined,'hphi-deck'));
const project=()=>window.PhiProjectPackage;
function projectControls(card,c){
 const bar=append(card,e('div',undefined,'hphi-project-strip'));
 const plus=append(bar,e('button','＋ New token','hphi-project-new'));plus.type='button';
 const note=append(bar,e('span','','hphi-project-note'));note.setAttribute('role','status');
 const link=append(bar,e('a','Project page ↗','hphi-project-link'));link.href='/project-workspace/';
 const imageTile=append(bar,e('label',undefined,'hphi-upload-tile'));
 const imageInput=append(imageTile,e('input'));imageInput.type='file';imageInput.accept='image/png,image/jpeg,image/webp,image/gif,image/avif';imageInput.multiple=true;imageInput.setAttribute('aria-label','Add images to '+c.title+' project');
 append(imageTile,e('span','＋','hphi-upload-plus'));
 const uploadLabel=append(imageTile,e('span','Add images','hphi-upload-label'));
 const uploadPreview=append(imageTile,e('img',undefined,'hphi-upload-preview'));uploadPreview.hidden=true;uploadPreview.alt='Selected Halloween image';
 let preview='';
 imageInput.addEventListener('change',async()=>{
  const selected=Array.from(imageInput.files||[]).slice(0,8);imageInput.value='';
  if(!selected.length)return;
  if(!project()?.active()){note.textContent='Start or select a project token before adding images.';return}
  if(preview)URL.revokeObjectURL(preview);
  preview=URL.createObjectURL(selected[0]);uploadPreview.src=preview;uploadPreview.hidden=false;uploadLabel.textContent='Add more';
  let added=0,failures=[];
  for(const file of selected){
   const result=await project().captureFile(file,c.id);
   if(result.ok)added++;else failures.push(result.reason);
  }
  note.textContent=added+' image'+(added===1?'':'s')+' saved locally.'+(failures.length?' '+failures.join(' '):'');
 });
 const refresh=()=>{const active=project()?.active();note.textContent=active?'Collecting to '+active.title+' ('+active.assets.length+' sources)':'No project token selected'};
 plus.addEventListener('click',()=>{
  const started=project()?.newToken(c.title+' collection');
  note.textContent=started?'New local token draft created · '+started.title:'Project storage unavailable.';
  refresh();
 });
 window.addEventListener('phi-projects:changed',refresh);
 refresh();
}
const filmSlots=new Map();
const validArchiveId=id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,100}$/.test(id);
function mountFilm(host,url,title){
 host.replaceChildren();
 const f=append(host,e('iframe',undefined,'hphi-player'));
 f.src=url;f.title=title||'Film player';f.loading='lazy';
 f.allowFullscreen=true;f.allow='fullscreen; picture-in-picture';
 f.referrerPolicy='strict-origin-when-cross-origin';
 return f;
}
function movie(parent,c){
 const m=c.movie||{},section=append(parent,e('section',undefined,'hphi-film'));
 append(section,e('h3',m.title||'Halloween movie'));
 if(m.note)append(section,e('p',m.note,'hphi-note'));
 const controls=append(section,e('div',undefined,'hphi-controls'));
 const host=append(section,e('div',undefined,'hphi-player-host'));
 const src=embed(m.embedUrl);
 if(src){const b=append(controls,e('button',m.label||'Watch selected film'));b.type='button';
  b.addEventListener('click',()=>mountFilm(host,src,m.title||'Film player'));
 }
 link(controls,m.watchLabel||'View original movie source ↗',m.watchUrl);
 const collect=append(controls,e('button','＋ Collect movie','hphi-collect-asset'));collect.type='button';
 collect.addEventListener('click',()=>{
  const result=project()?.capture({kind:'video',title:m.title,sourceUrl:m.watchUrl,description:m.note,originCard:c.id});
  collect.textContent=result?.ok?(result.duplicate?'Already in project ✓':'Added to project ✓'):'＋ Collect movie';
  if(!result?.ok)append(section,e('p',result?.reason||'Start a project first.','hphi-status'));
 });
 const approved=new Set(Array.isArray(c.approvedArchiveIds)?c.approvedArchiveIds.filter(validArchiveId):[]);
 filmSlots.set(c.id,{host,approved});
}
window.QuantaPhiHalloweenPlayer=Object.freeze({
 setArchiveMovie(cardId,identifier){
  const slot=filmSlots.get(cardId);
  if(!slot||!validArchiveId(identifier)||!slot.approved.has(identifier))return false;
  mountFilm(slot.host,'https://archive.org/embed/'+encodeURIComponent(identifier),
   'Internet Archive screening: '+identifier);
  return true;
 }
});
function image(grid,image,cardId){
 const src=valid(image.src),source=valid(image.source);if(!src||!source)return false;
 const b=append(grid,e('button',undefined,'hphi-image'));b.type='button';b.title=image.title||'Preview historic artwork';
 const img=append(b,e('img'));img.src=src;img.alt=image.title||'Historic Halloween artwork';img.loading='lazy';img.referrerPolicy='no-referrer';
 b.addEventListener('click',()=>{
   const d=append(document.body,e('dialog',undefined,'hphi-image-dialog'));
   const close=append(d,e('button','Close'));close.addEventListener('click',()=>d.close());
   const large=append(d,e('img'));large.src=src;large.alt=img.alt;
   append(d,e('p',image.title||'Historic Halloween image'));
   append(d,e('p','Image license / credit: '+(image.license||'Check original source'),'hphi-credit'));
   const collect=append(d,e('button','＋ Collect image','hphi-collect-asset'));collect.type='button';
   collect.addEventListener('click',()=>{
     const result=project()?.capture({kind:'image',title:image.title,sourceUrl:source,imageUrl:src,license:image.license,year:image.year,originCard:cardId});
     collect.textContent=result?.ok?(result.duplicate?'Already in project ✓':'Added to project ✓'):(result?.reason||'Start a project first.');
   });
   link(d,'View original image and credit ↗',source);
   d.addEventListener('close',()=>d.remove(),{once:true});
   if(d.showModal)d.showModal();else d.open=true;
 });
 return true;
}
function gallery(c,grid,status,offset){
 const items=Array.isArray(c.images)?c.images:[];
 const shown=items.slice(offset,offset+2);
 for(const item of shown){
  // Never show an uncurated live-search result or an item without a pre-1940 date.
  if(Number.isInteger(item.year)&&item.year>=1800&&item.year<1940)image(grid,item,c.id);
 }
 status.textContent=grid.children.length+' vetted vintage images · tap one for source and rights.';
 return offset+shown.length;
}
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
 const card=append(deck,e('article',undefined,'hphi-card'));card.id=c.id;card.dataset.card=c.id;
 card.setAttribute('aria-label',c.title+' seasonal card');
 append(card,e('span','INFINITY 2026® · ORACLE OCTAVES · '+c.role,'hphi-brand'));
 append(card,e('h2',c.title));append(card,e('p',c.subtitle,'hphi-subtitle'));append(card,e('p',c.description));
 projectControls(card,c);
 movie(card,c);append(card,e('h3',c.feed?.title||'Halloween images'));
 const grid=append(card,e('div',undefined,'hphi-gallery'));
 const status=append(card,e('p','Loading image feed…','hphi-status'));status.setAttribute('role','status');
 const controls=append(card,e('div',undefined,'hphi-controls'));
 const more=append(controls,e('button','More images'));more.type='button';
 link(controls,'Browse source archive ↗',c.feed?.source);
 let offset=0;
 function next(){
  offset=gallery(c,grid,status,offset);
  more.hidden=offset>=(Array.isArray(c.images)?c.images.length:0);
 }
 more.addEventListener('click',next);next();
 const studio=append(card,e('details',undefined,'hphi-studio'));
 append(studio,e('summary',c.id==='terriphi'?'Play Haunted Door Hunt, spooky audio and costumes':'Open the poster creator and saved art gallery'));
 studio.addEventListener('toggle',()=>{if(!studio.open||studio.querySelector('iframe'))return;
   const frame=append(studio,e('iframe'));frame.src=c.id==='terriphi'?'/terriphi/':'/petriphi/';frame.title=c.title+' full interactive experience';frame.loading='lazy';});
 const path=c.id==='terriphi'?'/terriphi/':'/petriphi/';
 const a=append(studio,e('a','Open full '+c.title+' page ↗','hphi-btn'));a.href=path;
 actions(card,c);
}
fetch('/halloween-phi-content.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('content unavailable');return r.json();}).then(data=>{
 if(data.schema!=='quantaphi.halloween-phi/v1'||!Array.isArray(data.cards))throw Error('Invalid Halloween cards configuration');
 const cards=data.cards.filter(x=>x&&['terriphi','petriphi'].includes(x.id));
 if(cards.length!==2||new Set(cards.map(x=>x.id)).size!==2)throw Error('Two different seasonal cards required');
 cards.forEach(render);
 const h=location.hash.slice(1);if(h==='terriphi'||h==='petriphi')requestAnimationFrame(()=>document.getElementById(h)?.scrollIntoView({block:'start'}));
}).catch(error=>{append(mount,e('p','Halloween cards could not load the curated config. Please try again.','hphi-status'));console.warn('Halloween Phi:',error.message)});
})();