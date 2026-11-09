/* Bubbles Add Template: read-only GitHub JSON catalog. No execution or credentials. */
export const TEMPLATE_BASE='https://raw.githubusercontent.com/www-infinity4/Bubbles-Cognitive-Automation/main/';
const ID=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SHA=/^[0-9a-f]{40}$/;
const FILE=/^templates\/[a-z0-9]+(?:-[a-z0-9]+)*\.json$/;
const REPO=/^www-infinity4\/[A-Za-z0-9_.-]+$/;
const BAD_PATH=/(?:^|\/)\.\.?\//;
const opts={credentials:'omit',mode:'cors',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer'};
const text=(v,n)=>String(v||'').trim().slice(0,n);
export function parseTemplateCatalog(catalog){
 if(catalog?.schema!=='bubbles.template.catalog'||catalog.version!==1||!Array.isArray(catalog.templates)||catalog.templates.length>40)throw Error('Unsupported Bubbles template catalog');
 const ids=new Set();
 return catalog.templates.map(entry=>{
  if(!entry||!ID.test(entry.id)||!FILE.test(entry.path)||entry.path!=='templates/'+entry.id+'.json'||ids.has(entry.id))throw Error('Invalid or duplicate template entry');
  ids.add(entry.id);
  return {id:entry.id,path:entry.path,category:text(entry.category,60),title:text(entry.title,120)};
 });
}
function validTemplate(data,entry){
 const source=data?.source,site=data?.widgetphi;
 return data?.schema==='bubbles.card-template'&&data.version===1&&data.id===entry.id&&
  typeof data.title==='string'&&data.title.length>0&&data.title.length<=120&&
  source&&REPO.test(source.repo||'')&&SHA.test(source.commit||'')&&
  typeof source.path==='string'&&source.path.length<240&&!BAD_PATH.test(source.path)&&!source.path.startsWith('/')&&
  site?.schema==='widgetphi.site'&&site.version===1&&Array.isArray(site.cards)&&site.cards.length>=1&&site.cards.length<=12&&
  site.cards.every(card=>card&&/^[a-zA-Z0-9_-]{1,80}$/.test(card.instanceId||'')&&/^[a-zA-Z0-9_-]{1,80}$/.test(card.cardId||'')&&card.settings&&typeof card.settings==='object'&&!Array.isArray(card.settings))&&
  data.integration?.productionVerified===false&&data.integration?.requiresReview===true;
}
export async function loadTemplateCatalog(fetcher=fetch){
 const index=await fetcher(TEMPLATE_BASE+'templates/index.json',opts);
 if(!index?.ok)throw Error('GitHub template catalog unavailable (HTTP '+(index?.status||'unknown')+').');
 const entries=parseTemplateCatalog(await index.json());
 const results=await Promise.all(entries.map(async entry=>{
  try{
   const response=await fetcher(TEMPLATE_BASE+entry.path,opts);
   if(!response?.ok)return null;
   const data=await response.json();
   return validTemplate(data,entry)?data:null;
  }catch{return null;}
 }));
 return results.filter(Boolean);
}
export function createTemplateBuildPrompt(template,currentDraft=''){
 if(!template?.id||!ID.test(template.id)||!validTemplate(template,{id:template.id}))throw Error('Select a verified catalog template');
 const draft=text(currentDraft,1100);
 const source=template.source;
 const path='https://github.com/www-infinity4/Bubbles-Cognitive-Automation/blob/main/templates/'+template.id+'.json';
 const header='Build using Bubbles template '+template.id+' ('+text(template.title,120)+'). Read this actual template before modifying code: '+path+'. Reference original source '+source.repo+' at commit '+source.commit+', file '+source.path+'.';
 const instructions='Keep Oracle Octaves styling and functional controls. The manifest is a proposal, not a deployed card. Verify source, actual permissions, tests, independent review and deployment receipts; do not charge or mint coins.';
 return [header,draft?'My build request: '+draft:'My build request: Adapt this template into a working QuantaPhi Quick Card.',instructions].join('\n').slice(0,2400);
}
export async function mountBubblesTemplatePicker({host,onChoose,fetcher=fetch}={}){
 if(!host||typeof onChoose!=='function')throw Error('Add Template requires a host and selection callback');
 host.replaceChildren();host.hidden=false;
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');status.textContent='Loading source-backed templates from GitHub…';host.append(status);
 let templates;
 try{templates=await loadTemplateCatalog(fetcher);}catch(error){status.textContent='Templates unavailable: '+text(error.message,160);return 0;}
 if(!templates.length){status.textContent='No verified template configurations available. No placeholder cards were added.';return 0;}
 status.textContent=templates.length+' verified configurations · choose one to prepare an editable chat request.';
 const list=document.createElement('div');list.className='ba-template-grid';host.append(list);
 for(const t of templates){
  const card=document.createElement('article');card.className='ba-template-entry';
  const imgUrl=String(t.artwork?.url||'');
  if(/^https:\/\/raw\.githubusercontent\.com\/www-infinity4\/QuantaPhi\/[0-9a-f]{40}\/[-a-zA-Z0-9_/.]+\.(?:png|webp|jpg|jpeg)$/.test(imgUrl)){
   const img=document.createElement('img');img.src=imgUrl;img.alt=text(t.artwork.alt||t.title,150);img.loading='lazy';card.append(img);
  }
  const label=document.createElement('h3');label.textContent=text(t.title,120);
  const desc=document.createElement('p');desc.textContent=text(t.description,260);
  const button=document.createElement('button');button.type='button';button.className='ba-control';button.textContent='Use '+text(t.title,80);button.setAttribute('aria-label','Add '+text(t.title,80)+' to Bubbles chat draft');
  button.addEventListener('click',()=>{onChoose(t);status.textContent=t.title+' added to your editable chat draft. Tap Send when ready; no code was executed.';});
  card.append(label,desc,button);list.append(card);
 }
 return templates.length;
}
