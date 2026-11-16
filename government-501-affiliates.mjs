import {GOV501_RESOURCES,selectGovernmentResources,officialResourceUrl} from './government-501-core.mjs';
const el=(tag,cls,label)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(label!==undefined)node.textContent=label;return node;};
export function mountGovernment501(host){
 if(!host||host.dataset.gov501Ready)return;
 host.dataset.gov501Ready='true';host.classList.add('gov501-card');
 const hero=host.appendChild(el('header','gov501-hero'));
 const picture=hero.appendChild(el('div','gov501-image'));
 const icon=picture.appendChild(el('img'));icon.src='https://www.google.com/s2/favicons?domain=usa.gov&sz=128';icon.alt='USA.gov source website icon';icon.width=100;icon.height=100;
 const heading=hero.appendChild(el('div','gov501-heading'));
 heading.append(el('span','gov501-kicker','QUANTAPHI · PUBLIC RESOURCE HUB'),el('h2',null,'501 Affiliates'),el('p',null,'Government agency directories, open developer documentation, job applications and legitimate partner entry points.'));
 const note=host.appendChild(el('p','gov501-boundary','Independent QuantaPhi directory. 501 is our card name, not a federal agency or clearance. This card does not grant government worker access, employee credentials, internal systems or agency affiliation. Agencies control their own authorization.'));
 const form=host.appendChild(el('form','gov501-find'));
 const label=form.appendChild(el('label',null,'Find an agency resource'));
 const input=label.appendChild(el('input'));input.type='search';input.placeholder='Agencies, developer tools, public data, jobs…';input.maxLength=80;input.autocomplete='off';
 const clear=form.appendChild(el('button',null,'Show all'));clear.type='button';
 const count=host.appendChild(el('p','gov501-count'));
 const list=host.appendChild(el('div','gov501-resources'));list.setAttribute('aria-label','Official public agency resources');
 function render(){
  list.replaceChildren();
  const rows=selectGovernmentResources(input.value);count.textContent=rows.length+' official entry points';
  for(const row of rows){
   const url=officialResourceUrl(row.url);if(!url)continue;
   const card=list.appendChild(el('article','gov501-resource'));
   card.append(el('small','gov501-category',row.category+' · '+(row.access==='public'?'Open public information':row.access==='agency-approval'?'Agency approval required':'Official sign-in or registration may be required')),
    el('h3',null,row.title),el('p',null,row.description));
   const link=card.appendChild(el('a','gov501-open','Open official '+new URL(url).hostname+' ↗'));
   link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.referrerPolicy='no-referrer';
  }
  if(!rows.length)list.append(el('p','gov501-empty','No matching official entry points. Try “agency”, “developer”, “jobs”, or “data”.'));
 }
 form.addEventListener('submit',event=>{event.preventDefault();render()});
 input.addEventListener('input',render);clear.addEventListener('click',()=>{input.value='';render();input.focus()});
 const footer=host.appendChild(el('p','gov501-footer','Government employee tools require direct agency employment/authorization, or approved government vendor or developer agreements. No passwords, IDs, employee tokens or clearance documents are collected by this card.'));
 const actions=host.appendChild(el('div','gov501-actions'));
 const agency=actions.appendChild(el('a',null,'Official agency directory'));agency.href='https://www.usa.gov/agency-index/';agency.target='_blank';agency.rel='noopener noreferrer';
 const developer=actions.appendChild(el('a',null,'Developer partnership guide'));developer.href='https://developers.login.gov/';developer.target='_blank';developer.rel='noopener noreferrer';
 render();
 return {host,count,list};
}
if(typeof document!=='undefined'){
 const ready=()=>mountGovernment501(document.getElementById('government501Affiliates'));
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
}
