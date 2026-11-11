/* Optional, silent ShopPhi ad-story tray. It never pauses/restarts the original
 * movie/player and never autostarts merely because a person opened a card. */
import {normalizeStoryPage,storyStep,storySwipe,chooseContextualStories} from './shopphi-story-core.mjs';
export function createShopPhiStoryPlayer(mount){
 const el=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node};
 const root=el('section','shopphi-story-player');root.id='shopPhiStoryPlayer';root.hidden=true;
 root.setAttribute('aria-label','Optional related Quick Card stories');
 const heading=el('h3','shopphi-story-heading','Related card stories');
 const description=el('p','shopphi-story-info','Reviewed imagery, played once per card. Optional and silent.');
 const visual=el('div','shopphi-story-visual');visual.setAttribute('role','region');visual.setAttribute('aria-label','Selected Quick Card image');
 const image=el('img','shopphi-story-image');image.alt='';image.loading='lazy';image.decoding='async';
 const title=el('strong','shopphi-story-title');
 const positionLabel=el('span','shopphi-story-position');positionLabel.setAttribute('aria-live','polite');
 visual.append(image,title,positionLabel);
 const actions=el('div','shopphi-story-actions');
 const previous=el('button','shopphi-story-button','‹ Previous'),play=el('button','shopphi-story-button shopphi-story-play','Play stories'),
 next=el('button','shopphi-story-button','Next ›');
 for(const b of [previous,play,next])b.type='button';
 const link=el('a','shopphi-story-link','Open full Quick Card');link.target='_blank';link.rel='noopener noreferrer';
 actions.append(previous,play,next,link);root.append(heading,description,visual,actions);mount.append(root);
 let pages=[],cursor={card:0,slide:0,done:false},playing=false,timer=null;
 const reduce=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
 function stop(){playing=false;clearTimeout(timer);timer=null;play.textContent=cursor.done?'Replay stories':'Play stories';}
 function paint(){
  if(!pages.length){root.hidden=true;return;}
  root.hidden=false;
  const card=pages[cursor.card];image.src=card.images[cursor.slide];
  image.alt=card.title+' · image '+(cursor.slide+1)+' of '+card.images.length;
  title.textContent=card.title;
  positionLabel.textContent='Card '+(cursor.card+1)+'/'+pages.length+' · Image '+(cursor.slide+1)+'/'+card.images.length;
  link.href=card.url;link.rel=card.type==='sponsored'?'noopener noreferrer sponsored':'noopener noreferrer';
  link.textContent=card.type==='sponsored'?'Open reviewed advertisement':'Open full Quick Card';
  previous.disabled=cursor.card===0&&cursor.slide===0;
  next.disabled=cursor.done;
  play.textContent=playing?'Pause stories':cursor.done?'Replay stories':'Play stories';
 }
 function schedule(){
  clearTimeout(timer);timer=null;
  if(!playing||document.hidden||root.hidden){stop();return;}
  timer=setTimeout(()=>{
   cursor=storyStep(pages,cursor,1);paint();
   if(cursor.done)stop();else schedule();
  },reduce()?5000:4400);
 }
 function advance(direction){
  stop();cursor=storyStep(pages,cursor,direction);paint();
 }
 previous.addEventListener('click',()=>advance(-1));
 next.addEventListener('click',()=>advance(1));
 play.addEventListener('click',()=>{
  if(playing){stop();paint();return;}
  if(!pages.length)return;
  if(cursor.done)cursor={card:0,slide:0,done:false};
  playing=true;paint();schedule();
 });
 let gesture=null;
 visual.addEventListener('pointerdown',event=>{
  if(event.pointerType==='mouse'||event.target.closest('a,button,input,textarea,select,video,iframe,[contenteditable]'))return;
  gesture={id:event.pointerId,x:event.clientX,y:event.clientY};
 },{passive:true});
 visual.addEventListener('pointerup',event=>{
  if(!gesture||gesture.id!==event.pointerId)return;
  const direction=storySwipe(event.clientX-gesture.x,event.clientY-gesture.y,false);gesture=null;
  if(direction)advance(direction==='next'?1:-1);
 },{passive:true});
 visual.addEventListener('pointercancel',()=>{gesture=null});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
 window.addEventListener('pagehide',stop,{once:true});
 function setCards(candidates,context){
  stop();pages=chooseContextualStories(context,candidates).map(normalizeStoryPage).filter(Boolean);
  cursor={card:0,slide:0,done:false};
  paint();
 }
 return {root,setCards,stop};
}
