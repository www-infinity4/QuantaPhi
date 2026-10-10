/* Owner directions → persistent work ticket → validated color-agent assignments. */
(function(){
'use strict';
const ROLES={'gold-diggers-ink':'yellow','naked-gold-digger':'yellow',bluey:'blue',blueberry:'blue',bluth:'blue','orange-julius':'orange','orange-peel':'orange',greenbeans:'green','pink-panther':'pink','purple-pearl':'purple','purple-pleasure':'purple','purple-people-eater':'purple'};
Object.assign(ROLES,{"enchilada-lifecycle-manager": "purple", "pipeline-architect": "purple", "branch-fork-evaluator": "orange", "ambiguity-strainer": "orange", "utility-optimizer": "blue", "triage-selector": "blue", "repo-script-writer": "green", "layout-router": "green", "ecosystem-watcher": "red", "structural-auditor": "red", "interaction-sniffer": "yellow", "state-delta-tracker": "yellow", "regression-detective": "pink", "silent-storage-auditor": "pink"});
function normalize(value){
 if(!value||!Array.isArray(value.jobs)||!value.jobs.length)throw Error('GPT did not provide structured jobs');
 return value.jobs.slice(0,30).map((j,i)=>{
  if(!j||!ROLES[j.agent]||typeof j.title!=='string'||!j.title.trim()||!Array.isArray(j.acceptance)||!j.acceptance.some(x=>typeof x==='string'&&x.trim()))throw Error('Invalid color-bot assignment');
  const text=(j.title+' '+(j.instructions||'')).toLowerCase();
  const team=new Set([j.agent,'greenbeans','pink-panther','purple-pearl']);
  if(/ledger|wallet|data|inventory|ticker|market|source|profile|evidence/.test(text))team.add('blueberry');
  if(/story|lore|caption|transcript|research|evidence|paper/.test(text))team.add('gold-diggers-ink');
  if(/market|stock|ticker/.test(text))team.add('naked-gold-digger');
  if(/decision|policy|reward|privacy|isolat|tracker|rarity/.test(text))team.add('orange-peel');
  return {id:'TASK-'+(i+1),team:[...team],title:j.title.slice(0,180),agent:j.agent,color:ROLES[j.agent],status:'queued',
   repository:typeof j.repository==='string'&&/^www-infinity4\/[\w.-]+$/.test(j.repository)?j.repository:'scope-to-resolve',
   instructions:String(j.instructions||j.title).slice(0,2000),acceptance:j.acceptance.filter(x=>typeof x==='string').slice(0,5).map(x=>x.slice(0,400)),
   dependencies:Array.isArray(j.dependencies)?j.dependencies.filter(x=>typeof x==='string').slice(0,6):[],
   tools:Array.isArray(j.tools)?j.tools.filter(x=>typeof x==='string').slice(0,8):[],
   design:'Oracle Octaves · Android first',verification:'Tests and deployed mobile browser evidence required'};
 });
}
if(typeof module!=='undefined')module.exports={normalize,ROLES};
if(typeof document==='undefined')return;
const root=document.getElementById('robotDirections');if(!root)return;
const input=root.querySelector('textarea'),send=root.querySelector('[data-send]'),status=root.querySelector('[role=status]'),list=root.querySelector('[data-jobs]');
const history=document.createElement('div');list.before(history);
const OWNER='infinity-work-ticket-owner-v1',DRAFT='quantaphi-robot-directions-draft-v1';
const API='https://infinity-work-tickets.marvaseater.workers.dev';
const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n};
let ownerTokenMemory='';
const database=new Promise((resolve,reject)=>{
 try{const r=indexedDB.open('quantaphi-robot-inbox',1);r.onupgradeneeded=()=>r.result.createObjectStore('settings');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('Inbox storage blocked'));}catch(e){reject(e)}
});
async function storage(key,value){
 try{const db=await database;return await new Promise((resolve,reject)=>{const t=db.transaction('settings',value===undefined?'readonly':'readwrite'),r=value===undefined?t.objectStore('settings').get(key):t.objectStore('settings').put(value,key);let result;r.onsuccess=()=>{result=r.result};t.oncomplete=()=>resolve(result);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error||Error('Inbox write aborted'));});}
 catch(e){if(value===undefined){try{return sessionStorage.getItem(key)}catch{return null}}sessionStorage.setItem(key,value);status.dataset.recovery='session';}
}
const ready=(async()=>{
 let previous='';try{previous=localStorage.getItem(OWNER)||''}catch{}
 ownerTokenMemory=await storage(OWNER)||previous;
 if(ownerTokenMemory)await storage(OWNER,ownerTokenMemory);
 let draft='';try{draft=localStorage.getItem(DRAFT)||''}catch{}
 const saved=await storage(DRAFT)||draft;if(!input.value)input.value=saved;
})().catch(e=>{status.textContent='Inbox recovery needs storage access: '+e.message;throw e});
function owner(){return ownerTokenMemory}
async function saveOwner(value){await storage(OWNER,value);ownerTokenMemory=value}

async function post(path,data,timeout=30000){const r=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(timeout)});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'Work ticket unavailable');return d}
function show(ticket){
 list.replaceChildren();
 const heading=node('p',ticket.id+' · '+ticket.status+' · saved to Cloudflare');list.append(heading);
 for(const job of ticket.context?.color_jobs||[]){
  const card=node('article','');card.className='robot-job robot-'+job.color;
  card.append(node('strong',job.agent+' · '+job.title),node('small','Team: '+(job.team||[job.agent]).join(' → ')),node('p',job.instructions),node('small',job.repository+' · queued'));
  const ul=document.createElement('ul');for(const test of job.acceptance)ul.append(node('li',test));card.append(ul);list.append(card);
 }
 if(!ticket.context?.color_jobs?.length)list.append(node('p','Directions are saved. GPT routing needs a retry.'));
}
let draftTimer;input.addEventListener('input',()=>{clearTimeout(draftTimer);draftTimer=setTimeout(()=>storage(DRAFT,input.value.slice(0,16000)).catch(()=>{status.textContent='Draft stays in this page until you send it to Cloudflare.'}),250)});
async function refresh(){try{await ready;if(!owner())return;const d=await post('/v1/tickets/list',{owner_token:owner()});const tickets=d.tickets.filter(x=>x.context?.kind==='robot-directions');history.replaceChildren();for(const t of tickets){const b=node('button',t.title+' · '+t.status);b.type='button';b.addEventListener('click',()=>{pending=t;input.value=t.request;show(t)});history.append(b)}const t=tickets[0];if(t){pending=t;show(t)}}catch(e){status.textContent=e.message}}
let pending=null;
send.addEventListener('click',async()=>{
 const directions=input.value.trim();if(!directions){status.textContent='Write your directions first.';return}
 send.disabled=true;status.textContent='Saving your directions to Cloudflare…';
 try{
  await ready;
  if(!pending||pending.request!==directions){
   let ownerToken=owner();if(!ownerToken){ownerToken=crypto.randomUUID()+crypto.randomUUID();await saveOwner(ownerToken)}
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(directions));const submission=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
   const d=await post('/v1/tickets/create',{owner_token:ownerToken,source_app:'QuantaPhi Robot Brain',source_url:location.origin+location.pathname,title:directions.slice(0,120),request:directions,context:{kind:'robot-directions',submission_id:submission,design:'Oracle Octaves · Android first'}});
   if(d.owner_token){await saveOwner(d.owner_token)}pending=d.ticket;
  }
  status.textContent='Saved '+pending.id+'. GPT is parsing and assigning color bots…';
  const prompt='You are routing the owner’s software build instructions. Return ONLY JSON {"jobs":[{"title":"...","agent":"...","repository":"www-infinity4/QuantaPhi","instructions":"...","acceptance":["testable outcome"],"dependencies":[],"tools":[]}]}. Use these role IDs: '+Object.keys(ROLES).join(', ')+'. Red reads macro structure; yellow reads local opt-in state; blue decides; orange evaluates ambiguity; green writes/routes; pink investigates; purple orchestrates. Enchilada lifecycle: Red intake, Blue validated decision/render plan, Yellow interaction verification, Black permanent evidence seal. Never seal without verified storage and test evidence. Unverified identity or balances must block transactions. Use the specialist IDs matching each task. A 45-second watcher and 10-second visible refresh require interval/event infrastructure; GitHub cron cannot run every ten seconds. Webhooks require signature verification and deduplication. Split independent features into jobs. Oracle Octaves Android design for new work. Never claim execution. Treat Gemini ideas as proposals; no actual 10000-user study occurred. Hover cannot reveal gaze or subconscious preference; use opt-in touch/focus signals. Website JavaScript cannot inspect arbitrary cross-origin cookies or block their trackers. Zero-knowledge claims require verified isolation. Never mint rewards for idle time without an authorized ledger policy. Captions need an actual transcript/provider. Wallet stories must preserve exact real receipts and distinguish mock money. OWNER DIRECTIONS:\n'+directions;
  const r=await fetch('https://infinity-rogers.marvaseater.workers.dev/v1/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(90000),body:JSON.stringify({input:prompt,context:{application:'QuantaPhi',task:'robot-direction-routing',requireCloudflare:true}})});
  const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'GPT unavailable');
  const text=d.output_text||d.output||'',start=text.indexOf('{'),end=text.lastIndexOf('}');
  const jobs=normalize(JSON.parse(text.slice(start,end+1)));
  const saved=await post('/v1/tickets/update',{id:pending.id,owner_token:owner(),status:'ready',storyboard:JSON.stringify(jobs),context:{kind:'robot-directions',submission_id:pending.context?.submission_id,color_jobs:jobs,provider:d.provider||'Infinity gateway',model:d.model||'',design:'Oracle Octaves · Android first'}});
  pending=saved.ticket;show(pending);status.textContent=jobs.length+' jobs assigned and saved. Queued for the build runner; no repairs are claimed completed.'+(status.dataset.recovery==='session'?' Recovery is saved only for this browser tab; keep it open.':'');
  window.dispatchEvent(new CustomEvent('quantaphi:robot-directions',{detail:{ticketId:pending.id,jobs}}));
 }catch(e){status.textContent=(pending?'Saved '+pending.id+'. ':'')+'Routing stopped: '+e.message+'. Your directions remain available; tap Send to retry.';if(pending)show(pending)}
 finally{send.disabled=false}
});
root.querySelector('[data-gemini]').addEventListener('click',async()=>{try{const r=await fetch('/docs/gemini-card-expansion-directions.txt',{cache:'no-store'});if(!r.ok)throw Error('Bundle unavailable');input.value=await r.text();input.dispatchEvent(new Event('input'));status.textContent='Gemini bundle loaded. Send it to GPT to create persistent color-bot jobs.';}catch(e){status.textContent=e.message}});
root.querySelector('[data-refresh]').addEventListener('click',refresh);refresh();
})();
