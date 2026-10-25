import {newTask,updateTask,addReceipt,checkpoint,recover,mergeTasks,stats,suggestNext,verified,handoff,safeUrl} from './engine.mjs';
const $=s=>document.querySelector(s);
const storeKey='continuity.workspace.v1';
const foldersKey='continuity.folders.v1';
const statusText={inbox:'Inbox',ready:'Ready',running:'In progress',blocked:'Blocked',review:'Needs proof',complete:'Completed'};
const statuses=['blocked','running','ready','review','inbox','complete'];
const escapeText=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>{const n=new Date(s);return Number.isNaN(n.getTime())?'Unknown':n.toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})};
const seeds=[
 newTask({id:'bubbles-public-x-bridge',title:'Make Bubbles actually read public X posts',project:'Bubbles',status:'blocked',objective:'The live chat must retrieve the owner X candidate inbox and accurately report the latest browser scan result.',nextAction:'Deploy and smoke-test the staged PUBLIC_X Cloudflare binding, then verify a real Bubbles chat reply.',blocker:'Merged PR #1048; deployment run #40161353128 blocked for missing GitHub Actions Cloudflare credentials. The last X scan observed no visible posts.',origin:'source-checkpoint',sourceUrl:'https://github.com/www-infinity4/QuantaPhi/pull/1048',acceptance:['Live Bubbles can read the saved candidate inbox','Blocked scan is correctly distinguished from new posts','No invented runner completion'],receipts:[{kind:'github-pr',label:'PR #1048 merged; live Worker not verified',url:'https://github.com/www-infinity4/QuantaPhi/pull/1048',status:'merged',provenance:'reported'}]}),
 newTask({id:'continuity-launch',title:'Continuity project memory and resume engine',project:'Continuity',status:'running',objective:'Create a stateful mobile workspace, recoverable checkpoint export/import, receipts, task folders and public source sync.',nextAction:'Verify the interface in a browser and run repository acceptance tests before any production release.',origin:'source-checkpoint',acceptance:['Create and edit tasks across project folders','Export and restore a checkpoint without duplication','PR tests and live UI checks pass']}),
 newTask({id:'bubbles-brain-end-to-end',title:'Resume one real Bubbles → Brain job end-to-end',project:'Bubbles',status:'blocked',objective:'Send an authenticated task; show Started, Finished or Blocked from actual runner receipts, not chat promises.',blocker:'Owner-mode live job execution and deployment readback remain unverified.',nextAction:'Choose one bounded existing stuck job; inspect its original ticket and run it through the authenticated owner adapter.',origin:'owner-report',acceptance:['Real job accepted','Runner changes source or produces an explicit block','Commit/test/deploy receipts surfaced in chat']}),
 newTask({id:'interactive-cards-audit',title:'Restore high-quality interactive card continuity',project:'QuantaPhi Cards',status:'review',objective:'Inventory missing and unfinished cards; preserve original branding, real graphics, buttons, viewer and feed positions.',nextAction:'Pull actual card/source receipts from QuantaPhi; verify interactions before showing any card as finished.',origin:'owner-report',acceptance:['Source branding and images visible','Share/collect/+1 controls tested','Public, For You and Following feed presence verified']})
];
let tasks,folders=[],project='All work',filter='all',query='',source={github:'Public GitHub not checked',x:'Last X scan not checked'},busy=false;
try{const saved=JSON.parse(localStorage.getItem(storeKey)||'null');tasks=saved?recover(saved):seeds;}catch{tasks=seeds;}
try{folders=JSON.parse(localStorage.getItem(foldersKey)||'[]');if(!Array.isArray(folders))folders=[];}catch{folders=[];}
function announce(message,type=''){const el=$('#notice');el.textContent=message;el.className='notice'+(type?' '+type:'');}
function persist(){
 try{localStorage.setItem(storeKey,JSON.stringify(checkpoint(tasks)));localStorage.setItem(foldersKey,JSON.stringify(folders));}
 catch{announce('Browser storage could not save this checkpoint. Export a recovery file now.','error');}
}
function saveTask(task){const i=tasks.findIndex(x=>x.id===task.id);if(i<0)tasks.unshift(task);else tasks[i]=task;persist();render();}
const allProjects=()=>[...new Set([...folders,...tasks.map(t=>t.project)])].sort((a,b)=>a.localeCompare(b));
function render(){
 const s=stats(tasks),ready=s.counts.ready+s.counts.running;
 $('#metric-total').textContent=s.total;
 $('#metric-ready').textContent=ready;
 $('#metric-blocked').textContent=s.counts.blocked+s.counts.review;
 $('#metric-complete').textContent=s.counts.complete;
 const projects=[{name:'All work',count:tasks.length},...allProjects().map(name=>({name,count:tasks.filter(t=>t.project===name).length}))];
 $('#projects').innerHTML=projects.map(p=>'<button class="folder '+(project===p.name?'active':'')+'" data-project="'+escapeText(p.name)+'"><span class="folder-name">◫ &nbsp; '+escapeText(p.name)+'</span><b>'+p.count+'</b></button>').join('');
 $('#project-suggestions').innerHTML=allProjects().map(p=>'<option value="'+escapeText(p)+'"></option>').join('');
 const shown=tasks.filter(t=>(project==='All work'||t.project===project)&&(filter==='all'||t.status===filter)&&(!query||[t.title,t.project,t.objective,t.blocker,t.nextAction].join(' ').toLowerCase().includes(query)));
 shown.sort((a,b)=>statuses.indexOf(a.status)-statuses.indexOf(b.status)||b.updatedAt.localeCompare(a.updatedAt));
 $('#shown-count').textContent=shown.length+' shown';
 $('#cards').innerHTML=shown.length?shown.map(renderCard).join(''):'<div class="empty"><h3>No work matches yet.</h3><p>Create a work item or change your search. Existing checkpoints remain saved.</p><button class="primary" data-action="create">+ Add work</button></div>';
 const next=tasks.filter(t=>t.status!=='complete').sort((a,b)=>statuses.indexOf(a.status)-statuses.indexOf(b.status)||b.updatedAt.localeCompare(a.updatedAt))[0];
 $('#next-title').textContent=next?.title||'Everything in view is checked';
 $('#next-action').textContent=next?suggestNext(next):'Add a new project request to begin its continuity record.';
 $('#next-open').dataset.id=next?.id||'';
 $('#next-open').disabled=!next;
 $('#github-status').textContent=source.github;
 $('#x-status').textContent=source.x;
}
function renderCard(t){
 const link=safeUrl(t.sourceUrl);
 return '<article class="task-card" id="work-'+escapeText(t.id)+'"><div class="task-head"><span class="task-project">◫ &nbsp; '+escapeText(t.project)+'</span><span class="status '+escapeText(t.status)+'">'+escapeText(statusText[t.status])+'</span></div>'+
 '<div><h3 class="task-title">'+escapeText(t.title)+'</h3><p class="task-objective">'+escapeText(t.objective||'Acceptance criteria need to be defined.')+'</p></div>'+
 '<div class="task-next"><b>RECOMMENDED CONTINUATION</b>'+escapeText(suggestNext(t))+'</div>'+
 '<div class="task-footer"><div class="task-links"><button class="small-btn resume" data-action="resume" data-id="'+escapeText(t.id)+'">'+(t.status==='complete'?'Inspect':'Resume')+' →</button><button class="small-btn" data-action="edit" data-id="'+escapeText(t.id)+'">Edit</button><button class="small-btn" data-action="receipt" data-id="'+escapeText(t.id)+'">Check proof</button><button class="small-btn" data-action="copy" data-id="'+escapeText(t.id)+'">Copy handoff</button>'+(link?'<a class="small-btn" href="'+escapeText(link)+'" target="_blank" rel="noopener">Source ↗</a>':'')+'</div><span class="task-meta">'+t.receipts.length+' receipts · '+escapeText(date(t.updatedAt))+'</span></div></article>';
}
function editor(task){
 const f=$('#task-form');f.reset();
 const data=task||newTask({title:'Untitled',project:project==='All work'?'General':project});
 $('#dialog-title').textContent=task?'Edit checkpoint':'New work';
 for(const key of ['id','title','project','objective','nextAction','blocker','status','sourceUrl'])f.elements[key].value=task?data[key]||'':(key==='id'?'':key==='project'?(project==='All work'?'':project):key==='status'?'inbox':'');
 f.elements.acceptance.value=task?task.acceptance.join('\n'):'';
 $('#task-dialog').showModal();
 f.elements.title.focus();
}
function receiptDialog(task){$('#receipt-form').reset();$('#receipt-form').elements.id.value=task.id;$('#receipt-dialog').showModal();$('#receipt-form').elements.url.focus();}
function find(id){return tasks.find(t=>t.id===id);}
async function copy(value){try{await navigator.clipboard.writeText(value);announce('Structured continuation handoff copied. This does not execute a Brain job.','good');}catch{announce('Clipboard access was unavailable. Export the recovery JSON instead.','error');}}
async function handleAction(action,id){
 const t=find(id);
 try{
  if(action==='create'){editor();return}
  if(!t)return;
  if(action==='edit'){editor(t);return}
  if(action==='receipt'){receiptDialog(t);return}
  if(action==='copy'){await copy(handoff(t));return}
  if(action==='resume'){
   if(t.status==='complete'){editor(t);return}
   if(t.status==='blocked'){editor(t);announce('Resolve the blocker in the checkpoint before declaring the job running.');return}
   const next=updateTask(t,{status:'running'});saveTask(next);announce('Work marked in progress, not finished. Next: '+suggestNext(next));return;
  }
 }catch(e){announce(e.message,'error');}
}
document.addEventListener('click',e=>{
 const close=e.target.closest('[data-close]');if(close){close.closest('dialog')?.close();return}
 const button=e.target.closest('[data-action]');if(button){handleAction(button.dataset.action,button.dataset.id);return}
 const folder=e.target.closest('[data-project]');if(folder){project=folder.dataset.project;render();return}
});
$('#create').addEventListener('click',()=>editor());
$('#status-filter').addEventListener('change',e=>{filter=e.target.value;render()});
$('#search').addEventListener('input',e=>{query=e.target.value.toLowerCase().trim();render()});
$('#show-blocked').addEventListener('click',()=>{filter='blocked';$('#status-filter').value=filter;project='All work';render();$('#cards').scrollIntoView({behavior:'smooth'})});
$('#resume-first').addEventListener('click',()=>$('#next-open').click());
$('#next-open').addEventListener('click',()=>{const id=$('#next-open').dataset.id;if(!id)return;project='All work';filter='all';query='';$('#status-filter').value='all';$('#search').value='';render();document.getElementById('work-'+id)?.scrollIntoView({behavior:'smooth',block:'center'});handleAction('edit',id)});
$('#new-project').addEventListener('click',()=>{
 const d=document.createElement('dialog');d.innerHTML='<form method="dialog"><div class="dialog-heading"><h2>New project folder</h2><button type="button" class="close" data-close>✕</button></div><label>Folder name<input name="folder" maxlength="64" required placeholder="e.g. Infinity Radio"></label><div class="dialog-actions"><button class="primary" type="submit">Create folder</button></div></form>';
 document.body.append(d);d.addEventListener('close',()=>d.remove(),{once:true});d.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const name=d.querySelector('input').value.trim().slice(0,64);if(!name)return;if(!allProjects().includes(name))folders.push(name);project=name;persist();render();d.close();announce('Folder created. Add the first work checkpoint.','good')});d.showModal();d.querySelector('input').focus();
});
$('#task-form').addEventListener('submit',e=>{
 e.preventDefault();const f=e.currentTarget;
 try{
  const raw=Object.fromEntries(new FormData(f));raw.acceptance=String(raw.acceptance||'').split('\n').map(s=>s.trim()).filter(Boolean);
  const existing=raw.id?find(raw.id):null;
  let t=existing?updateTask(existing,{...raw,acceptance:raw.acceptance}):newTask(raw);
  saveTask(t);$('#task-dialog').close();announce('Checkpoint saved. No runner execution was implied.','good');
 }catch(err){announce(err.message,'error')}
});
$('#export').addEventListener('click',()=>{
 const blob=new Blob([JSON.stringify(checkpoint(tasks),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='continuity-recovery-'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);announce('Recovery JSON exported. Keep a second copy outside this browser.','good');
});
$('#import').addEventListener('change',async e=>{
 const file=e.target.files?.[0];if(!file)return;
 try{if(file.size>3_000_000)throw Error('The recovery file is too large');
 const incoming=recover(JSON.parse(await file.text()));const previous=tasks.length;
 tasks=mergeTasks(tasks,incoming);persist();render();announce('Restored '+incoming.length+' checkpoint records; '+(tasks.length-previous)+' new IDs. Existing newer records were preserved.','good');
 }catch(err){announce('Import rejected: '+err.message,'error')}finally{e.target.value=''}
});
async function githubJSON(url){
 const r=await fetch(url,{headers:{Accept:'application/vnd.github+json'},cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(!r.ok)throw Error('GitHub API returned HTTP '+r.status);
 return r.json();
}
async function verifyRun(task,url){
 const u=new URL(url);
 const m=/^\/([^/]+)\/([^/]+)\/actions\/runs\/(\d+)\/?$/.exec(u.pathname);
 if(u.protocol!=='https:'||u.hostname!=='github.com'||!m)throw Error('Enter a public github.com/owner/repo/actions/runs/NUMBER URL');
 const run=await githubJSON('https://api.github.com/repos/'+encodeURIComponent(m[1])+'/'+encodeURIComponent(m[2])+'/actions/runs/'+m[3]);
 if(String(run.id)!==m[3])throw Error('Run identity did not match the requested receipt');
 const success=run.status==='completed'&&run.conclusion==='success';
 const r=addReceipt(task,{kind:'github-actions',label:'GitHub API: '+String(run.name||'workflow').slice(0,100)+' — '+(run.conclusion||run.status),url:run.html_url,provenance:'provider-confirmed',status:success?'success':run.conclusion||'pending'});
 const patch=success?{status:'review',nextAction:'Source workflow passed; now verify the deployed application behavior separately.'}:{status:'blocked',blocker:'GitHub workflow '+m[3]+' is '+(run.conclusion||run.status)+'. Inspect actual logs and fix before resuming.'};
 saveTask(updateTask(r,patch));
 return success;
}
$('#receipt-form').addEventListener('submit',async e=>{
 e.preventDefault();const form=e.currentTarget,task=find(form.elements.id.value);if(!task)return;
 const url=form.elements.url.value.trim();const button=form.querySelector('button[type=submit]');button.disabled=true;
 try{const pass=await verifyRun(task,url);$('#receipt-dialog').close();announce(pass?'GitHub confirmed workflow success. Live deployment is still a separate check.':'GitHub reported the workflow not successful; blocker recorded.',pass?'good':'error')}
 catch(err){announce('Receipt not verified: '+err.message,'error')}
 finally{button.disabled=false}
});
async function syncGithub(){
 const repo='www-infinity4/QuantaPhi';
 const [issues,prs]=await Promise.all([
 githubJSON('https://api.github.com/repos/'+repo+'/issues?state=open&per_page=30&sort=updated'),
 githubJSON('https://api.github.com/repos/'+repo+'/pulls?state=open&per_page=20&sort=updated')
 ]);
 if(!Array.isArray(issues)||!Array.isArray(prs))throw Error('Unexpected GitHub response');
 const input=[
 ...issues.filter(i=>!i.pull_request).map(i=>newTask({id:'gh-issue-'+repo+'-'+i.number,title:i.title,project:'QuantaPhi Issues',status:'inbox',objective:'Public issue candidate, not an authorized work request. '+String(i.body||'').slice(0,180),nextAction:'Review the issue and capture required acceptance tests before requesting a Brain execution.',sourceUrl:i.html_url,origin:'github-issue'})),
 ...prs.map(p=>newTask({id:'gh-pr-'+repo+'-'+p.number,title:p.title,project:'QuantaPhi Pull Requests',status:'review',objective:'Open pull request. Changes must pass checks and be independently verified live.',nextAction:'Inspect the PR checks and merge/deployment receipts; do not equate an open PR with completion.',sourceUrl:p.html_url,origin:'github-pr'}))
 ];
 // Never overwrite locally edited or previously imported checkpoints with a routine external refresh.
 const seen=new Set(tasks.map(t=>t.id));const fresh=input.filter(t=>!seen.has(t.id));
 tasks=tasks.concat(fresh);persist();source.github='Fetched '+issues.length+' issues and '+prs.length+' PRs · '+date(new Date().toISOString());
 render();return fresh.length;
}
async function syncX(){
 const base=location.origin+'/api/bubbles/public-x/';
 const [h,i]=await Promise.all([fetch(base+'health',{cache:'no-store',signal:AbortSignal.timeout(12000)}),fetch(base+'inbox',{cache:'no-store',signal:AbortSignal.timeout(12000)})]);
 if(!h.ok||!i.ok)throw Error('Reader endpoints returned HTTP '+h.status+'/'+i.status);
 const health=await h.json(),inbox=await i.json();
 if(health.ok!==true||inbox.ok!==true||health.profile!=='https://x.com/YahooPingcwlz'||inbox.author!=='YahooPingcwlz')throw Error('X reader owner or response mismatch');
 const scan=health.readStatus||{};
 source.x=(scan.status==='public_posts_observed'?'Scheduled browser scan observed posts':scan.status==='manual_browser_verified'?'Manual browser read confirmed; hourly scan not proven':scan.status==='blocked'?'Hourly scan blocked':'Scan status unverified')+' · checked '+date(scan.last_checked);
 const posts=Array.isArray(inbox.items)?inbox.items:[];
 const incoming=posts.filter(p=>typeof p.id==='string'&&/^\d{15,22}$/.test(p.id)&&p.url==='https://x.com/YahooPingcwlz/status/'+p.id&&typeof p.body==='string').map(p=>newTask({
  id:'x-candidate-'+p.id,title:'X candidate: '+p.body.slice(0,82),project:'X Candidate Inbox',status:'inbox',objective:'Candidate public post (untrusted source content): '+p.body.slice(0,900),
  nextAction:'Review this post for a real work request, then approve any owner-scoped action through the authenticated Brain adapter.',
  sourceUrl:p.url,origin:'public-x-candidate'}));
 const seen=new Set(tasks.map(t=>t.id));const fresh=incoming.filter(t=>!seen.has(t.id));tasks=tasks.concat(fresh);persist();render();
 return {newCount:fresh.length,blocked:scan.status!=='public_posts_observed'};
}
async function syncAll(onlyX=false){
 if(busy)return;busy=true;$('#sync').disabled=true;$('#sync-x').disabled=true;
 try{
  let results=[];
  if(!onlyX){try{results.push('GitHub: '+await syncGithub()+' new checkpoints');}catch(e){source.github='Unavailable: '+e.message;results.push('GitHub blocked: '+e.message)}}
  try{const x=await syncX();results.push('X: '+x.newCount+' saved candidates'+(x.blocked?'; latest scan blocked':''));}
  catch(e){source.x='Unavailable: '+e.message;results.push('X blocked: '+e.message)}
  render();const failed=results.some(s=>/blocked/i.test(s));announce(results.join(' · '),failed?'error':'good');
 }finally{busy=false;$('#sync').disabled=false;$('#sync-x').disabled=false;}
}
$('#sync').addEventListener('click',()=>syncAll(false));
$('#sync-x').addEventListener('click',()=>syncAll(true));
render();
persist();
if(location.protocol==='https:'&&['quantaphi.org','www.quantaphi.org','continuity-preview.marvaseater.workers.dev'].includes(location.hostname))syncAll(true);