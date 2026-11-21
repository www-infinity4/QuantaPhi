import {HOUSING_QUICK_CARD} from './disability-housing-core.mjs';
import {mountCardActions} from './quanta-card-actions.mjs';
import {openQuickCardPreview} from './quick-card-preview.mjs?v=20261029-housing1';
const host=document.getElementById('disabilityHousingCard');
if(host){
 host.classList.add('ha-launcher');
 const hero=document.createElement('div');hero.className='ha-launch-hero';
 const copy=document.createElement('div');
 const kicker=document.createElement('p');kicker.className='ha-launch-kicker';kicker.textContent='INFINITY® · HOME ACCESS';
 const title=document.createElement('h2');title.append('A place to call ');const home=document.createElement('span');home.textContent='home.';title.append(home);
 const detail=document.createElement('p');detail.className='ha-launch-copy';detail.textContent='Housing help with SSI or SSDI income. A few answers. A saved plan. Official next steps.';
 const start=document.createElement('a');start.href=HOUSING_QUICK_CARD.route;start.className='ha-launch-button';start.textContent='Start my housing intake →';
 start.addEventListener('click',event=>{if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  if(openQuickCardPreview({url:HOUSING_QUICK_CARD.route,title:'Home Access · Disability Housing',description:'Prepare your intake for buying, repairing, or renting a home. Your answers stay in the housing guide until you choose to share them.'}))event.preventDefault();
 });
 copy.append(kicker,title,detail,start);
 const art=document.createElement('img');art.src='/assets/share/disability-housing-house.svg';art.alt='';art.width=380;art.height=310;art.className='ha-launch-art';
 hero.append(copy,art);
 const foot=document.createElement('p');foot.className='ha-launch-foot';foot.textContent='Free guide · No SSN · USDA and HUD determine eligibility and approval.';
 const actions=document.createElement('div');actions.className='ha-launch-actions';mountCardActions(actions,HOUSING_QUICK_CARD,{websiteReader:false,showPreview:false,showOriginal:false});
 host.replaceChildren(hero,foot,actions);host.dataset.housingReady='true';
}
