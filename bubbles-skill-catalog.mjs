// Bubbles Plugins & Skills: safe catalog display, not an OAuth or tool capability grant.
const make=(tag,text='',className='')=>{const e=document.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e};
export function filterCatalog(items,needle){
 const query=String(needle||'').trim().toLowerCase();
 return (Array.isArray(items)?items:[]).filter(x=>!query||[x.id,x.label,x.description,x.origin].some(value=>String(value||'').toLowerCase().includes(query)));
}
export function describeConnectionRisk(id){
 return id==='github'?'Disconnecting GitHub will stop Bubbles from reading and updating your authorized repositories until you reconnect. Existing projects remain yours.':
 id==='cloudflare'?'Disconnecting Cloudflare will prevent Bubbles from deploying to your account and reading Cloudflare resources until you reconnect. Existing deployments may remain live.':'Disconnecting an account removes Bubbles access to its connected tools.';
}
export async function mountBubblesSkillCatalog(target,{fetcher=fetch}={}){
 if(!target)throw Error('skill_catalog_target_missing');
 const status=make('p','Loading Bubbles skills…','ba-muted');status.setAttribute('role','status');
 target.replaceChildren(status);
 let catalog;
 try{
  const result=await fetcher('/bubbles-skill-catalog.json',{cache:'no-store'});
  if(!result.ok)throw Error('HTTP '+result.status);
  catalog=await result.json();
  if(catalog.schemaVersion!==1||!Array.isArray(catalog.localCapabilities)||!Array.isArray(catalog.referenceSkills))throw Error('invalid_catalog');
 }catch{
  status.textContent='The skills catalog is unavailable. Your existing chat and account permissions have not changed.';
  return false;
 }
 const intro=make('p','Skills are instructions; tools require working adapters and account consent. ChatGPT-only skills are listed for reference, not installed into Bubbles.','ba-muted');
 const search=make('input','','ba-field');search.type='search';search.placeholder='Find a skill, memory, file, image, agent…';search.setAttribute('aria-label','Search Bubbles skills');
 const summary=make('p','','ba-muted');summary.setAttribute('role','status');
 const results=make('div','','ba-skill-results');
 const accountLink=make('a','Manage GitHub and Cloudflare permissions →','ba-link');
 accountLink.href='/bubbles-accounts.html';accountLink.rel='noopener';
 const caution=make('p',describeConnectionRisk('github')+' '+describeConnectionRisk('cloudflare'),'ba-muted');
 const details=make('details','','ba-skill-reference');
 details.append(make('summary','Imported ChatGPT skill reference (not executable)'),make('p','Bubbles can use descriptions to plan work, but must never claim access to ChatGPT private account tools or copy authentication.','ba-muted'));
 const reference=make('div','','ba-skill-references');details.append(reference);
 const renderRows=(slot,items,limit)=>{
  slot.replaceChildren();
  for(const item of items.slice(0,limit)){
   const card=make('div','','ba-skill-entry');
   card.append(make('strong',item.label),make('small',item.origin+' · '+item.state),make('p',item.description,'ba-muted'));
   if(item.requires)card.append(make('small','Requires: '+item.requires));
   slot.append(card);
  }
  if(items.length>limit)slot.append(make('p','Showing '+limit+' of '+items.length+' matches. Refine the search to see more.','ba-muted'));
 };
 function render(){
  const a=filterCatalog(catalog.localCapabilities,search.value);
  const b=filterCatalog(catalog.referenceSkills,search.value);
  summary.textContent=a.length+' Bubbles capabilities · '+b.length+' skill references';
  renderRows(results,a,20);
  renderRows(reference,b,80);
 }
 search.addEventListener('input',render);
 target.replaceChildren(intro,accountLink,caution,search,summary,results,details);
 render();return true;
}
