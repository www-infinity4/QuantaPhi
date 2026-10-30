/* Stacked compact carousels open real original QuantaPhi cards, never cloned
 * interactions, cookies, account sessions or third-party advertising scripts. */
const GROUPS=Object.freeze([
 {title:'Restaurants & offers',description:'Restaurant artwork and current offers from original sources',items:[
  ['burger-king','Burger King','Offers & Royal Perks','🍔'],
  ['sonic','SONIC','Deals, rewards & menu','🥤'],
  ['mcdonalds','McDonald’s','App deals & McValue','🍟']]},
 {title:'More website discoveries',description:'Open the full source card in the top interactive viewer',items:[
  ['pcgs','PCGS CoinFacts','Coin photos & varieties','🪙'],
  ['topps','Topps','Trading cards & releases','⚾'],
  ['nasa-library','NASA Image Library','NASA photos & discoveries','🚀'],
  ['heritage','Heritage Auctions','Authenticated auction sources','🏛️']]},
 {title:'Infinity creative channels',description:'Original reading, building and interactive experiences',items:[
  ['infiniteBook','Reads & Realms','Explore stories','📖'],
  ['infinityReaderMystery','Tales of Mystery','New mystery stories','🔍'],
  ['infinityReaderTech','Tech History','Inventors & computing','💡'],
  ['phiStoryWriter','Story Writer','Write your own','✍️']]}
]);
const make=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n};
const cardHref=id=>'/?card='+encodeURIComponent(id);
function init(){
 const root=document.getElementById('infinityCarouselRails');if(!root||root.dataset.ready)return;root.dataset.ready='1';
 for(const group of GROUPS){
  const section=make('section','icr-rail'),head=make('header','icr-rail-head');
  const title=make('h2','',group.title),sub=make('p','',group.description);
  const controls=make('div','icr-rail-controls');
  const previous=make('button','', '‹'),next=make('button','', '›');previous.type=next.type='button';
  previous.setAttribute('aria-label','Previous '+group.title+' cards');next.setAttribute('aria-label','Next '+group.title+' cards');
  controls.append(previous,next);head.append(make('div','icr-title-wrap'),controls);head.firstChild.append(title,sub);
  const track=make('div','icr-track');track.setAttribute('role','list');track.setAttribute('aria-label',group.title);
  for(const [id,name,desc,emoji] of group.items){
   const link=make('a','icr-tile');link.href=cardHref(id);link.setAttribute('role','listitem');link.dataset.cardId=id;
   const art=make('div','icr-tile-art');art.setAttribute('aria-hidden','true');art.append(make('span','icr-emoji',emoji),make('strong','',name));
   const footer=make('div','icr-tile-body');footer.append(make('strong','',name),make('span','',desc),make('em','', 'Open interactive card'));
   link.append(art,footer);track.append(link);
  }
  const step=()=>track.firstElementChild?.getBoundingClientRect().width||230;
  previous.addEventListener('click',()=>track.scrollBy({left:-(step()+12),behavior:'smooth'}));
  next.addEventListener('click',()=>track.scrollBy({left:step()+12,behavior:'smooth'}));
  section.append(head,track);root.append(section);
 }
 const brands=make('details','icr-brand-library');
 const label=make('summary','', '∞ Infinity Approved brands · Browse or request inclusion');
 const p=make('p','', 'Brand identity cards are grouped here instead of taking over the main browsing area. Inclusion starts with a public website nomination and source-backed review; it is not automatic endorsement.');
 const directory=make('a','', 'Browse brands & request a website review');directory.href='/infinity-affiliates.html';
 brands.append(label,p,directory);root.append(brands);
 function refreshSourcePhotos(){
  for(const tile of root.querySelectorAll('.icr-tile[data-card-id]')){
   if(tile.querySelector('.icr-tile-art img'))continue;
   const id=tile.dataset.cardId;
   const source=[...document.querySelectorAll('.premium-card[data-source-id]')].find(n=>n.dataset.sourceId===id);
   const photo=source?.querySelector('.premium-photo');
   if(!photo||!photo.complete||!photo.naturalWidth)continue;
   const img=make('img','');img.src=photo.currentSrc||photo.src;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';
   img.addEventListener('error',()=>img.remove(),{once:true});
   tile.querySelector('.icr-tile-art')?.prepend(img);
  }
 }
 const observer=new MutationObserver(refreshSourcePhotos);
 observer.observe(document.getElementById('oracleCardDeck')||root,{subtree:true,childList:true});
 window.addEventListener('quantaphi:source-cards-ready',refreshSourcePhotos);
 refreshSourcePhotos();
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init()}
