/* Source-backed Weedmaps Bruce Banner spotlight; editorial navigation only.
 * All links point to Weedmaps as the original publisher. Not a paid ad or
 * checkout/availability service. No wallet, user location, advertising ID or
 * identity document is ever accessed. */
import {BRUCE_BANNER_SOURCES,eligibleBannerSource,chooseBannerSource} from './bruce-banner-weedmaps.mjs';
const root=document.getElementById('bruceBannerWeedmapsCard');
if(root){
 const e=(tag,cls,text)=>{const out=document.createElement(tag);if(cls)out.className=cls;if(text!==undefined)out.textContent=text;return out};
 root.classList.add('bb-card');root.dataset.personalization='disabled';
 const header=e('div','bb-head');
 const kicker=e('p','bb-kicker','INFINITY® · 21+ PUBLISHER SPOTLIGHT');
 const title=e('h2','bb-title','Bruce Banner');
 const subtitle=e('p','bb-subtitle','ILLICIT collection · Weedmaps source references');
 header.append(kicker,title,subtitle);
 const intro=e('p','bb-intro','Explore the original Weedmaps strain and ILLICIT product-reference pages. Product details, prices and availability belong to the publisher.');
 const gate=e('button','bb-enter','I am 21+ · View Weedmaps sources');gate.type='button';
 const gateNote=e('p','bb-note','This is a visitor acknowledgment, not identity verification or consent to personalized cannabis advertising.');
 const viewer=e('section','bb-viewer');viewer.hidden=true;viewer.setAttribute('aria-label','ILLICIT Bruce Banner rotating Weedmaps references');
 const eyebrow=e('div','bb-eyebrow','PUBLISHED ON WEEDMAPS · INDEPENDENT SOURCE');
 const art=e('div','bb-art');
 const label=e('p','bb-art-label','WEEDMAPS REFERENCE');
 const hero=e('strong','bb-hero');
 const heroSub=e('p','bb-hero-sub');
 art.append(label,hero,heroSub);
 const copy=e('div','bb-copy');
 const badge=e('small','bb-format'),description=e('p','bb-description'),count=e('small','bb-count');
 copy.append(badge,description,count);
 const visit=e('a','bb-visit','View original on Weedmaps');
 visit.target='_blank';visit.rel='noopener noreferrer nofollow';visit.referrerPolicy='no-referrer';
 const nav=e('div','bb-controls'),pause=e('button','bb-action','Pause rotation'),next=e('button','bb-action','Next Weedmaps listing ›');
 for(const b of [pause,next])b.type='button';nav.append(pause,next);
 const note=e('p','bb-note','Independent QuantaPhi source showcase, not a paid ILLICIT or Weedmaps advertisement. Prices, delivery and nearby availability are not verified. Cannabis smoke can harm lungs.');
 const close=e('button','bb-close','Close 21+ sources');close.type='button';
 viewer.append(eyebrow,art,copy,visit,nav,note,close);
 root.append(header,intro,gate,gateNote,viewer);
 let acknowledged=false,last='',seen=[],paused=false;
 const reduce=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches===true;
 function rotate(){
  const entries=BRUCE_BANNER_SOURCES.map(x=>eligibleBannerSource(x,acknowledged)).filter(Boolean);
  const item=chooseBannerSource(entries,last,seen);if(!item)return;
  if(seen.length>=entries.length)seen=[];
  last=item.id;seen.push(item.id);
  hero.textContent=item.title;heroSub.textContent=item.subtitle;
  badge.textContent=item.format;description.textContent=item.summary;
  count.textContent='Source '+String(entries.findIndex(x=>x.id===item.id)+1)+' of '+entries.length;
  visit.href=item.url;viewer.hidden=false;
 }
 function stop(){
  acknowledged=false;last='';seen=[];paused=false;
  pause.textContent='Pause rotation';pause.setAttribute('aria-pressed','false');
  viewer.hidden=true;gate.hidden=false;visit.removeAttribute('href');
  hero.textContent='';heroSub.textContent='';description.textContent='';
 }
 gate.addEventListener('click',()=>{
  acknowledged=true;gate.hidden=true;rotate();
 });
 next.addEventListener('click',rotate);
 pause.addEventListener('click',()=>{paused=!paused;pause.textContent=paused?'Resume rotation':'Pause rotation';pause.setAttribute('aria-pressed',String(paused))});
 close.addEventListener('click',()=>{stop();gate.focus()});
 const timer=setInterval(()=>{
  if(!root.isConnected){clearInterval(timer);return}
  if(!acknowledged||paused||reduce||viewer.hidden||document.hidden)return;
  const bounds=root.getBoundingClientRect();
  const visible=bounds.width>0&&bounds.height>0&&bounds.bottom>0&&bounds.top<(window.innerHeight||document.documentElement.clientHeight)&&bounds.right>0&&bounds.left<(window.innerWidth||document.documentElement.clientWidth);
  if(!visible||viewer.contains(document.activeElement))return;
  rotate();
 },12000);
}
