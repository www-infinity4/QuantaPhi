/* Owner directions → persistent work ticket → validated color-agent assignments. */
(function(){
'use strict';
const ROLES={'gold-diggers-ink':'yellow','naked-gold-digger':'yellow',bluey:'blue',blueberry:'blue',bluth:'blue','orange-julius':'orange','orange-peel':'orange',greenbeans:'green','pink-panther':'pink','purple-pearl':'purple','purple-pleasure':'purple','purple-people-eater':'purple'};
function normalize(value){
 if(!value||!Array.isArray(value.jobs)||!value.jobs.length)throw Error('GPT did not provide structured jobs');
 return value.jobs.slice(0,30).map((j,i)=>{
  if(!j||!ROLES[j.agent]||typeof j.title!=='string'||!j.title.trim()||!Array.isArray(j.acceptance)||!j.acceptance.some(x=>typeof x==='string'&&x.trim()))throw Error('Invalid color-bot assignment');
  return {id:'TASK-'+(i+1),title:j.title.slice(0,180),agent:j.agent,color:ROLES[j.agent],status:'queued',
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
const OWNER='infinity-work-ticket-owner-v1',DRAFT='quantaphi-robot-directions-draft-v1';
const API='https://infinity-work-tickets.marvaseater.workers.dev';
const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n};
function owner(){return localStorage.getItem(OWNER)||''}
async function post(path,data,timeout=30000){const r=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(timeout)});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'Work ticket unavailable');return d}
function show(ticket){
 list.replaceChildren();
 const heading=node('p',ticket.id+' · '+ticket.status+' · saved to Cloudflare');list.append(heading);
 for(const job of ticket.context?.color_jobs||[]){
  const card=node('article','');card.className='robot-job robot-'+job.color;
  card.append(node('strong',job.agent+' · '+job.title),node('p',job.instructions),node('small',job.repository+' · queued'));
  const ul=document.createElement('ul');for(const test of job.acceptance)ul.append(node('li',test));card.append(ul);list.append(card);
 }
 if(!ticket.context?.color_jobs?.length)list.append(node('p','Directions are saved. GPT routing needs a retry.'));
}
try{input.value=localStorage.getItem(DRAFT)||''}catch{}
input.addEventListener('input',()=>{try{localStorage.setItem(DRAFT,input.value.slice(0,16000))}catch{}});
async function refresh(){try{if(!owner())return;const d=await post('/v1/tickets/list',{owner_token:owner()});const t=d.tickets.find(x=>x.context?.kind==='robot-directions');if(t)show(t)}catch(e){status.textContent=e.message}}
let pending=null;
send.addEventListener('click',async()=>{
 const directions=input.value.trim();if(!directions){status.textContent='Write your directions first.';return}
 send.disabled=true;status.textContent='Saving your directions to Cloudflare…';
 try{
  if(!pending||pending.request!==directions){
   const d=await post('/v1/tickets/create',{owner_token:owner(),source_app:'QuantaPhi Robot Brain',source_url:location.origin+location.pathname,title:directions.slice(0,120),request:directions,context:{kind:'robot-directions',design:'Oracle Octaves · Android first'}});
   if(d.owner_token){localStorage.setItem(OWNER,d.owner_token)}pending=d.ticket;
  }
  status.textContent='Saved '+pending.id+'. GPT is parsing and assigning color bots…';
  const prompt='You are routing the owner’s software build instructions. Return ONLY JSON {"jobs":[{"title":"...","agent":"...","repository":"www-infinity4/QuantaPhi","instructions":"...","acceptance":["testable outcome"],"dependencies":[],"tools":[]}]}. Use these role IDs: '+Object.keys(ROLES).join(', ')+'. Yellow researches/writes, blue validates/routs data, orange resolves questions, green engineers, pink tests/debugs, purple designs/explains. Split independent features into jobs. Oracle Octaves Android design for new work. Never claim execution. Treat Gemini ideas as proposals; no actual 10000-user study occurred. Hover cannot reveal gaze or subconscious preference; use opt-in touch/focus signals. Website JavaScript cannot inspect arbitrary cross-origin cookies or block their trackers. Zero-knowledge claims require verified isolation. Never mint rewards for idle time without an authorized ledger policy. Captions need an actual transcript/provider. Wallet stories must preserve exact real receipts and distinguish mock money. OWNER DIRECTIONS:\n'+directions;
  const r=await fetch('https://infinity-rogers.marvaseater.workers.dev/v1/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(90000),body:JSON.stringify({input:prompt,context:{application:'QuantaPhi',task:'robot-direction-routing',requireCloudflare:true}})});
  const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'GPT unavailable');
  const text=d.output_text||d.output||'',start=text.indexOf('{'),end=text.lastIndexOf('}');
  const jobs=normalize(JSON.parse(text.slice(start,end+1)));
  const saved=await post('/v1/tickets/update',{id:pending.id,owner_token:owner(),status:'ready',storyboard:JSON.stringify(jobs),context:{kind:'robot-directions',color_jobs:jobs,provider:d.provider||'Infinity gateway',model:d.model||'',design:'Oracle Octaves · Android first'}});
  pending=saved.ticket;show(pending);status.textContent=jobs.length+' jobs assigned and saved. Queued for the build runner; no repairs are claimed completed.';
  window.dispatchEvent(new CustomEvent('quantaphi:robot-directions',{detail:{ticketId:pending.id,jobs}}));
 }catch(e){status.textContent=(pending?'Saved '+pending.id+'. ':'')+'Routing stopped: '+e.message+'. Your directions remain available; tap Send to retry.';if(pending)show(pending)}
 finally{send.disabled=false}
});
root.querySelector('[data-gemini]').addEventListener('click',async()=>{try{const r=await fetch('/docs/gemini-card-expansion-directions.txt',{cache:'no-store'});if(!r.ok)throw Error('Bundle unavailable');input.value=await r.text();input.dispatchEvent(new Event('input'));status.textContent='Gemini bundle loaded. Send it to GPT to create persistent color-bot jobs.';}catch(e){status.textContent=e.message}});
root.querySelector('[data-refresh]').addEventListener('click',refresh);refresh();
})();
