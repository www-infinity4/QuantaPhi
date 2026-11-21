// Bubbles specialist launchpad. Profiles are prompts, not independent models or transferred credentials.
const FLARE=['Nova','Aegis','Helix','Orbit','Aurora','Cipher','Mosaic','Quasar','Atlas','Forge','Nimbus','Vortex','Lyra','Pulse','Vector','Comet','Vertex','Beacon','Quantum','Meridian'];
const CATEGORY_NAMES={
 'Security':'Aegis','Data & Analytics':'Cipher','Scientific Research':'Helix',
 'Education':'Sage','Business & Operations':'Forge','Entertainment':'Nova',
 'Finance':'Ledger','Travel':'Atlas','Healthcare':'Vita','Creativity':'Muse',
 'Developer Tools':'Circuit','Communication':'Relay','Productivity':'Pulse',
 'Other':'Scout'
};
const normalized=(value,max=180)=>String(value??'').trim().replace(/\s+/g,' ').slice(0,max);
const nameFor=(label,sourceType,category,index)=>{
 const prefix=sourceType==='bubbles'?'Bubbles':sourceType==='plugin_source'?(CATEGORY_NAMES[category]||'Nova'):FLARE[index%FLARE.length];
 return prefix+' '+normalized(label,57)+' AI';
};
export function buildSpecialists(skillCatalog,providerManifest){
 if(skillCatalog?.schemaVersion!==1||providerManifest?.schemaVersion!==1)throw Error('invalid_specialist_sources');
 if(!Array.isArray(skillCatalog.localCapabilities)||!Array.isArray(skillCatalog.referenceSkills)||!Array.isArray(providerManifest.sources))throw Error('invalid_specialist_lists');
 const output=[];
 const usedIds=new Set(),usedNames=new Set();
 const add=(entry)=>{
  if(!entry.id||usedIds.has(entry.id))throw Error('duplicate_specialist_id');
  let name=nameFor(entry.label,entry.sourceType,entry.category,output.length);
  if(usedNames.has(name))name=name.replace(/ AI$/,' '+(output.length+1)+' AI');
  usedIds.add(entry.id);usedNames.add(name);
  output.push(Object.freeze({...entry,name}));
 };
 for(const item of skillCatalog.localCapabilities){
  add({id:'bubbles-ai:'+normalized(item.id,160),label:normalized(item.label),description:normalized(item.description,500),
   category:'Bubbles',status:normalized(item.state,80),sourceType:'bubbles',sourceName:'Bubbles capability registry',
   requires:normalized(item.requires,220),url:''});
 }
 for(const item of skillCatalog.referenceSkills){
  const parts=String(item.id||'').split('/');
  const family=normalized(parts[3]||'Skill',40);
  add({id:'skill-ai:'+normalized(item.id,160),label:normalized(item.label),description:normalized(item.description,500),
   category:'Skill · '+family,status:'reference_only',sourceType:'chatgpt_skill',
   sourceName:'ChatGPT skill metadata only',requires:'An independently implemented, authorized Bubbles tool',
   url:''});
 }
 for(const item of providerManifest.sources){
  add({id:'plugin-ai:'+normalized(item.id,120),label:normalized(item.name),
   description:normalized(item.feature,500),category:normalized(item.category,80),
   status:'source_only',sourceType:'plugin_source',
   sourceName:'Public app/plugin source · QuantaPhi PR #1285',
   requires:'An independent Bubbles provider connection and user consent',
   url:normalized(item.official,260)});
 }
 return Object.freeze(output);
}
export function filterSpecialists(items,{search='',category='',status='',sourceType=''}={}){
 const q=normalized(search,160).toLowerCase();
 return (Array.isArray(items)?items:[]).filter(x=>
  (!category||x.category===category)&&(!status||x.status===status)&&(!sourceType||x.sourceType===sourceType)&&
  (!q||[x.name,x.label,x.category,x.description,x.sourceName,x.requires].some(v=>String(v||'').toLowerCase().includes(q))));
}
export function makeStarterPrompt(agent){
 if(!agent?.id||!agent?.description)return '';
 return ('Use the '+normalized(agent.name,90)+' specialist profile in Bubbles. Focus: '+normalized(agent.description,520)+
  '. Source: '+normalized(agent.sourceName,120)+'. This is a profile, not a separate connected AI model. '+
  'Before using external tools, verify the Bubbles adapter, account permission and actual tool receipt. '+
  'If access is missing, say what is unavailable and help me plan safely without claiming execution. '+
  'Ask me what I want to do with this specialty.').slice(0,2300);
}
export function safeDraft(existing,suggestion){
 if(normalized(existing,1))return {ok:false,reason:'draft_exists'};
 if(!normalized(suggestion))return {ok:false,reason:'empty_prompt'};
 return {ok:true,text:String(suggestion).slice(0,2400)};
}
function node(tag,value='',cls=''){
 const result=document.createElement(tag);
 if(value)result.textContent=value;
 if(cls)result.className=cls;
 return result;
}
function httpsLink(value){
 try{const u=new URL(value,location.origin);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}
 catch{return '';}
}
export function prepareExistingBubblesComposer(agent){
 const input=document.querySelector('#bubblesAICard .ba-composer textarea[aria-label="Message Bubbles"]')||
  document.querySelector('.ba-panel .ba-composer textarea[aria-label="Message Bubbles"]');
 if(!input)return {ok:false,reason:'composer_unavailable'};
 const result=safeDraft(input.value,makeStarterPrompt(agent));
 if(!result.ok)return result;
 input.value=result.text;
 input.dispatchEvent(new Event('input',{bubbles:true}));
 // Opening the existing chat is not a send or permission grant.
 const panel=input.closest('.ba-panel');
 if(panel?.hidden){const launcher=document.querySelector('.ba-launcher');if(launcher)launcher.click();}
 input.focus();
 input.scrollIntoView?.({block:'nearest',behavior:'smooth'});
 return {ok:true};
}
export async function mountBubblesAISpecialists(host,{fetcher=fetch}={}){
 if(!host)throw Error('specialist_mount_missing');
 const status=node('p','Loading named AI specialists…','bas-ai-muted');status.setAttribute('role','status');
 host.replaceChildren(status);
 let specialists;
 try{
  const [skillsResponse,sourceResponse]=await Promise.all([
   fetcher('/bubbles-skill-catalog.json',{cache:'no-store'}),
   fetcher('/bubbles-ai-plugin-sources.json',{cache:'no-store'})
  ]);
  if(!skillsResponse.ok||!sourceResponse.ok)throw Error('directory_source_unavailable');
  specialists=buildSpecialists(await skillsResponse.json(),await sourceResponse.json());
  if(specialists.length<100)throw Error('directory_below_100');
 }catch{
  status.textContent='AI specialist catalog unavailable. The existing Bubbles chat still works; no account permissions have changed.';
  return false;
 }
 const heading=node('h3',specialists.length+' AI specialists','bas-ai-heading');
 const intro=node('p','Choose a named specialist to prepare a task in the same Bubbles chat. A profile is not an independently connected model. External provider actions require their own authorization.','bas-ai-muted');
 const search=node('input','','bas-ai-search');search.type='search';search.placeholder='Search AI buttons, skills and services';
 search.setAttribute('aria-label','Search AI specialist buttons');
 const category=node('select','','bas-ai-filter');category.setAttribute('aria-label','AI category');
 const statusFilter=node('select','','bas-ai-filter');statusFilter.setAttribute('aria-label','AI connection state');
 const option=(select,value,label)=>{const opt=node('option',label);opt.value=value;select.append(opt)};
 option(category,'','All categories');
 for(const key of [...new Set(specialists.map(x=>x.category))].sort())option(category,key,key);
 option(statusFilter,'','All readiness states');
 option(statusFilter,'reference_only','ChatGPT reference');
 option(statusFilter,'source_only','Provider source only');
 option(statusFilter,'implemented_conditional','Bubbles: conditional tool');
 option(statusFilter,'not_connected','Not connected');
 option(statusFilter,'configuration_pending','Configuration pending');
 option(statusFilter,'implemented_in_source_pending_live_deployment','Pending live deployment');
 const count=node('p','','bas-ai-count');count.setAttribute('role','status');count.setAttribute('aria-live','polite');
 const grid=node('div','','bas-ai-grid');
 const detail=node('div','','bas-ai-detail');detail.setAttribute('aria-live','polite');
 const choose=(agent)=>{
  detail.replaceChildren();
  detail.append(node('h4',agent.name),node('p',agent.description),node('p',agent.sourceName+' · '+agent.status,'bas-ai-muted'));
  if(agent.requires)detail.append(node('p','Requires: '+agent.requires,'bas-ai-muted'));
  const actions=node('div','','bas-ai-actions');
  const prepare=node('button','Prepare in Bubbles','bas-ai-use');prepare.type='button';
  const feedback=node('p','','bas-ai-feedback');feedback.setAttribute('role','status');
  prepare.addEventListener('click',()=>{
   const result=prepareExistingBubblesComposer(agent);
   feedback.textContent=result.ok?'Task prepared in the existing Bubbles message box. Review it and tap Send.':
    result.reason==='draft_exists'?'Your existing unsent message was preserved. Send or clear it before choosing an AI.':
    'The Bubbles message box is unavailable. Open Bubbles chat and retry.';
  });
  actions.append(prepare);
  const sourceHref=httpsLink(agent.url);
  if(sourceHref){const link=node('a','Official source','bas-ai-source');link.href=sourceHref;link.target='_blank';link.rel='noopener noreferrer';actions.append(link);}
  detail.append(actions,feedback);
 };
 const render=()=>{
  const matches=filterSpecialists(specialists,{search:search.value,category:category.value,status:statusFilter.value});
  count.textContent=matches.length+' of '+specialists.length+' specialist buttons';
  const fragment=document.createDocumentFragment();
  for(const agent of matches){
   const button=node('button','','bas-ai-button');button.type='button';
   button.setAttribute('aria-label','Open '+agent.name+' · '+agent.status);
   button.append(node('strong',agent.name),node('small',agent.category));
   button.addEventListener('click',()=>choose(agent));
   fragment.append(button);
  }
  grid.replaceChildren(fragment);
 };
 search.addEventListener('input',render);
 category.addEventListener('change',render);
 statusFilter.addEventListener('change',render);
 const filters=node('div','','bas-ai-filters');filters.append(search,category,statusFilter);
 const note=node('p','These '+specialists.length+' profiles are sourced from Bubbles capabilities, ChatGPT skill references, and public plugin cards. Private ChatGPT plugin credentials and personal data were not copied.','bas-ai-muted');
 host.replaceChildren(heading,intro,filters,count,grid,detail,note);
 render();
 return {count:specialists.length};
}
if(typeof document!=='undefined'){
 const host=document.getElementById('bubblesAISpecialistHub');
 if(host)void mountBubblesAISpecialists(host);
}
