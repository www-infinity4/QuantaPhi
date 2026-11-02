import {mountCardActions} from './quanta-card-actions.mjs?v=20261031-heritage-signin1';
// One interactive, data-driven card. Never mount thousands of DOM cards.
const el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x};
const safeHttps=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.includes('.')?u.href:null}catch{return null}};
const links=(parent,label,url,primary=false)=>{
 const href=safeHttps(url);if(!href)return;
 const a=el('a',primary?'rd-primary':'',label);a.href=href;a.target='_blank';a.rel='noopener noreferrer';parent.append(a);
};
function mount(){
 const bank=document.getElementById('premiumSourceCards');if(!bank||bank.querySelector('[data-source-id="restaurant-directory"]'))return;
 const card=el('article','iqc-card premium-card rd-card');card.dataset.sourceId='restaurant-directory';card.dataset.sourceReady='true';
 card.dataset.sourceName='Infinity Restaurant Directory';card.dataset.official='https://overturemaps.org/';
 card.dataset.sourceCategory='Restaurants';card.dataset.sourceQuery='Denver restaurants';
 const header=el('header','rd-header');
 header.append(el('p','iqc-kind','INFINITY® · FOOD & VACATION DIRECTORY'),
   el('h2','','Find a restaurant, discover a neighborhood'));
 const notice=el('p','rd-intro','Browse restaurants by city, cuisine or name. Results are independently sourced, not paid advertisements.');
 const form=el('form','rd-form');
 const search=el('input');search.type='search';search.name='restaurant';search.placeholder='Restaurant name or cuisine';search.maxLength=65;search.autocomplete='off';search.setAttribute('aria-label','Find restaurants or cuisine');
 const place=el('select');place.setAttribute('aria-label','Choose a city');place.name='city';
 const denver=el('option','','Denver, Colorado');denver.value='CO|Denver';place.append(denver);
 const submit=el('button','','Find restaurants');submit.type='submit';
 const discover=el('button','','Surprise me');discover.type='button';discover.setAttribute('aria-label','Discover a random local restaurant');
 const locate=el('button','rd-nearby','Use phone location');locate.type='button';locate.setAttribute('aria-label','Find restaurants using my current phone location');
 const inputs=el('div','rd-inputs');inputs.append(search,place,submit,discover,locate);form.append(inputs);
 const status=el('p','rd-status','Choose Denver to browse its restaurants.');status.setAttribute('role','status');
 const result=el('section','rd-result');result.setAttribute('aria-label','Restaurant discovery result');
 const control=el('nav','rd-nav');control.setAttribute('aria-label','Browse restaurants');
 const prev=el('button','','← Previous'),position=el('span','rd-position',''),next=el('button','','Next →');
 prev.type=next.type='button';control.append(prev,position,next);
 const actions=el('div','rd-actions');card.append(header,notice,form,status,result,control,actions);
 const standard={id:'restaurant-directory',name:'Infinity Restaurant Directory',category:'Restaurants',official:'https://overturemaps.org/',featureUrl:'https://overturemaps.org/',route:'/?card=restaurant-directory'};
 mountCardActions(actions,standard);
 let city='Denver',state='CO',page=0,items=[],selected=0,loading=false,loaded=false,hasMore=false,requestNo=0,cityTotal=0;
 const cityCounts=new Map();
 let nearbyCoords=null,locationAttempted=false; // Ephemeral, never stored in wallet/browser storage.
 function details(item){
  result.replaceChildren();
  if(!item){result.append(el('p','rd-empty','No entries on this page. Try another name or cuisine.'));return}
  const media=el('div','rd-media');
  const photo=safeHttps(item.image_url);
  if(photo){
   const img=el('img');img.src=photo;img.alt=item.name+' restaurant photograph';img.loading='lazy';img.decoding='async';
   img.addEventListener('error',()=>img.remove(),{once:true});media.append(img);
  }
  const main=el('div','rd-content');
  main.append(el('p','rd-eyebrow',(item.category||'Restaurant').replace(/_/g,' ')+' · '+item.city+', '+item.state),
  el('h3','',item.name));
  if(item.address)main.append(el('p','rd-address',item.address));
  if(!photo)main.append(el('p','rd-photo-note','Browse the restaurant’s original website for photographs and menu details.'));
  const source=el('p','rd-source','Source: '+(item.source_name||'Unknown')+' · Organic listing, not sponsored');
  const buttons=el('nav','rd-links');buttons.setAttribute('aria-label',item.name+' source actions');
  links(buttons,'Restaurant website',item.website,true);
  const map=new URL('https://www.google.com/maps/search/?api=1');
  map.searchParams.set('query',item.address||item.name+', '+item.city+', '+item.state);
  links(buttons,'Directions',map.href);
  links(buttons,'Source record',item.source_url);
  main.append(buttons,source);result.append(media,main);
 }
 function show(){
  const row=items[selected];details(row);prev.disabled=loading||(page===0&&selected===0);
  next.disabled=loading||(!hasMore&&selected>=items.length-1);
  position.textContent=items.length?'Result '+(page*24+selected+1)+' · '+(nearbyCoords?'Near your phone':city):'No matches';
 }
 async function find(p=0,randomItem=false,selectLast=false){
  if(loading)return;
  loading=true;page=p;selected=0;const serial=++requestNo;
  submit.disabled=prev.disabled=next.disabled=discover.disabled=locate.disabled=true;status.textContent='Loading '+(nearbyCoords?'nearby':'in '+city)+' restaurants…';card.setAttribute('aria-busy','true');
  try{
   const params=nearbyCoords?new URLSearchParams({...nearbyCoords,q:search.value.trim().slice(0,65),page:String(page)}):
    new URLSearchParams({city,state,q:search.value.trim().slice(0,65),page:String(page)});
   const endpoint=nearbyCoords?'/api/dining/nearby?':'/api/dining/search?';
   const response=await fetch(endpoint+params,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw new Error('Directory API unavailable');
   const data=await response.json();if(serial!==requestNo)return;
   items=Array.isArray(data.items)?data.items:[];hasMore=Boolean(data.has_more);
   if(randomItem&&items.length)selected=Math.floor(Math.random()*items.length);
   else if(selectLast&&items.length)selected=items.length-1;
   status.textContent=items.length?('Displaying '+items.length+' sourced restaurants · '+(nearbyCoords?'near your phone':city)):
     (nearbyCoords?'No sourced restaurants near your phone in this database yet. Choose Nationwide restaurants for an indexed city.':'No matching restaurants found. Try a broader search.');
   loaded=true;
  }catch{
   if(serial===requestNo){items=[];hasMore=false;status.textContent='Restaurant database is unavailable at the moment. Existing individual restaurant cards remain accessible.'}
  }finally{if(serial===requestNo){loading=false;submit.disabled=discover.disabled=locate.disabled=false;card.removeAttribute('aria-busy');show()}}
 }
 form.addEventListener('submit',e=>{e.preventDefault();nearbyCoords=null;const [s,c]=place.value.split('|');state=s;city=c;cityTotal=cityCounts.get(place.value)||0;void find(0)});
 discover.addEventListener('click',()=>{if(loading)return;nearbyCoords=null;const pages=Math.max(1,Math.ceil(cityTotal/24));search.value='';void find(Math.floor(Math.random()*pages),true)});
 next.addEventListener('click',()=>{if(loading)return;if(selected<items.length-1){selected++;show()}else if(hasMore)void find(page+1)});
 prev.addEventListener('click',()=>{if(loading)return;if(selected>0){selected--;show()}else if(page>0)void find(page-1,false,true)});
 card.addEventListener('oracle:activate',()=>{
  // Let the category picker request location first; do not render Denver as "local".
  setTimeout(()=>{if(!loaded&&!loading&&!locationAttempted)void find(0)},0);
 });
 function usePhoneLocation(){
  if(!navigator.geolocation){status.textContent='Location service is unavailable. Select a city instead.';return;}
  locationAttempted=true;
  status.textContent='Your phone may ask for location permission. Coordinates are used for this search only.';
  navigator.geolocation.getCurrentPosition(position=>{
   const lat=position?.coords?.latitude,lon=position?.coords?.longitude;
   if(!Number.isFinite(lat)||!Number.isFinite(lon)){status.textContent='Phone location unavailable. Select a city instead.';return;}
   nearbyCoords={lat:String(lat.toFixed(5)),lon:String(lon.toFixed(5))};
   if(loading){status.textContent='Restaurant search is still loading. Choose Use phone location again.';return;}
   void find(0);
  },()=>{status.textContent='Location permission unavailable or declined. Select a city or Nationwide restaurants.';},
  {enableHighAccuracy:false,timeout:10000,maximumAge:300000});
 }
 locate.addEventListener('click',usePhoneLocation);
 document.addEventListener('oracle:restaurant-nearby-request',()=>{if(card.isConnected&&!locationAttempted)usePhoneLocation()});
 // Discover city inventory on activation only; never infer precise user location.
 let citiesLoaded=false;
 async function loadCities(){
  if(citiesLoaded)return;citiesLoaded=true;
  try{
   const r=await fetch('/api/dining/stats',{credentials:'omit',signal:AbortSignal.timeout(10000)});
   if(!r.ok)return;const data=await r.json();
   for(const item of data.cities||[]){
    cityCounts.set(item.state+'|'+item.city,Number(item.total)||0);
    if(item.city===city&&item.state===state)cityTotal=Number(item.total)||0;
    if(!item.city||!/^[A-Z]{2}$/.test(item.state)||item.state==='CO'&&item.city==='Denver')continue;
    const o=el('option','',item.city+', '+item.state+' · '+item.total+' listings');
    o.value=item.state+'|'+item.city;place.append(o);
   }
  }catch{}
 }
 card.addEventListener('oracle:activate',()=>void loadCities());
 document.addEventListener('oracle:restaurant-nationwide',()=>{
  if(!card.isConnected)return;
  nearbyCoords=null;locationAttempted=true;
  status.textContent='Nationwide restaurant directory · select an indexed city, then Find restaurants.';
  void loadCities();place.focus();
 });
 bank.append(card);
 window.dispatchEvent(new Event('quantaphi:source-cards-ready'));
}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()}
