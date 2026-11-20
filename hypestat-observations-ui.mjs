import {normalizeCheck,mergeChecks,parseBackup,searchChecks,compareChecks,MAX_BYTES} from './hypestat-observations-core.mjs';

// Read-only toward researched websites. This page writes only to its own
// browser localStorage when the user explicitly saves or imports a check.
const KEY='quantaphi-hypestat-observations-v1';
const $=id=>document.getElementById(id);
const e=(tag,className='',value='')=>{
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(value!==undefined&&value!==null)node.textContent=String(value);
  return node;
};
const labels={
  caseId:'Case',checkedAt:'Check time (UTC)',exactUrl:'Exact URL',
  onionAddress:'Onion address (text only)',publicMirror:'Public mirror / gateway',
  sourceUrl:'Public source URL',corroboratingSource:'Corroborating source URL',
  redirectUrl:'Reported or observed redirect',
  sourceReported:'Source-reported information',observedData:'Observed data',
  analysis:'Analysis / interpretation',unknowns:'Unknowns',
  nextAction:'Smallest safe next action',custody:'Chain of custody',
  screenshotName:'Screenshot original filename',screenshotSha256:'Screenshot SHA-256',
  screenshotSize:'Screenshot size (bytes)',verification:'Verification status',status:'Status at check'
};
let checks=[],storageBlocked=false;
function message(id,value){$(id).textContent=value}
function localTime(){
  const d=new Date();
  return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);
}
function start(){
  $('checked-at').value=localTime();
  try {
    const raw=localStorage.getItem(KEY);
    if(raw)checks=parseBackup(raw).checks;
  } catch(err){
    storageBlocked=true;
    message('form-message','Saved data could not be safely loaded. Do not save over it. Export or repair browser storage separately.');
    message('backup-message','Local storage is blocked or contains invalid data; no records were overwritten.');
  }
  render();
}
function persist(next){
  if(storageBlocked)throw new Error('Local storage is unreadable; no changes were saved');
  const encoded=JSON.stringify({version:1,checks:next});
  if(encoded.length>MAX_BYTES)throw new Error('Evidence limit reached; export a backup before recording more checks');
  try{localStorage.setItem(KEY,encoded)}catch{throw new Error('Device storage is unavailable or full; no new check was saved')}
  checks=next;
  render();
}
function addField(dl,key,value){
  if(value===''||value===0||value===undefined||value===null)return;
  const dt=e('dt','',labels[key]??key),dd=e('dd',key.endsWith('Url')||key==='onionAddress'||key==='screenshotSha256'?'mono':'',value);
  dl.append(dt,dd);
}
function renderCheck(check,short=false){
  const item=e('article','item');
  const meta=e('div','meta');
  const badge=e('span','pill '+check.status,check.status==='live'?'Live at check':check.status==='unavailable'?'Unavailable at check':check.status==='changed'?'Changed at check':'Unverified');
  const when=e('span','',new Date(check.checkedAt).toLocaleString());
  const scope=e('span','',check.verification.replaceAll('_',' '));
  meta.append(badge,when,scope);
  item.append(meta,e('h3','',check.caseId));
  const dl=e('dl','fields');
  const keys=short?['exactUrl','onionAddress','publicMirror','redirectUrl','sourceReported','observedData','unknowns']:
    ['exactUrl','onionAddress','publicMirror','sourceUrl','corroboratingSource','redirectUrl','sourceReported','observedData','analysis','unknowns','nextAction','custody','screenshotName','screenshotSha256','screenshotSize'];
  for(const key of keys)addField(dl,key,check[key]);
  item.append(dl);
  if(check.sourceUrl){
    const a=e('a','source','View cited public source (opens only when tapped)');
    a.href=check.sourceUrl;
    a.target='_blank';
    a.rel='noopener noreferrer';
    item.append(a);
  }
  if(check.screenshotSha256)item.append(e('p','small muted','File hash only; original screenshot remains with its custodian.'));
  return item;
}
function renderRecords(){
  const q=$('record-search').value, status=$('status-filter').value;
  let list;
  try{list=searchChecks(checks,q,status)}catch{list=[]}
  const holder=$('records-list');holder.replaceChildren();
  message('result-count',list.length+' of '+checks.length+' saved observations');
  if(!list.length){holder.append(e('div','empty','No matching saved checks. Add a manual observation or change the filters.'));return}
  for(const item of list)holder.append(renderCheck(item));
}
function cases(){
  return [...new Set(checks.map(x=>x.caseId))].sort((a,b)=>a.localeCompare(b));
}
function refreshOptions(selectId,placeholder){
  const el=$(selectId),current=el.value;
  el.replaceChildren();
  const first=document.createElement('option');first.value='';first.textContent=placeholder;el.append(first);
  for(const name of cases()){
    const o=document.createElement('option');o.value=name;o.textContent=name;el.append(o);
  }
  if([...el.options].some(o=>o.value===current))el.value=current;
}
function renderTimeline(){
  const key=$('timeline-case').value;
  const list=checks.filter(c=>!key||c.caseId===key);
  const root=$('timeline-list');root.replaceChildren();
  message('timeline-count',list.length+' dated checks · newest first');
  if(!list.length)root.append(e('div','empty','No history yet for this case.'));
  for(const check of list)root.append(renderCheck(check,true));
}
function comparePanel(check,which){
  const el=e('section','card');
  el.append(e('h3','',which),e('p','small muted',new Date(check.checkedAt).toLocaleString()+' · '+check.status+' · '+check.verification.replaceAll('_',' ')));
  const dl=e('dl','fields');
  for(const key of ['exactUrl','publicMirror','redirectUrl','sourceReported','observedData','analysis','unknowns','nextAction','custody','screenshotSha256'])addField(dl,key,check[key]);
  el.append(dl);
  return el;
}
function renderCompare(){
  const key=$('compare-case').value,root=$('comparison-panels');root.replaceChildren();
  if(!key){message('comparison-summary','Select a case with repeated checks.');return}
  const result=compareChecks(checks,key);
  if(!result.latest){message('comparison-summary','No checks for this case.');return}
  if(!result.previous){
    message('comparison-summary','Only one saved check. A comparison needs at least two dated entries.');
    root.append(comparePanel(result.latest,'Only saved check'));return;
  }
  const summary=e('div','');
  summary.append(e('p','',result.count+' saved checks. Comparing the two newest recorded timestamps.'));
  const names=e('div','change-list');
  if(!result.changes.length)names.append(e('span','pill','No compared fields changed'));
  for(const field of result.changes)names.append(e('span','pill',labels[field]??field));
  summary.append(e('p','small muted','Fields that differ:'),names);
  $('comparison-summary').replaceChildren(summary);
  root.append(comparePanel(result.latest,'Most recent check'),comparePanel(result.previous,'Previous check'));
}
function render(){
  renderRecords();
  refreshOptions('timeline-case','All cases');
  refreshOptions('compare-case','Choose a case');
  renderTimeline();renderCompare();
}
async function screenshotMeta(file){
  if(!file)return {screenshotName:'',screenshotSha256:'',screenshotSize:0};
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Screenshot must be PNG, JPEG or WebP');
  if(!file.size||file.size>20_000_000)throw new Error('Screenshot must be nonempty and at most 20 MB');
  if(!globalThis.crypto?.subtle)throw new Error('SHA-256 requires a secure browser context');
  const hash=await crypto.subtle.digest('SHA-256',await file.arrayBuffer());
  const sha=[...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('');
  return {screenshotName:file.name,screenshotSha256:sha,screenshotSize:file.size};
}
async function saveForm(ev){
  ev.preventDefault();
  const button=$('save-check');button.disabled=true;
  try{
    if(storageBlocked)throw new Error('Local storage cannot be read; do not overwrite');
    const values=Object.fromEntries(new FormData(ev.currentTarget).entries());
    if(!values.checkedAt||!Number.isFinite(new Date(values.checkedAt).getTime()))throw new Error('Enter a valid check time');
    const meta=await screenshotMeta($('screenshot-file').files[0]);
    const item=normalizeCheck({...values,...meta,id:'check-'+crypto.randomUUID(),checkedAt:new Date(values.checkedAt).toISOString()});
    persist(mergeChecks(checks,[item]));
    ev.currentTarget.reset();
    // A second historical check must never inherit the previous screenshot.
    $('screenshot-file').value='';
    $('checked-at').value=localTime();
    message('form-message','Saved one dated observation locally. Export a backup when appropriate.');
  }catch(error){message('form-message','Not saved: '+error.message)}
  finally{button.disabled=false}
}
function exportBackup(){
  try{
    const json=JSON.stringify({version:1,checks},null,2);
    const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));
    const a=document.createElement('a');
    a.href=url;a.download='hypestat-public-observations.json';
    document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    message('backup-message','Export requested. Screenshot files themselves are not included in JSON.');
  }catch(error){message('backup-message','Export unavailable: '+error.message)}
}
async function importBackup(ev){
  const file=ev.currentTarget.files[0];
  if(!file)return;
  try{
    if(file.size>MAX_BYTES)throw new Error('Backup file is too large');
    const incoming=parseBackup(await file.text());
    const merged=mergeChecks(checks,incoming.checks);
    const added=merged.length-checks.length;
    persist(merged);
    message('backup-message','Merged '+added+' new checks. Existing IDs were preserved.');
  }catch(error){message('backup-message','Import rejected; existing records unchanged: '+error.message)}
  finally{ev.currentTarget.value=''}
}
function setupTabs(){
  const tabs=[...document.querySelectorAll('[data-tab]')];
  for(const tab of tabs)tab.addEventListener('click',()=>{
    for(const other of tabs){
      const active=other===tab;
      other.setAttribute('aria-selected',String(active));
      $('view-'+other.dataset.tab).hidden=!active;
    }
    if(tab.dataset.tab==='timeline')renderTimeline();
    if(tab.dataset.tab==='compare')renderCompare();
  });
}
$('record-search').addEventListener('input',renderRecords);
$('status-filter').addEventListener('change',renderRecords);
$('timeline-case').addEventListener('change',renderTimeline);
$('compare-case').addEventListener('change',renderCompare);
$('check-form').addEventListener('submit',saveForm);
$('export-json').addEventListener('click',exportBackup);
$('import-json').addEventListener('change',importBackup);
setupTabs();
start();
