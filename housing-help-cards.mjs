import {HOUSING_HELP_BRAND,HOUSING_HELP_RESOURCES,housingResource,housingResourceRoute,housingCompanions,housingResourceCard} from './housing-help-catalog.mjs';
import {mountCardActions} from './quanta-card-actions.mjs';
import {openQuickCardPreview} from './quick-card-preview.mjs?v=20261029-housing2';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
export function createHousingHelpCard(resource){
 const r=housingResource(resource?.id);if(!r)return null;
 const card=el('article','ha-help-card ha-help-'+r.category);card.dataset.housingResource=r.id;
 card.append(el('p','ha-help-brand',HOUSING_HELP_BRAND));
 const visual=el('div','ha-help-art');
 const art=el('img');art.src='/assets/share/disability-housing-house.svg';art.alt='';art.width=180;art.height=147;art.loading='lazy';
 const label={bath:'Bath & access',repair:'Repair & renew',loan:'A home of your own',energy:'Warm. Safe. Home.',grant:'Local housing help',nonprofit:'Neighbors helping',rental:'A place to live'};
 visual.append(art,el('strong','',label[r.category]||'Housing help'));card.append(visual);
 card.append(el('p','ha-help-provider',r.provider),el('h3','',r.title),el('p','ha-help-description',r.description),el('p','ha-help-area',r.area),el('p','ha-help-availability',r.availability));
 const details=el('a','ha-help-open','Open help card →');details.href=housingResourceRoute(r.id);
 details.addEventListener('click',e=>{if(e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;
  if(openQuickCardPreview({url:details.href,title:r.title,description:r.provider+' · '+r.area}))e.preventDefault();
 });card.append(details);
 const actions=el('details','ha-help-actions'),summary=el('summary','','Share · Collect · +1 Build');actions.append(summary);
 const controls=el('div','ha-help-controls');mountCardActions(controls,housingResourceCard(r),{websiteReader:false,showOriginal:false,showPreview:false});actions.append(controls);card.append(actions);
 return card;
}
export function mountHousingHelpAround(panel,initial={}){
 if(!panel||panel.closest('.ha-housing-workspace'))return {update:()=>{}};
 const shell=el('div','ha-housing-workspace'),heading=el('p','ha-help-heading','INFINITY® · SIX CONNECTIONS TO HOUSING HELP');
 const left=el('aside','ha-resource-rail ha-resource-left'),right=el('aside','ha-resource-rail ha-resource-right');
 left.setAttribute('aria-label','Housing help, positions one through three');right.setAttribute('aria-label','Housing help, positions four through six');
 const nav=el('nav','ha-resource-nav');nav.setAttribute('aria-label','Browse housing help cards');
 const previous=el('button','','← Previous help'),position=el('span'),next=el('button','','Next help →');
 previous.type=next.type='button';nav.append(previous,position,next);
 const note=el('p','ha-help-disclosure','Community resources, not paid advertisements. Infinity branding identifies these QuantaPhi cards; providers determine service, eligibility, and available funding.');
 const more=el('button','ha-resource-more','More helping organizations');more.type='button';
 panel.parentNode.insertBefore(shell,panel);shell.append(panel,heading,nav,left,right,more,note);
 let context=initial,rotation=0,page=0;
 function show(){
  const perPage=matchMedia('(max-width:600px)').matches?1:2,cards=[...left.children,...right.children];
  page=Math.min(page,Math.max(0,Math.ceil(cards.length/perPage)-1));
  cards.forEach((c,i)=>c.hidden=i<page*perPage||i>=page*perPage+perPage);
  position.textContent=(page*perPage+1)+'–'+Math.min(cards.length,page*perPage+perPage)+' of '+cards.length;
  previous.disabled=page===0;next.disabled=(page+1)*perPage>=cards.length;
 }
 function draw(){left.replaceChildren();right.replaceChildren();const resources=housingCompanions(context,rotation);
  resources.forEach((r,i)=>(i<3?left:right).append(createHousingHelpCard(r)));page=0;show();}
 previous.addEventListener('click',()=>{page=Math.max(0,page-1);show();});next.addEventListener('click',()=>{page++;show();});
 more.addEventListener('click',()=>{if(!openQuickCardPreview({url:'/housing-help.html',title:'All housing help',description:'Browse the helping organizations and verified program sources.'}))location.assign('/housing-help.html');});window.addEventListener('resize',show);draw();
 return {update:value=>{context={state:value.state||'',goal:value.goal||'buy'};rotation=0;draw();}};
}
function mountResourcePage(){
 const host=document.getElementById('housingHelpDetail');if(!host)return;
 const r=housingResource(new URLSearchParams(location.search).get('resource'));
 if(!r){host.append(el('h1','','Choose a housing help card'),el('p','','Browse the verified resource directory below.'));}
 else{
  document.title=r.title+' · Infinity Housing Help';
  host.append(el('p','ha-help-brand',HOUSING_HELP_BRAND),el('h1','',r.title),el('p','ha-help-detail-provider',r.provider),el('p','',r.description));
  const area=el('p','ha-notice',r.area);host.append(area,el('p','ha-help-availability',r.availability));
  const actions=el('div','ha-output-actions'),open=el('a','ha-primary',r.action||'Open official program');open.href=r.actionUrl||r.contactUrl||r.url;open.target='_blank';open.rel='noopener noreferrer';open.referrerPolicy='no-referrer';actions.append(open);
  if(r.phone){const phone=el('a','ha-secondary','Call '+r.phone);phone.href='tel:+1'+r.phone.replace(/\D/g,'');actions.append(phone);}
  const source=el('a','ha-secondary','Read provider information ↗');source.href=r.url;source.target='_blank';source.rel='noopener noreferrer';actions.append(source);host.append(actions);
  const controls=el('div','ha-card-actions');mountCardActions(controls,housingResourceCard(r),{websiteReader:false,showOriginal:false,showPreview:false});host.append(controls);
  host.append(el('p','ha-small','Provider source checked '+r.checked+'. The program description is verified; an available award, appointment, or individual eligibility is not confirmed. No request has been sent.'));
 }
 const all=document.getElementById('housingHelpAll');
 for(const item of HOUSING_HELP_RESOURCES){const a=el('a','',item.title+' · '+item.provider);a.href=housingResourceRoute(item.id);all.append(a);}
 if(!r)all.closest('details').open=true;
}
if(typeof document!=='undefined')mountResourcePage();
