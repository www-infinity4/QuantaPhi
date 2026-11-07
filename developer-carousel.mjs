/* Developer carousel: reparent the ORIGINAL interactive builder nodes.
 * They remain connected (even while parked in the hidden bank) so their
 * existing modules, event listeners, drafts, consent and moderation still work.
 */
import {BUILDER_CARDS,nextDeveloperCardIndex} from './developer-carousel-core.mjs';
const root=document.getElementById('developerCarousel');
if(root){
 const stage=document.getElementById('developerCardStage');
 const bank=document.getElementById('developerCardBank');
 const previous=document.getElementById('developerCardPrevious');
 const next=document.getElementById('developerCardNext');
 const now=document.getElementById('developerCardNow');
 const status=document.getElementById('developerCardStatus');
 const picker=document.getElementById('developerCardPicker');
 const create=(tag,className,text)=>{
  const el=document.createElement(tag);if(className)el.className=className;
  if(text!==undefined)el.textContent=text;return el;
 };
 function publisherCard(){
  const card=create('article','developer-quickcard');
  const hero=card.appendChild(create('header','developer-quickcard-hero'));
  const image=hero.appendChild(create('img'));
  image.src='/assets/phi-data-analyst.webp';image.alt='';image.loading='lazy';
  const copy=hero.appendChild(create('div'));
  copy.append(create('h3',null,'Build a Quick Card'),create('p',null,
   'Use the original QuantaPhi publisher right here. Published links work immediately, but Public / For You discovery requires approval.'));
  const frame=card.appendChild(create('iframe','developer-quickcard-frame'));
  frame.title='QuantaPhi original Quick Card publisher';
  frame.loading='lazy';
  frame.referrerPolicy='strict-origin-when-cross-origin';
  frame.src='/quick-card-builder.html?developer=1';
  const fallback=card.appendChild(create('p','developer-quickcard-fallback'));
  const link=fallback.appendChild(create('a',null,'Open the full Quick Card builder on QuantaPhi'));
  link.href='/quick-card-builder.html';
  return card;
 }
 const cards=BUILDER_CARDS.map(info=>{
  const node=info.id==='quickCardBuilderInline'?publisherCard():document.getElementById(info.id);
  if(!node)return null; // An unavailable original tool must never become a fake card.
  node.dataset.developerCard=info.id;
  bank.appendChild(node);
  return {...info,node};
 }).filter(Boolean);
 let current=null,index=0;
 const selectors=cards.map((card,i)=>{
  const button=create('button','developer-card-choice',card.label);
  button.type='button';button.setAttribute('aria-controls','developerCardStage');
  button.addEventListener('click',()=>show(i));
  picker.appendChild(button);return button;
 });
 function show(nextIndex){
  if(!cards.length)return;
  const target=cards[nextIndex];
  if(current===target)return;
  if(current)bank.appendChild(current.node);
  stage.appendChild(target.node);
  current=target;index=nextIndex;
  now.textContent=target.label;
  stage.setAttribute('aria-label',target.label+' original builder');
  status.textContent=(nextIndex+1)+' / '+cards.length+' · '+target.description;
  selectors.forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
  previous.disabled=next.disabled=cards.length<2;
 }
 previous.addEventListener('click',()=>show(nextDeveloperCardIndex(index,-1,cards.length)));
 next.addEventListener('click',()=>show(nextDeveloperCardIndex(index,1,cards.length)));
 // Swipe only when the movement is plainly horizontal; never intercept text
 // editing or scrolling inside a creator form or its embedded publisher.
 let touch=null;
 stage.addEventListener('touchstart',event=>{
  if(event.touches.length!==1||event.target.closest('input,textarea,select,[contenteditable],video,audio')){touch=null;return;}
  touch={x:event.touches[0].clientX,y:event.touches[0].clientY};
 },{passive:true});
 stage.addEventListener('touchend',event=>{
  if(!touch||!event.changedTouches.length)return;
  const dx=event.changedTouches[0].clientX-touch.x;
  const dy=event.changedTouches[0].clientY-touch.y;touch=null;
  if(Math.abs(dx)>70&&Math.abs(dx)>Math.abs(dy)*1.5)
   show(nextDeveloperCardIndex(index,dx>0?-1:1,cards.length));
 },{passive:true});
 // Preserve existing shared Oracle deep links when a builder moves here.
 // Selecting it only chooses this on-page original; it does not publish anything.
 const requested=(()=>{try{return new URL(location.href).searchParams.get('card')}catch{return null}})();
 const requestedIndex=cards.findIndex(card=>card.id===requested);
 if(cards.length)show(requestedIndex>=0?requestedIndex:0);
 else {
  status.textContent='The original developer tools are temporarily unavailable.';
  previous.disabled=next.disabled=true;
 }
}
