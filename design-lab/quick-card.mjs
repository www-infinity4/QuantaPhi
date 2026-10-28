/* The Power Chain prototype as ONE native Oracle swipe card, not a nested iframe. */
import {LANES,planChain,runPowerChain} from './power-chain-core.mjs';
import {DENIM_CARDS,FEED_STORAGE_KEY,cleanFeedState,applyDenimPower,denimTotals} from './denim-power-core.mjs';
import {mountCardActions} from '/quanta-card-actions.mjs';
const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
function createCard(){
 const card=make('article','iqc-card lab-quick-card');card.dataset.sourceId='power-chain';card.dataset.sourceName='Power Chain · Design Lab';card.dataset.sourceReady='true';
 const art=make('div','lab-card-art');
 const disc=make('div','lab-card-disc');disc.setAttribute('aria-hidden','true');disc.append(make('span'));
 art.append(make('small','lab-card-eyebrow','QUANTAPHI · DESIGN LAB / 001'),disc,make('h3','','Power Chain'),make('p','','One button. Coordinated source circuits.'));
 const content=make('div','lab-card-content');
 const label=make('label','lab-card-label','INTENT');label.htmlFor='labCardQuery';
 const field=make('input','lab-card-input');field.id='labCardQuery';field.type='search';field.value='1881 Morgan dollar';field.maxLength=110;field.placeholder='Research intent…';
 const modes=make('div','lab-card-lanes');const active=new Set(['collect']);let ctrl=null;
 for(const lane of LANES){
  const b=make('button','lab-card-lane',lane.label);b.type='button';b.dataset.lane=lane.id;b.setAttribute('aria-pressed',String(active.has(lane.id)));
  b.addEventListener('click',()=>{
   if(ctrl)return;
   if(active.has(lane.id)){if(active.size===1)return;active.delete(lane.id);}else active.add(lane.id);
   for(const button of modes.children)button.setAttribute('aria-pressed',String(active.has(button.dataset.lane)));
  });modes.append(b);
 }
 const actions=make('div','lab-card-actions');
 const go=make('button','lab-card-go','⏻  RUN 10-SOURCE CHAIN');go.type='button';
 const stop=make('button','lab-card-stop','Stop');stop.type='button';stop.disabled=true;
 const open=make('a','lab-card-open','Full design lab ↗');open.href='/design-lab/index.html';
 actions.append(go,stop,open);
 const denimPanel=make('div','lab-card-category');
 const denimAction=make('button','lab-card-category-go','⏻ FOLLOW ALL DENIM CARDS');
 denimAction.type='button';
 const denimStatus=make('p','lab-card-fine','Follow the six current denim product cards in QuantaPhi on this device.');
 denimStatus.setAttribute('role','status');
 const manageDenim=make('a','lab-card-category-manage','Manage denim follows ↗');
 manageDenim.href='/design-lab/index.html#denimPower';
 const denimDetails=make('div','lab-card-category-detail');
 denimDetails.append(denimStatus,manageDenim);
 denimPanel.append(denimAction,denimDetails);
 function readDenimState(){
  try{return cleanFeedState(JSON.parse(localStorage.getItem(FEED_STORAGE_KEY)||'{}'));}
  catch{return cleanFeedState({});}
 }
 function updateDenimState(){
  const totals=denimTotals(readDenimState());
  denimAction.textContent=totals.followed===totals.total?'✓ ALL '+totals.total+' DENIM CARDS FOLLOWED':'⏻ FOLLOW '+totals.total+' DENIM CARDS';
  denimAction.setAttribute('aria-pressed',String(totals.followed===totals.total));
 }
 denimAction.addEventListener('click',()=>{
  try{
   const state=applyDenimPower(readDenimState(),'follow-all');
   localStorage.setItem(FEED_STORAGE_KEY,JSON.stringify(state));
   denimStatus.textContent='Saved '+DENIM_CARDS.length+' denim cards to your QuantaPhi Following view on this device.';
   window.dispatchEvent(new CustomEvent('quantaphi:feed-updated',{detail:{origin:'power-chain-denim'}}));
   updateDenimState();
  }catch(error){denimStatus.textContent='Could not save denim follows: '+String(error?.message||'storage unavailable');}
 });
 window.addEventListener('quantaphi:feed-updated',updateDenimState);
 window.addEventListener('storage',event=>{if(event.key===FEED_STORAGE_KEY)updateDenimState();});
 updateDenimState();
 const status=make('p','lab-card-status','Ready. Each source will be checked in QuantaPhi’s public web index.');status.setAttribute('role','status');
 const results=make('div','lab-card-results');
 const rule=make('p','lab-card-fine','Independent public-index results. Not 10 website sign-ins or direct scraping.');
 async function run(){
  if(ctrl)return;let plan;
  try{plan=planChain({query:field.value,lanes:[...active],limit:10})}catch(error){status.textContent=error.message;return;}
  ctrl=new AbortController();go.disabled=true;stop.disabled=false;field.disabled=true;results.replaceChildren();
  status.textContent='Power Chain active · checking '+plan.targets.length+' sources…';
  try{
   const receipt=await runPowerChain(plan,{signal:ctrl.signal,onStep:(_step,progress)=>{
    status.textContent='Checked '+progress.completed+' / '+progress.total+' · '+progress.matches+' verified results';
   }});
   status.textContent=(receipt.stopped?'Stopped. ':'Finished. ')+receipt.checked+' sources checked · '+receipt.found+' matching links';
   for(const item of receipt.results.slice(0,5)){
    const a=make('a','lab-card-result',item.title);a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';
    a.append(make('small','',item.target));results.append(a);
   }
   if(!receipt.found)results.append(make('p','lab-card-fine','No verified source results. Try a new intent or the full lab.'));
  }catch{status.textContent='Public-index search unavailable. No results were invented.';}
  finally{ctrl=null;go.disabled=false;stop.disabled=true;field.disabled=false;}
 }
 go.addEventListener('click',()=>void run());stop.addEventListener('click',()=>ctrl?.abort());
 field.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();void run();}});
 content.append(label,field,modes,actions,denimPanel,status,results,rule);
 const shared=make('div','lab-card-shared');
 mountCardActions(shared,{id:'power-chain',name:'Power Chain · Design Lab',category:'Design',url:'https://quantaphi.org/design-lab/index.html'},{showSearch:false});
 card.append(art,content,shared);return card;
}
function install(){
 const grid=document.querySelector('#siteQuickCards .iqc-grid');
 if(!grid||grid.querySelector('[data-source-id="power-chain"]'))return;
 grid.append(createCard());
 window.dispatchEvent(new Event('quantaphi:source-cards-ready'));
}
if(typeof document!=='undefined'){
 window.addEventListener('quantaphi:source-cards-ready',install);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
 else install();
}
