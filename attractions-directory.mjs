import {mountCardActions} from './quanta-card-actions.mjs?v=20261031-heritage-signin1';
/* One scalable attractions directory Quick Card; no thousands of DOM tiles. */
const API='https://quantaphi-attractions-directory.marvaseater.workers.dev';
const el=(tag,cls,value)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(value!==undefined)node.textContent=value;return node};
const safeSite=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.includes('.')?u.href:''}catch{return ''}};
const link=(parent,label,url,main=false)=>{
 const href=safeSite(url);if(!href)return;
 const a=el('a',main?'ad-primary':'',label);a.href=href;a.target='_blank';a.rel='noopener noreferrer';parent.append(a);
};
const stateName=code=>({CO:'Colorado',AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming'})[code]||code;
function mount(){
 const bank=document.getElementById('premiumSourceCards');
 if(!bank||bank.querySelector('[data-source-id="attractions-directory"]'))return;
 const card=el('article','iqc-card premium-card ad-card');card.dataset.sourceId='attractions-directory';card.dataset.sourceReady='true';
 card.dataset.sourceName='Infinity Attractions Directory';card.dataset.sourceCategory='Travel & adventure';card.dataset.official='https://overturemaps.org/';
 card.dataset.sourceQuery='Colorado mountain adventures attractions museums parks all 50 states';
 const header=el('header','ad-header');
 header.append(el('p','iqc-kind','INFINITY® · 50-STATE ATTRACTIONS DIRECTORY'),el('h2','','Find an adventure, museum, park or scenic stop'));
 const note=el('p','ad-note','Colorado first. Browse sourced destinations across the United States as verified state imports arrive. Listings are independent discovery, not sponsored ads or available bookings.');
 const form=el('form','ad-form');
 const q=el('input');q.type='search';q.maxLength=65;q.placeholder='Search attractions or activities';q.setAttribute('aria-label','Search attractions');
 const select=el('select');select.setAttribute('aria-label','Choose a U.S. state');
 const controls=el('div','ad-inputs'),go=el('button','','Search attractions');go.type='submit';controls.append(q,select,go);form.append(controls);
 const status=el('p','ad-status','Loading Colorado attraction inventory…');status.setAttribute('role','status');
 const body=el('section','ad-result');body.setAttribute('aria-label','Attraction result');
 const nav=el('nav','ad-nav'),prev=el('button','','← Previous'),pos=el('span','',''),next=el('button','','Next →');
 prev.type=next.type='button';nav.append(prev,pos,next);
 const actions=el('div','ad-actions');mountCardActions(actions,{id:'attractions-directory',name:'Infinity Attractions Directory',category:'Travel & adventure',official:'https://overturemaps.org/',featureUrl:API+'/api/attractions/search?state=CO',route:'/?card=attractions-directory'},{showSearch:false});
 card.append(header,note,form,status,body,nav,actions);bank.append(card);
 const stateCodes='CO AL AK AZ AR CA CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY'.split(' ');
 for(const state of stateCodes){const o=el('option','',stateName(state));o.value=state;select.append(o);}
 let state='CO',page=0,items=[],index=0,more=false,busy=false,loaded=false;
 const record=()=>{
  body.replaceChildren();const item=items[index];
  if(!item){body.append(el('p','ad-empty','No verified attractions in this search yet. Choose another search or state.'));return;}
  const art=el('div','ad-photo');
  if(safeSite(item.image_url)&&item.image_attribution){
   const img=el('img');img.src=item.image_url;img.alt=item.name+' — attributed photograph';img.loading='lazy';
   img.addEventListener('error',()=>{art.replaceChildren(el('p','','Destination photo unavailable. See original source.'))},{once:true});art.append(img);
   art.append(el('p','ad-credit',item.image_attribution));
  }else art.append(el('p','ad-photo-note','Original photos and trip details are available from the source.'));
  const info=el('div','ad-info');
  info.append(el('p','ad-kind',(item.category||'Attraction').replace(/_/g,' ')+' · '+(item.city?item.city+', ':'')+item.state),
    el('h3','',item.name));
  if(item.address)info.append(el('p','ad-address',item.address));
  const btns=el('nav','ad-links');btns.setAttribute('aria-label',item.name+' actions');
  link(btns,'Official destination',item.website,true);
  const maps=new URL('https://www.google.com/maps/search/?api=1');
  maps.searchParams.set('query',[item.name,item.city,item.state].filter(Boolean).join(', '));
  link(btns,'Directions',maps.href);
  link(btns,'Source & provenance',item.source_url);
  // Only seeded cards that actually exist get a live Quick Card deep link.
  if(/^curated:colorado-[a-z0-9-]+$/.test(item.id)){
   const a=el('a','ad-own-card','Open full Infinity Quick Card');a.href='/?card='+encodeURIComponent(item.id.slice('curated:'.length));btns.append(a);
  }else{
   const build=el('button','ad-build','+1 Build destination card');build.type='button';
   build.addEventListener('click',()=>{
    const input=document.getElementById('robotDirectionsInput');
    if(!input){status.textContent='Open Bubbles on QuantaPhi to build a source-backed destination card.';return;}
    input.value='Build an Infinity destination Quick Card for '+item.name+', '+item.state+'. Provenance: '+item.source_url+'. Use original verified media, credit licenses, and preserve wallet isolation. Include planning actions, not fake bookings.';
    input.dispatchEvent(new Event('input',{bubbles:true}));input.scrollIntoView({block:'center',behavior:'smooth'});input.focus();
    status.textContent='Destination build request drafted in Bubbles; submit to start.';
   });btns.append(build);
  }
  info.append(btns,el('p','ad-source','Source: '+item.source_name+' · '+item.license+' · last checked '+item.last_seen+' · Not sponsored'));
  body.append(art,info);
 };
 function display(){
  record();prev.disabled=busy||(page===0&&index===0);next.disabled=busy||(!more&&index===items.length-1);
  pos.textContent=items.length?'Attraction '+(page*24+index+1)+' · '+stateName(state):'No verified matches';
 }
 async function load(p=0){
  if(busy)return;busy=true;go.disabled=true;state=select.value;page=p;index=0;card.setAttribute('aria-busy','true');
  status.textContent='Searching '+stateName(state)+'…';
  try{
   const url=new URL('/api/attractions/search',API);
   url.search=new URLSearchParams({state,q:q.value.trim().slice(0,65),page:String(page)}).toString();
   const response=await fetch(url,{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error('network');
   const data=await response.json();items=Array.isArray(data.items)?data.items:[];more=Boolean(data.has_more);
   status.textContent=items.length?items.length+' sourced attractions · '+stateName(state):'No verified entries yet in '+stateName(state)+'. Other states remain queued.';
   loaded=true;
  }catch{items=[];more=false;status.textContent='Attractions database temporarily unavailable. Original Colorado attraction cards still work.'}
  finally{busy=false;go.disabled=false;card.removeAttribute('aria-busy');display()}
 }
 form.addEventListener('submit',event=>{event.preventDefault();void load(0)});
 next.addEventListener('click',()=>{if(index<items.length-1){index++;display()}else if(more)void load(page+1)});
 prev.addEventListener('click',()=>{if(index>0){index--;display()}else if(page>0)void load(page-1)});
 card.addEventListener('oracle:activate',()=>{if(!loaded&&!busy)void load(0)});
 window.dispatchEvent(new Event('quantaphi:source-cards-ready'));
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
}