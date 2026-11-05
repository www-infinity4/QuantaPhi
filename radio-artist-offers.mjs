/* Small verified album/product strip for Infinity Radio. No new audio player,
 * paid-placement claim, wallet writes or playback side effects.
 */
import {ARTIST_OFFERS,officialUrlAllowed,appleAlbumForArtist} from './radio-artist-offers-data.mjs';
const radio=document.getElementById('infinityRadioQuick');
if(radio&&!document.getElementById('radioArtistOfferRail')){
 const style=document.createElement('style');
 style.textContent=[
  '#radioArtistOfferRail{box-sizing:border-box;margin:7px 0 12px;padding:9px 11px;border:1px solid #b8cecf;border-radius:14px;background:#f4f9f7;color:#24444b;font:inherit}',
  '#radioArtistOfferRail .rao-head{display:flex;gap:7px;align-items:center;flex-wrap:wrap}',
  '#radioArtistOfferRail .rao-head strong{flex:1;font-size:14px;line-height:1.35;letter-spacing:.02em}',
  '#radioArtistOfferRail .rao-head button{min-width:44px;min-height:44px;padding:6px 9px;border:1px solid #b7cccb;border-radius:9px;background:#fff;color:#254d55;font-size:17px}',
  '#radioArtistOfferRail .rao-feed{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:7px}',
  '#radioArtistOfferRail .rao-product{display:flex;gap:8px;min-width:0;padding:7px;border:1px solid #d0dcdb;border-radius:10px;background:#fff;align-items:center}',
  '#radioArtistOfferRail .rao-product img{width:67px;height:67px;flex:0 0 67px;object-fit:cover;border-radius:6px;background:#e4edef}',
  '#radioArtistOfferRail .rao-info{min-width:0;display:flex;flex-direction:column;gap:2px;overflow-wrap:anywhere}',
  '#radioArtistOfferRail .rao-info strong{font-size:13px;line-height:1.25}',
  '#radioArtistOfferRail .rao-info small{font-size:11px;line-height:1.25;color:#537078}',
  '#radioArtistOfferRail .rao-actions{display:flex;gap:5px;flex-wrap:wrap;margin-top:3px}',
  '#radioArtistOfferRail .rao-actions a{font-size:12px;font-weight:800;line-height:1.3;text-decoration:underline;color:#155668}',
  '#radioArtistOfferRail .rao-foot{font-size:11px;line-height:1.45;color:#4b6971;margin:7px 0 0}',
  '#radioArtistOfferRail :is(a,button):focus-visible{outline:3px solid #8b5aba;outline-offset:2px}',
  '@media(max-width:470px){#radioArtistOfferRail .rao-feed{grid-template-columns:1fr}}'
 ].join('\n');
 document.head.appendChild(style);
 const node=(tag,cls,txt)=>{
  const n=document.createElement(tag);
  if(cls)n.className=cls;
  if(txt!==undefined)n.textContent=txt;
  return n;
 };
 const root=node('aside');root.id='radioArtistOfferRail';
 root.setAttribute('aria-label','Artist album and official merchandise offers');
 const heading=node('div','rao-head');
 const title=node('strong','','∞ Artist albums · Official releases');
 const previous=node('button','','‹');previous.type='button';previous.setAttribute('aria-label','Previous artist offer');
 const next=node('button','','›');next.type='button';next.setAttribute('aria-label','Next artist offer');
 heading.append(title,previous,next);
 const feed=node('div','rao-feed');
 const note=node('p','rao-foot','Looking up official full-album artwork… No sponsored placements or prices are claimed.');
 note.setAttribute('role','status');
 root.append(heading,feed,note);
 radio.insertAdjacentElement('afterend',root);
 const results=new Map();let start=0;
 function render(){
  feed.replaceChildren();
  const ready=ARTIST_OFFERS.filter(offer=>results.has(offer.id));
  if(!ready.length){
   note.textContent='Album offers appear only after a real provider confirms the artist, album and cover.';
   return;
  }
  start=((start%ready.length)+ready.length)%ready.length;
  const count=Math.min(2,ready.length);
  for(let k=0;k<count;k++){
   const offer=ready[(start+k)%ready.length];
   const record=results.get(offer.id);
   const product=node('article','rao-product');
   const picture=node('img');
   picture.src=record.artworkUrl100;picture.alt=offer.artist+' · '+offer.album+' album artwork';
   picture.loading='lazy';picture.decoding='async';
   picture.addEventListener('error',()=>product.remove());
   const info=node('div','rao-info');
   info.append(node('strong','',offer.album),node('small','',offer.artist+' · Full album'));
   const actions=node('div','rao-actions');
   const digital=node('a','','Digital album');
   digital.href=record.collectionViewUrl;digital.target='_blank';digital.rel='noopener noreferrer';
   digital.setAttribute('aria-label','View '+offer.artist+' '+offer.album+' album on Apple');
   actions.append(digital);
   if(officialUrlAllowed(offer.merchUrl)){
    const merch=node('a','','Official artist shop');
    merch.href=offer.merchUrl;merch.target='_blank';merch.rel='noopener noreferrer';
    merch.setAttribute('aria-label','Explore '+offer.artist+' official merchandise');
    actions.append(merch);
   }
   info.append(actions);product.append(picture,info);feed.append(product);
  }
  previous.disabled=next.disabled=ready.length<=1;
  note.textContent='Independent artist release spotlights · price not shown · retailer verifies formats, availability and purchase.';
 }
 previous.addEventListener('click',()=>{start--;render()});
 next.addEventListener('click',()=>{start++;render()});
 let sequence=0;
 function lookup(offer){
  return new Promise((resolve,reject)=>{
   const callback='QuantaPhiArtistAlbum_'+(++sequence);
   const script=document.createElement('script');
   const url=new URL('https://itunes.apple.com/search');
   for(const [key,value] of Object.entries({
    term:offer.artist+' '+offer.album,media:'music',entity:'album',country:'US',limit:'20',callback
   }))url.searchParams.set(key,value);
   let finished=false;
   const timeout=window.setTimeout(()=>done(new Error('artist_album_timeout')),8000);
   function done(error,items){
    if(finished)return;finished=true;
    window.clearTimeout(timeout);script.remove();
    try{delete window[callback]}catch(_){window[callback]=undefined}
    if(error)reject(error);else resolve(items);
   }
   window[callback]=response=>done(null,response?.results);
   script.onerror=()=>done(new Error('artist_album_unavailable'));
   script.referrerPolicy='no-referrer';
   script.src=url.href;document.head.appendChild(script);
  });
 }
 async function load(){
  for(const offer of ARTIST_OFFERS){
   try{
    const items=await lookup(offer);
    const matched=appleAlbumForArtist(offer,items);
    if(matched){results.set(offer.id,matched);render();}
   }catch(error){
    console.warn('Artist album offer unavailable:',offer.id,error?.message||error);
   }
  }
  if(!results.size)note.textContent='Artist album artwork is unavailable right now; no unverified products are displayed.';
 }
 void load();
 window.setInterval(()=>{
  if(!document.hidden&&results.size>2){start++;render();}
 },18000);
}
