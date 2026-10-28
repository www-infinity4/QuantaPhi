import {DENIM_CARDS,FEED_STORAGE_KEY,cleanFeedState,applyDenimPower,denimTotals} from './denim-power-core.mjs';

const $=id=>document.getElementById(id);
const grid=$('denimPowerGrid'),status=$('denimPowerStatus'),counter=$('denimPowerCount');
const filter=$('denimBrandFilter');
if(grid&&status&&counter&&filter){
 const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el};
 const read=()=>{try{return cleanFeedState(JSON.parse(localStorage.getItem(FEED_STORAGE_KEY)||'{}'));}
   catch{return cleanFeedState({})}};
 const brands=[...new Set(DENIM_CARDS.map(card=>card.brand))];
 for(const brand of brands){const opt=document.createElement('option');opt.value=brand;opt.textContent=brand;filter.append(opt);}
 function save(action,id){
  try{
   const updated=applyDenimPower(read(),action,id);
   localStorage.setItem(FEED_STORAGE_KEY,JSON.stringify(updated));
   render();
   status.textContent=action==='follow-all'?'Following all '+DENIM_CARDS.length+' denim cards in QuantaPhi on this device.':
    action==='unfollow-all'?'Denim follows cleared. Other followed cards were preserved.':
    action==='follow'?'Added to your QuantaPhi Following view.':'Removed from your QuantaPhi Following view.';
   window.dispatchEvent(new CustomEvent('quantaphi:feed-updated',{detail:{origin:'denim-power',action}}));
  }catch(error){status.textContent='Follow changes could not be saved on this device: '+String(error.message||'storage unavailable');}
 }
 function render(){
  const state=read(),following=new Set(state.following),totals=denimTotals(state);
  counter.textContent=totals.followed+' / '+totals.total+' followed · '+totals.brands+' brands';
  grid.replaceChildren();
  const visible=DENIM_CARDS.filter(card=>!filter.value||card.brand===filter.value);
  for(const card of visible){
   const article=make('article','dp-item');
   const img=make('img','dp-photo');img.src=card.image;img.alt=card.title;img.loading='lazy';img.decoding='async';
   const body=make('div','dp-copy'),brand=make('small','dp-brand',card.brand),title=make('h3','',card.title);
   const actions=make('div','dp-actions'),follow=make('button','dp-follow',following.has(card.id)?'✓ Following':'+ Follow');
   follow.type='button';follow.setAttribute('aria-pressed',String(following.has(card.id)));
   follow.addEventListener('click',()=>save(following.has(card.id)?'unfollow':'follow',card.id));
   const link=make('a','dp-open','Original product');link.href=card.url;link.target='_blank';link.rel='noopener noreferrer';
   actions.append(follow,link);body.append(brand,title,actions);article.append(img,body);grid.append(article);
  }
 }
 $('denimFollowAll').addEventListener('click',()=>save('follow-all'));
 $('denimUnfollowAll').addEventListener('click',()=>save('unfollow-all'));
 filter.addEventListener('change',render);
 window.addEventListener('quantaphi:feed-updated',event=>{if(event.detail?.origin!=='denim-power')render();});
 window.addEventListener('storage',event=>{if(event.key===FEED_STORAGE_KEY)render();});
 render();
}
