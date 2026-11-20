import {classifyReference,createRule,validateBackup,toCSV,SEED_RULES} from './isha-rulebook-core.mjs';
const $=id=>document.getElementById(id),KEY='infinity.isha.rulebook.v1',LIMIT=500;
const node=(tag,value,cls)=>{const x=document.createElement(tag);if(value!==undefined)x.textContent=value;if(cls)x.className=cls;return x};
let data={version:1,rules:SEED_RULES.map(r=>createRule(r))},canSave=true;
const notify=message=>{$('message').textContent=message};
try{const raw=localStorage.getItem(KEY);if(raw)data=validateBackup(raw);else localStorage.setItem(KEY,JSON.stringify(data));$('storage').textContent='Stored only on this device. Export a backup to preserve a copy.'}
catch{$('storage').textContent='Local storage unavailable or previous data unreadable. Existing stored data will not be overwritten; export before leaving.';canSave=false}
function render(){
 const q=$('rule-search').value.trim().toLowerCase(),all=data.rules,filtered=all.filter(r=>[r.id,r.area,r.observation,r.measure].join(' ').toLowerCase().includes(q));
 const root=$('rule-list');root.replaceChildren();$('record-count').textContent=filtered.length+' of '+all.length+' records · all are drafts, not enacted laws';
 for(const r of filtered){
  const article=node('article',undefined,'record');article.append(node('div',r.id+' · '+r.area+' · '+r.status,'meta'),node('h3',r.observation),node('p',r.measure));
  article.append(node('small','Recorded '+r.updatedAt+' · proposed measure only'));
  if(r.evidenceUrl){const a=node('a','Read cited public source');a.href=r.evidenceUrl;a.target='_blank';a.rel='noopener noreferrer';article.append(node('p'));article.lastChild.append(a)}
  const actions=node('div',undefined,'actions'),remove=node('button','Remove local draft','secondary');
  remove.type='button';remove.addEventListener('click',()=>{write({...data,rules:data.rules.filter(x=>x.id!==r.id)});notify('Local draft removed. Previous exported copies are unchanged.')});
  actions.append(remove);article.append(actions);root.append(article);
 }
 if(!filtered.length)root.append(node('p','No matching saved rules. Change your search or add a new draft.','empty'));
}
function write(next){
 const checked=validateBackup(JSON.stringify(next));data=checked;
 if(canSave){try{localStorage.setItem(KEY,JSON.stringify(data))}catch{canSave=false;$('storage').textContent='Storage unavailable. Use Export backup now.'}}
 render();
}
function download(name,text,type){
 const link=node('a'),url=URL.createObjectURL(new Blob([text],{type}));link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
$('rule-search').addEventListener('input',render);
$('rule-form').addEventListener('submit',e=>{
 e.preventDefault();try{
 const x=new FormData(e.target),max=Math.max(0,...data.rules.map(r=>Number(r.id.slice(5))||0));
 const r=createRule({id:'ISHA-'+String(max+1).padStart(3,'0'),area:x.get('area'),observation:x.get('observation'),measure:x.get('measure'),evidenceUrl:x.get('evidenceUrl')||'',updatedAt:new Date().toISOString()});
 if(data.rules.length>=LIMIT)throw Error('Ledger has reached its record limit.');
 write({version:1,rules:[...data.rules,r]});e.target.reset();notify('Draft saved to this browser. No policy was enacted.');
 }catch(error){notify('Could not save draft: '+error.message)}
});
$('export-csv').addEventListener('click',()=>download('isha-rule-ledger.csv',toCSV(data.rules),'text/csv;charset=utf-8'));
$('export-json').addEventListener('click',()=>download('isha-rule-backup.json',JSON.stringify(data,null,2),'application/json'));
$('file-import').addEventListener('change',async e=>{
 try{
  const f=e.target.files[0];if(!f||f.size>1024*1024)throw Error('Choose an ISHA backup under 1 MiB.');
  const b=validateBackup(await f.text()),byId=new Map(data.rules.map(r=>[r.id,r]));
  for(const r of b.rules){if(byId.has(r.id)&&JSON.stringify(byId.get(r.id))!==JSON.stringify(r))throw Error('Conflicting rule ID '+r.id+'; existing data were not overwritten.');byId.set(r.id,r)}
  write({version:1,rules:[...byId.values()]});notify('Validated backup merged. No previously saved ID was overwritten.');
 }catch(error){notify('Import rejected: '+error.message)}finally{e.target.value=''}
});
$('classify-form').addEventListener('submit',e=>{e.preventDefault();try{const c=classifyReference($('site-input').value);$('site-result').textContent=c.scope.replaceAll('_',' ')+' · '+c.host.replaceAll('.','[.]')+' · live status unknown · operator unknown · no network request made';$('site-result').hidden=false}catch(error){notify('Invalid reference: '+error.message)}});
render();
