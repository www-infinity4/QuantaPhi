/* Infinity Oracle Octaves Developer viewer.
 * Picture-first individual cards; original connected creators expand IN the card.
 * The creator DOM/iframe is mounted once, so unsent inputs survive card rotation.
 */
import {BUILDER_CARDS,nextDeveloperCardIndex} from './developer-carousel-core.mjs';
import {mountDeveloperDiscovery} from './developer-discovery.mjs';
import {buildOwnerDeveloperCard} from './owner-developer-card.mjs';
const root=document.getElementById('developerCarousel');
if(root){
 const stage=document.getElementById('developerCardStage');
 const previous=document.getElementById('developerCardPrevious');
 const next=document.getElementById('developerCardNext');
 const now=document.getElementById('developerCardNow');
 const status=document.getElementById('developerCardStatus');
 const picker=document.getElementById('developerCardPicker');
 const create=(tag,className,text)=>{
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(text!==undefined)el.textContent=text;
  return el;
 };
 function publisherCard(){
  const card=create('article','developer-quickcard');
  const frame=card.appendChild(create('iframe','developer-quickcard-frame'));
  frame.title='QuantaPhi original Quick Card publisher';
  frame.loading='lazy';
  frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.src='/quick-card-builder.html?developer=1';
  frame.addEventListener('load',()=>{
   try{
    const inner=frame.contentDocument;
    if(!inner?.documentElement)return;
    const fit=()=>{
     const height=Math.max(inner.documentElement.scrollHeight,inner.body?.scrollHeight||0);
     if(Number.isFinite(height)&&height>0)
      frame.style.height=Math.max(800,Math.min(6000,Math.ceil(height)))+'px';
    };
    fit();
    if(typeof ResizeObserver==='function'){
     const observer=new ResizeObserver(fit);
     observer.observe(inner.documentElement);
     if(inner.body)observer.observe(inner.body);
    }
   }catch{/* The original same-site builder link stays available. */}
  });
  const fallback=card.appendChild(create('p','developer-quickcard-fallback'));
  const link=fallback.appendChild(create('a',null,'Open the full Quick Card builder'));
  link.href='/quick-card-builder.html';
  return card;
 }
 const cards=BUILDER_CARDS.map((info,i)=>{
  const node=info.id==='quickCardBuilderInline'?publisherCard():info.id==='ownerEngineerCard'?buildOwnerDeveloperCard():document.getElementById(info.id);
  if(!node)return null; // Never generate a fake replacement for a missing builder.
  node.dataset.developerCard=info.id;
  const slide=create('article','developer-slide');
  slide.dataset.builderId=info.id;
  slide.setAttribute('role','group');
  slide.setAttribute('aria-label',info.label+' original Quick Card');
  slide.hidden=true;
  const visual=slide.appendChild(create('div','developer-visual'));
  const art=visual.appendChild(create('div','developer-cover-art'));
  art.dataset.mode=info.artMode||'contain';
  const picture=art.appendChild(create('img','developer-cover-image'));
  picture.src=info.image;picture.alt=info.imageAlt||info.label+' artwork';
  picture.loading='lazy';picture.decoding='async';
  picture.addEventListener('error',()=>{picture.hidden=true;art.classList.add('developer-art-unavailable')},{once:true});
  const copy=visual.appendChild(create('div','developer-cover-copy'));
  copy.append(
   create('small','developer-cover-kicker','INFINITY® · ORACLE OCTAVES'),
   create('h3','developer-cover-title',info.label),
   create('p','developer-cover-description',info.description)
  );
  if(info.id==='ownerEngineerCard'){
   const gptLink=create('a','developer-gpt-action','Create with GPT');
   gptLink.href='/website-viewer.html?site=chatgpt';
   visual.appendChild(gptLink);
  }
  const toggle=slide.appendChild(create('button','developer-studio-toggle',info.action+' · in this card'));
  toggle.type='button';
  const editor=slide.appendChild(create('div','developer-editor'));
  editor.id='developerEditor'+i;
  editor.hidden=true;
  toggle.setAttribute('aria-controls',editor.id);
  toggle.setAttribute('aria-expanded','false');
  // Reparent the real original once. Do not detach it during navigation.
  editor.appendChild(node);
  toggle.addEventListener('click',()=>{
   const opening=editor.hidden;
   editor.hidden=!opening;
   toggle.setAttribute('aria-expanded',String(opening));
   toggle.textContent=opening?'Hide builder · keep my draft':info.action+' · in this card';
   if(opening&&info.id==='quickCardBuilderInline'){
    const iframe=editor.querySelector('iframe.developer-quickcard-frame');
    if(iframe)iframe.loading='eager';
   }
  });
  stage.appendChild(slide);
  return {...info,node,slide,editor,toggle};
 }).filter(Boolean);
 let current=null,index=0,discovery=null;
 const resourceIds=new Set();
 const addResources=items=>{
  let first=-1;
  for(const resource of items){
   if(!resource?.id||resourceIds.has(resource.id)||cards.length>=6000)continue;
   resourceIds.add(resource.id);
   if(first<0)first=cards.length;
   cards.push({id:resource.id,label:resource.label,description:resource.description,kind:'resource',resource});
  }
  return first;
 };
 const selectors=cards.map((card,i)=>{
  const button=create('button','developer-card-choice');
  button.type='button';
  button.setAttribute('aria-label',card.label);
  button.setAttribute('aria-controls','developerCardStage');
  button.appendChild(create('span','developer-choice-dot'));
  button.addEventListener('click',()=>show(i));
  picker.appendChild(button);
  return button;
 });
 function show(nextIndex){
  if(!cards.length)return;
  const target=cards[nextIndex];
  if(current===target)return;
  cards.forEach(card=>{if(card.slide)card.slide.hidden=card!==target;});
  if(target.kind==='resource')discovery?.render(target.resource);
  else discovery?.hide();
  current=target;index=nextIndex;
  now.textContent=target.label;
  stage.setAttribute('aria-label',target.label+' original builder');
  status.textContent=(nextIndex+1)+' of '+cards.length+' · '+target.description;
  selectors.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  previous.disabled=next.disabled=cards.length<2;
 }
 previous.addEventListener('click',()=>show(nextDeveloperCardIndex(index,-1,cards.length)));
 next.addEventListener('click',()=>show(nextDeveloperCardIndex(index,1,cards.length)));
 // Only the cover accepts horizontal swipe; swiping on a form or nested player
 // must never change the card or erase an in-progress task.
 let touch=null;
 stage.addEventListener('touchstart',event=>{
  if(event.touches.length!==1||!event.target.closest('.developer-visual')){touch=null;return;}
  touch={x:event.touches[0].clientX,y:event.touches[0].clientY};
 },{passive:true});
 stage.addEventListener('touchend',event=>{
  if(!touch||!event.changedTouches.length)return;
  const dx=event.changedTouches[0].clientX-touch.x;
  const dy=event.changedTouches[0].clientY-touch.y;touch=null;
  if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.5)
   show(nextDeveloperCardIndex(index,dx>0?-1:1,cards.length));
 },{passive:true});
 // Official source references are genuine cards; GitHub records appear only
 // after an actual API response. Never synthesize counts or import code.
 discovery=mountDeveloperDiscovery({root,stage,addResources,showIndex:show});
 const requested=(()=>{try{return new URL(location.href).searchParams.get('card')}catch{return null}})();
 const requestedIndex=cards.findIndex(card=>card.id===requested);
 if(cards.length){
  show(requestedIndex>=0?requestedIndex:0);
  if(requestedIndex>=0){
   // Shared builder links may open the real editor directly, without a redirect.
   cards[requestedIndex].toggle.click();
   requestAnimationFrame(()=>root.scrollIntoView({block:'start',behavior:'instant'}));
  }
 }else{
  status.textContent='Original developer tools are currently unavailable.';
  previous.disabled=next.disabled=true;
 }
}
