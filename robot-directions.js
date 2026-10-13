/* Owner directions → persistent work ticket → validated color-agent assignments. */
(async function(){
'use strict';
const ROLES={'gold-diggers-ink':'yellow','naked-gold-digger':'yellow',bluey:'blue',blueberry:'blue',bluth:'blue','orange-julius':'orange','orange-peel':'orange',greenbeans:'green','pink-panther':'pink','purple-pearl':'purple','purple-pleasure':'purple','purple-people-eater':'purple'};
Object.assign(ROLES,{"enchilada-lifecycle-manager": "purple", "pipeline-architect": "purple", "branch-fork-evaluator": "orange", "ambiguity-strainer": "orange", "utility-optimizer": "blue", "triage-selector": "blue", "repo-script-writer": "green", "layout-router": "green", "ecosystem-watcher": "red", "structural-auditor": "red", "interaction-sniffer": "yellow", "state-delta-tracker": "yellow", "regression-detective": "pink", "silent-storage-auditor": "pink"});
Object.assign(ROLES,{"purple-reign":"purple","grape-escape":"purple","deep-plum":"purple","orange-peel":"orange","marmalade":"orange","tangelo":"orange","blue-velvet":"blue","indigo":"blue","cobalt":"blue","green-hornet":"green","jade":"green","mint-condition":"green","red-alert":"red","crimson":"red","yellow-jacket":"yellow","gold-digger":"yellow","pink-floyd":"pink","bubblegum":"pink","magenta":"pink","the-black-box":"black"});
// Default toolbox for each color team, used whenever GPT omits a job's tools.
const ROLE_TOOLS={
 red:['Live page fetch & HTTP status','Uptime and domain health watch','Sitemap and link crawler','CDN / dependency change watch'],
 yellow:['Android Chromium browser run','Tap-target and form checks','Local storage and draft state inspector','Screenshot capture'],
 blue:['Repository source reader','Ledger and receipt comparator','Priority triage','Acceptance-criteria planner'],
 orange:['Requirement clarifier','Privacy and wallet-safety policy check','Branch / fork evaluator'],
 green:['Bounded patch writer','Cache-version bumper','Layout router','Commit with base-SHA conflict check'],
 pink:['Regression test runner','Console and network error reader','Broken image and media detector','Silent storage auditor'],
 purple:['GPT receipt review','Job sequencer and retries','Progress reporter','Owner acceptance gate'],
 black:['Permanent evidence seal','Deployed source verification']
};
const REPO='www-infinity4/QuantaPhi';
const MOBILE='Verified in the Android Chromium browser on quantaphi.org with screenshots attached';
// One-tap maintenance crews: saved straight to the work ticket as structured
// jobs, so they reach the runner even when GPT routing is unavailable.
const SITE_CREWS=[
 {"id":"oracle-real-video","label":"Real video generation","jobs":[{"agent":"greenbeans","executor":"repository-engine","queue_priority":95,"title":"Upgrade Oracle video timeline beyond three still images","instructions":"Inspect phi-video-builder.js, phi-media-studio.js, video-studio.html and existing cinema timeline helpers. Build an editable multi-shot timeline with variable scene count and per-shot duration, reorder, trim, captions, independent audio/voice tracks, reference images, character/style continuity and saved resumable project metadata. Preserve Oracle Octaves Android styling and current drafts. Keep animated stills as explicitly labeled slideshow mode. Add a separate AI motion mode that consumes genuine video clips through a provider adapter; never call zoomed images AI motion. Do not change wallets, studio branding or existing image-generator behavior. No provider keys, paid provisioning or external purchases.","acceptance":["Variable shot counts and durations work without a three-scene validator; ordering and trim survive reopening a project.","Existing Image mode and animated-still export continue working; AI motion is labeled separately.","Android controls retain drafts and handle cancel/error states without losing completed shots."]},{"agent":"greenbeans","executor":"repository-engine","queue_priority":94,"title":"Connect genuine text/image-to-video jobs through a replaceable backend","dependencies":["TASK-1"],"instructions":"Implement a documented async motion-provider contract: create job, poll status, cancel, retrieve validated video asset, and assemble clips with audio into a playable downloadable final video. Assess official Wan-Video/Wan2.2 as an Apache-2.0 model candidate for a separate GPU service; use an existing verified backend if available. Bots build the adapter and orchestration, not a new foundation model. Keep secrets server-side, bind jobs/assets to their authenticated owner, validate uploads, deduplicate retries, save completed clips, and expose truthful queued/running/failed/completed states. Never fallback silently from motion to stills. Cloudflare coordinates jobs/storage; do not assume its current Worker can run GPU inference or FFmpeg. If executor policy excludes backend files, return a precise blocked receipt and proposed patch scope rather than bypassing it. No paid provisioning, guessed credentials, model downloads or new external services without configuration. With no backend, show motion backend not configured; local fakes are test-only.","acceptance":["Provider contract has create/status/cancel/output and retry deduplication tests; missing backend produces an explicit configured-state error.","Real acceptance uses an actual decoded multi-frame video with visible subject motion beyond whole-image pan/zoom, not mocked URLs or three pictures.","Final asset plays, has correct duration/audio, and downloads; completed shots survive retry."]},{"agent":"pink-panther","executor":"repository-engine","queue_priority":93,"title":"Verify end-to-end Oracle motion video and seal evidence","dependencies":["TASK-1","TASK-2"],"instructions":"Test variable timeline, cancellation, provider failure, duplicate submission, resume, audio alignment, clip assembly, permissions and Android preview/export. Record exact commit, engine/provider, test commands, actual clip dimensions/frame count/duration and deployment status. Mock adapter tests are separate from real generation acceptance. For Bubbles and Quant AI use existing production cue manifests and approved artwork; copyrighted song recording/likeness assets stay placeholders unless supplied with authorization. Do not change wallet or existing production directions. If no GPU endpoint/credentials are configured, mark real-motion acceptance blocked, never complete. Report evidence to Purple and Black only after verification.","acceptance":["Regression suite passes and Android preview/export evidence is attached.","Real-motion verification or its exact backend blocker is recorded; mock tests cannot satisfy it.","Brain receipt distinguishes code committed, deployed, generated and verified; no unsupported completion claim."]}]},
 {"id": "quant-ai-production", "label": "Quant AI production", "jobs": [{"id": "TASK-1", "agent": "greenbeans", "color": "green", "repository": "www-infinity4/QuantaPhi", "executor": "repository-engine", "queue_priority": 100, "status": "queued", "team": ["yellow-jacket", "greenbeans", "pink-panther", "purple-pearl"], "title": "Update Quant AI music-driven presentation", "instructions": "Read production/quant-ai-commercial.json v2. Use the owner\u2019s selected Shiny Happy People direction and all 44 ordered visual cues. Oracle Octaves styling is required. Keep the humanoid business lead, compact partner and Bubbles specialists. Explicitly target the full repository executor with executor=repository-engine; this is not a robot-directions.js interface repair. Create or update quant-ai-presentation.html, quant-ai-presentation.js and quant-ai-presentation.css from the saved cue list. Show readable scene cards, original independent Infinity Platinum concept, distinct individual quants, Share/Collect, commerce, planted page fields and new inventory proposals. R.E.M. and Kris visual beats use labeled placeholders until their approved assets are attached. Add test/quant-ai-presentation.test.cjs verifying cue order, product branding, next/previous and keyboard controls. Do not edit robot-directions.js, wallet logic or existing studio files. No external slideshow provider or pptx is required.", "acceptance": ["All 44 saved visual cues represented in order", "Playable presentation navigation and exact product branding", "Executable focused tests pass; label source/deployment evidence separately"], "dependencies": []}, {"id": "TASK-2", "agent": "greenbeans", "color": "green", "repository": "www-infinity4/QuantaPhi", "executor": "repository-engine", "queue_priority": 100, "status": "queued", "team": ["yellow-jacket", "greenbeans", "pink-panther", "purple-pearl"], "title": "Build Quant AI song-cue video timeline", "instructions": "Read production/quant-ai-commercial.json v2. Use the owner\u2019s selected Shiny Happy People direction and all 44 ordered visual cues. Oracle Octaves styling is required. Keep the humanoid business lead, compact partner and Bubbles specialists. Explicitly target the full repository executor with executor=repository-engine; this is not a robot-directions.js interface repair. Create or update quant-ai-commercial.html and quant-ai-commercial.js. Use the full ordered song-cue sequence and support editable cue marks plus an uploaded authorized audio track. Retain a clearly labeled silent 35-second scene-order draft when audio is absent; do not imply it is song-synchronized. Once audio is supplied, derive duration from actual loaded metadata and align configured cue marks; do not guess song timings. Implement original scene animation, preview, cancellation and real MediaRecorder export through cinema-reel-core.js. Use readable real-font captions with product/cue names rather than publishing the full lyrics. Preserve all repeated hands/laughter motifs with camera/participant variation. Band and Kris beats remain placeholders until approved visual assets are attached. Add test/quant-ai-commercial.test.cjs for ordered cues, missing-audio status, cue timing validation and export lifecycle. Do not download the song, add invented artist vocals, claim Google/Microsoft partnership or edit wallet/robot-directions.js.", "acceptance": ["All saved cues included, with deliberate repeated chorus variation", "Audio absence remains explicit; attached audio drives real duration and validated timing", "Preview/cancel/export code and executable focused tests pass"], "dependencies": ["TASK-1"]}, {"id": "TASK-3", "agent": "pink-panther", "color": "pink", "repository": "www-infinity4/QuantaPhi", "executor": "repository-engine", "queue_priority": 100, "status": "queued", "team": ["greenbeans", "pink-panther", "purple-pearl"], "title": "Verify Quant AI music-direction scenes and export", "instructions": "Read production/quant-ai-commercial.json v2. Use the owner\u2019s selected Shiny Happy People direction and all 44 ordered visual cues. Oracle Octaves styling is required. Keep the humanoid business lead, compact partner and Bubbles specialists. Explicitly target the full repository executor with executor=repository-engine; this is not a robot-directions.js interface repair. After TASK-1 and TASK-2, inspect their actual source and tests. Verify data entities remain distinct, the two portrait beats remain correctly assigned to R.E.M. then Kris, planting leads to extracted-data inventory cards, Platinum is labeled as a concept, and all repeated connected-hands/laughter cues are retained. Verify navigation and export cancellation. Record real audio metadata/cue marks only when an authorized audio asset is attached; no singing, alignment, playback or deployment success claims without corresponding evidence. Add focused executable regressions for any verified defects.", "acceptance": ["Owner scene assignments and ordered repeat cues checked against the saved source", "Actual tests and export/cancellation evidence recorded", "Missing portrait/audio assets and verification status reported precisely"], "dependencies": ["TASK-1", "TASK-2"]}]},
 {id:'health-watch',label:'Site health watch',jobs:[
  {agent:'ecosystem-watcher',title:'Watch quantaphi.org uptime, HTTP status and broken links',instructions:'Fetch the live home page, About, Learn, Storybook and every in-page site link. Record HTTP status, response time and any 4xx/5xx or redirect loop.',acceptance:['Every linked page returns HTTP 200 or a documented redirect','A dated report lists any broken link with its source element']},
  {agent:'regression-detective',title:'Read console and network errors on the live page',instructions:'Load quantaphi.org on Android Chromium, capture console errors, failed requests and uncaught promise rejections.',acceptance:['Zero uncaught errors on first load, or each one is filed as a repair job',MOBILE]}]},
 {id:'repair',label:'Repair broken pieces',jobs:[
  {agent:'regression-detective',title:'Find and repair broken images, audio and video',instructions:'Check every card image, story illustration, radio episode and media extension for failed loads. Repair the source or show a working fallback.',acceptance:['No broken-image icons or silent players on the home page',MOBILE]},
  {agent:'repo-script-writer',title:'Patch failing cards with bounded fixes',instructions:'For each defect found by the watch crew, apply the smallest patch, bump its cache version and run the regression tests.',acceptance:['Existing regression tests pass','The repaired card works on quantaphi.org after deploy']}]},
 {id:'upgrades',label:'Upgrades & speed',jobs:[
  {agent:'utility-optimizer',title:'Speed up first load on Android',instructions:'Measure load time and largest assets. Defer non-critical scripts and compress oversized images without changing behavior.',acceptance:['Home page is interactive faster than the recorded baseline','No feature is removed']},
  {agent:'pipeline-architect',title:'Plan the next owner-requested upgrade',instructions:'Read saved owner directions and open issues, pick the highest-value upgrade and break it into tested steps.',acceptance:['A prioritized upgrade plan with testable steps is saved to this ticket']}]},
 {id:'image-proofreading',label:'Image lettering proofreading',jobs:[
  {agent:'purple-pearl',title:'Proofread generated images for fake lettering',instructions:'Review recent Image Studio and story illustrations. Flag any painted pseudo-letters and repaint them as clean artwork with exact words added by real browser fonts.',acceptance:['No unreadable or invented writing appears in saved images','Requested words are spelled exactly using browser typography']}]},
 {id:'mobile-a11y',label:'Mobile & accessibility check',jobs:[
  {agent:'interaction-sniffer',title:'Check tap targets, contrast and keyboard focus',instructions:'Inspect every button and input on the home page for 44px tap targets, visible focus and readable contrast.',acceptance:['All controls are at least 44px tall on Android','Focus is visible on every interactive element']},
  {agent:'layout-router',title:'Fix horizontal scrolling and overlapping cards',instructions:'Find any card wider than the phone viewport or overlapping content and correct its layout.',acceptance:['No horizontal scroll at 360px width',MOBILE]}]},
 {id:'security-wallet',label:'Security & wallet guard',jobs:[
  {agent:'silent-storage-auditor',title:'Audit private keys and wallet safety',instructions:'Confirm owner keys and wallet tokens never appear in URLs, logs or public pages, and that unverified balances block transactions.',acceptance:['No secret appears in page source, URLs or console output','Unverified identity blocks wallet actions']},
  {agent:'structural-auditor',title:'Verify owner-only areas stay private',instructions:'Confirm the Robot Brain and job controls stay hidden for visitors and the brain clock returns 404 without the owner key.',acceptance:['Public page hides the Robot Brain','Brain clock endpoints return 404 without the owner key']}]}
];
function fallbackJobs(directions){
 const parts=String(directions||'').split(/\n+|(?<=[.!?])\s+/).map(x=>x.replace(/^[\s*\-\u2022\d.)]+/,'').trim()).filter(x=>x.length>=8).slice(0,8);
 const pick=text=>/broken|bug|error|fix|repair|crash|fail/i.test(text)?'regression-detective':/image|picture|letter|font|text on/i.test(text)?'purple-pearl':/mobile|android|layout|button|tap|scroll/i.test(text)?'layout-router':/wallet|coin|quant|ledger|payout|secur|private/i.test(text)?'silent-storage-auditor':/watch|monitor|uptime|health|link/i.test(text)?'ecosystem-watcher':/fast|speed|slow|upgrade|improve/i.test(text)?'utility-optimizer':'repo-script-writer';
 return {jobs:(parts.length?parts:[String(directions||'').trim()]).map(text=>({title:text.slice(0,180),agent:pick(text),repository:REPO,instructions:text,acceptance:['The requested change is visible on quantaphi.org',MOBILE,'Existing regression tests pass']}))};
}
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
   tools:Array.isArray(j.tools)&&j.tools.some(x=>typeof x==='string'&&x.trim())?j.tools.filter(x=>typeof x==='string'&&x.trim()).slice(0,8):(ROLE_TOOLS[ROLES[j.agent]]||[]).slice(),
   executor:j.executor==='repository-engine'?'repository-engine':undefined,queue_priority:Number.isFinite(j.queue_priority)?Math.max(-100,Math.min(100,j.queue_priority)):0,design:'Oracle Octaves · Android first',verification:'Tests and deployed mobile browser evidence required'};
 });
}
if(typeof module!=='undefined')module.exports={normalize,ROLES,ROLE_TOOLS,SITE_CREWS,fallbackJobs};
if(typeof document==='undefined')return;
const root=document.getElementById('robotDirections');if(!root)return;

async function verifyBrainOwner(){
 let token='';
 try{
  token=await new Promise((resolve,reject)=>{
   const r=indexedDB.open('quantaphi-robot-inbox',1);
   r.onupgradeneeded=()=>r.result.createObjectStore('settings');
   r.onerror=()=>reject(r.error);
   r.onsuccess=()=>{const db=r.result,t=db.transaction('settings','readonly'),q=t.objectStore('settings').get('infinity-work-ticket-owner-v1');q.onsuccess=()=>{resolve(q.result||'');db.close()};q.onerror=()=>reject(q.error)};
  });
  token=token||sessionStorage.getItem('infinity-work-ticket-owner-v1')||localStorage.getItem('infinity-work-ticket-owner-v1')||'';
  if(!token)return null;
  const headers={Authorization:'Bearer '+token};
  const r=await fetch('https://infinity-brain-clock.marvaseater.workers.dev/health',{headers,cache:'no-store',signal:AbortSignal.timeout(12000)});
  return r.ok?headers:null;
 }catch{return null}
}

// The owner gate resolves only for the verified owner and keeps retrying
// transient failures, so a missing key or slow network never deletes the Brain.
const brainHeaders=await (window.QuantaBrainOwner?window.QuantaBrainOwner.ready:verifyBrainOwner());if(!brainHeaders){root.remove();return;}root.dataset.ownerVerified='1';root.hidden=false;
const earningsButton=document.createElement('button'),earningsStatus=document.createElement('p');
earningsButton.type='button';earningsButton.textContent='Retry bot earnings settlement';earningsStatus.setAttribute('role','status');root.append(earningsButton,earningsStatus);
let earningsConnecting=false,earningsConnected=false;
async function connectBotEarnings(){
 if(earningsConnecting)return;
 earningsConnecting=true;
 earningsButton.disabled=true;earningsStatus.textContent='Verifying your wallet and recorded bot work…';
 try{

  if(!window.InfinityCloudWallet)throw Error('Wallet connection is not loaded yet.');
  const wallet=new window.InfinityCloudWallet(),walletToken=await window.QuantaCloudConnection?.resolveDeviceToken?.()||wallet.token();
  if(!/^sq_[A-Za-z0-9_-]{32,}$/.test(walletToken||''))throw Error('Your wallet identity is not connected yet. Bot earnings remain saved and will retry when it connects.');
  const response=await fetch('https://infinity-brain-clock.marvaseater.workers.dev/work/earnings/connect',{method:'POST',headers:{...brainHeaders,'Content-Type':'application/json'},body:JSON.stringify({walletToken}),signal:AbortSignal.timeout(60000)});
  const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'Bot earnings connection failed');
  earningsConnected=true;
  const paid=(result.payouts||[]).filter(p=>p.status==='paid'&&!p.replayed),quants=paid.filter(p=>p.asset==='QUANT').length,stars=paid.filter(p=>p.asset==='STARCOIN').length;
  earningsStatus.textContent='Connected to '+result.username+'. '+quants+' Quant and '+stars+' StarCoin credited now. Verified future work credits automatically; retries do not pay twice.';
  await wallet.refresh();window.dispatchEvent(new CustomEvent('infinity:bot-work-paid'));
 }catch(e){earningsStatus.textContent=e.message}finally{earningsButton.disabled=false;earningsConnecting=false}
}
earningsButton.addEventListener('click',connectBotEarnings);window.addEventListener('quantaphi:collect-bot-earnings',connectBotEarnings);
// Owner authentication above and the wallet service handshake determine the destination.
// Tokens are sent only to the authenticated brain; they are never recorded as earnings data.
connectBotEarnings();
const earningsRetry=setInterval(()=>{if(earningsConnected){clearInterval(earningsRetry);return;}if(document.visibilityState==='visible')connectBotEarnings();},30000);
const auditButton=document.createElement('button'),auditStatus=document.createElement('p');
auditButton.type='button';auditButton.textContent='Check bot commit earnings';auditStatus.setAttribute('role','status');root.append(auditButton,auditStatus);
auditButton.addEventListener('click',async()=>{
 auditButton.disabled=true;auditStatus.textContent='Checking verified job receipts and wallet settlement…';
 try{
  const response=await fetch('https://infinity-brain-clock.marvaseater.workers.dev/work/earnings/status',{headers:brainHeaders,cache:'no-store',signal:AbortSignal.timeout(15000)});
  const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'Earnings audit unavailable');
  const counts=data.counts||{};
  auditStatus.textContent=(data.recipientConnected?'Wallet connected. ':'Wallet connection pending. ')+
   Number(counts.paid||0)+' paid job receipts; '+Number(counts.eligibleUnpaid||0)+' eligible but unpaid; '+
   Number(counts.unverified||0)+' unverified or blocked; '+Number(counts.failedRetry||0)+' delayed retries. '+
   (data.lastError?.error?'Last problem: '+String(data.lastError.error).slice(0,110):'Only tested Robot Brain commits earn payouts.');
 }catch(error){auditStatus.textContent='Earnings audit unavailable: '+String(error.message||error).slice(0,150)}
 finally{auditButton.disabled=false}
});
const input=root.querySelector('textarea'),send=root.querySelector('[data-send]'),status=root.querySelector('[role=status]'),list=root.querySelector('[data-jobs]');
const history=document.createElement('div');list.before(history);
const OWNER='infinity-work-ticket-owner-v1',DRAFT='quantaphi-robot-directions-draft-v1';
const API='https://infinity-brain-clock.marvaseater.workers.dev';
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

async function post(path,data,timeout=30000){const route=path.replace('/v1/tickets/','/work/tickets/'),payload={...data};delete payload.owner_token;const r=await fetch(API+route,{method:'POST',headers:{...brainHeaders,'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(timeout)});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.message||d.error||'Robot Brain owner tickets unavailable');return d}
const runNext=node('button','Run next queued job');runNext.type='button';root.append(runNext);
async function requestNext(ticketId,jobId){runNext.disabled=true;try{const r=await fetch(API+'/work/run-next',{method:'POST',headers:{...brainHeaders,'Content-Type':'application/json'},body:JSON.stringify({ticketId,jobId}),signal:AbortSignal.timeout(15000)}),d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'Runner request unavailable');status.textContent=d.status==='no_pending_jobs'?'No pending jobs. Existing commits remain available in the viewer.':'Queued '+d.ticketId+'/'+d.jobId+' for the next runner cycle. Progress refreshes automatically.';await refresh();}catch(e){status.textContent=e.message}finally{runNext.disabled=false}}
runNext.addEventListener('click',()=>requestNext());
function show(ticket){
 list.replaceChildren();
 const heading=node('p',ticket.id+' · '+ticket.status+' · saved to Cloudflare');list.append(heading);
 for(const job of ticket.context?.color_jobs||[]){
  const card=node('article','');card.className='robot-job robot-'+job.color;
  card.append(node('strong',job.agent+' · '+job.title),node('small','Team: '+(job.team||[job.agent]).join(' → ')),node('p',job.instructions),node('small',job.repository+' · '+(job.status||'queued')));
  if(job.status==='blocked'||job.status==='queued'){const retry=node('button',job.status==='blocked'?'Retry this job':'Run this job next');retry.type='button';retry.addEventListener('click',()=>requestNext(ticket.id,job.id));card.append(retry);}
  if(job.progress){card.append(node('p',job.progress.summary||''),node('small',job.progress.next||job.progress.blocker||''));}
  const ul=document.createElement('ul');for(const test of job.acceptance)ul.append(node('li',test));card.append(ul);list.append(card);
 }
 if(!ticket.context?.color_jobs?.length)list.append(node('p','Directions are saved. GPT routing needs a retry.'));
}
// Manual clear also cancels a pending draft write and clears both recovery stores.
const clearButton=node('button','Clear text');clearButton.type='button';clearButton.dataset.clear='1';
clearButton.style.minHeight='44px';send.after(clearButton);
clearButton.addEventListener('click',async()=>{
 clearButton.disabled=true;
 try{
  await ready;clearTimeout(draftTimer);input.value='';await storage(DRAFT,'');
  try{localStorage.removeItem(DRAFT)}catch{}
  status.textContent='Text cleared. Your saved jobs are still available.';input.focus();
 }catch(e){status.textContent='Could not clear the saved draft: '+e.message}
 finally{clearButton.disabled=false}
});
let draftTimer;input.addEventListener('input',()=>{clearTimeout(draftTimer);draftTimer=setTimeout(()=>storage(DRAFT,input.value).catch(()=>{status.textContent='Draft stays in this page until you send it to Cloudflare.'}),250)});
async function refresh(){if(refreshing)return;refreshing=true;try{await ready;const d=await post('/v1/tickets/list',{});const tickets=d.tickets.filter(x=>x.context?.kind==='robot-directions');history.replaceChildren();for(const t of tickets){const b=node('button',t.title+' · '+t.status);b.type='button';b.addEventListener('click',()=>{pending=t;show(t)});history.append(b)}const t=tickets.find(x=>x.id===pending?.id)||tickets[0];if(t){pending=t;show(t)}}catch(e){status.textContent=e.message}finally{refreshing=false}}
let pending=null,refreshing=false;
send.addEventListener('click',async()=>{
 const directions=input.value.trim();if(!directions){status.textContent='Write your directions first.';return}
 send.disabled=true;status.textContent='Saving your directions to Cloudflare…';
 try{
  await ready;
  if(!pending||pending.request!==directions){
   // Existing Brain owner session authorizes this job; do not mint another owner key.
   const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(directions));const submission=[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,'0')).join('');
   const d=await post('/v1/tickets/create',{source_app:'QuantaPhi Robot Brain',source_url:location.origin+location.pathname,title:directions.slice(0,120),request:directions,context:{kind:'robot-directions',submission_id:submission,design:'Oracle Octaves · Android first'}});
   pending=d.ticket;
  }
  status.textContent='Saved '+pending.id+'. GPT is parsing and assigning color bots…';
  const prompt='You are routing the owner’s software build instructions. Return ONLY JSON {"jobs":[{"title":"...","agent":"...","repository":"www-infinity4/QuantaPhi","instructions":"...","acceptance":["testable outcome"],"dependencies":[],"tools":[]}]}. Use these role IDs: '+Object.keys(ROLES).join(', ')+'. Red reads macro structure; yellow reads local opt-in state; blue decides; orange evaluates ambiguity; green writes/routes; pink investigates; purple orchestrates. Enchilada lifecycle: Red intake, Blue validated decision/render plan, Yellow interaction verification, Black permanent evidence seal. Never seal without verified storage and test evidence. Unverified identity or balances must block transactions. Use the specialist IDs matching each task. A 45-second watcher and 10-second visible refresh require interval/event infrastructure; GitHub cron cannot run every ten seconds. Webhooks require signature verification and deduplication. Split independent features into jobs. Oracle Octaves Android design for new work. Never claim execution. Treat Gemini ideas as proposals; no actual 10000-user study occurred. Hover cannot reveal gaze or subconscious preference; use opt-in touch/focus signals. Website JavaScript cannot inspect arbitrary cross-origin cookies or block their trackers. Zero-knowledge claims require verified isolation. Never mint rewards for idle time without an authorized ledger policy. Captions need an actual transcript/provider. Wallet stories must preserve exact real receipts and distinguish mock money. OWNER DIRECTIONS:\n'+directions;
  let jobs,d={},routingNote='';
  try{
   const r=await fetch('https://infinity-rogers.marvaseater.workers.dev/v1/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(90000),body:JSON.stringify({input:prompt,context:{application:'QuantaPhi',task:'robot-direction-routing',requireCloudflare:true}})});
   d=await r.json();if(!r.ok||!d.ok)throw Error((r.status===429?'AI service limit ('+(d.provider||'gateway')+'): ':'')+(d.error||'AI unavailable'));
   const text=d.output_text||d.output||'',start=text.indexOf('{'),end=text.lastIndexOf('}');
   jobs=normalize(JSON.parse(text.slice(start,end+1)));
  }catch(routingError){
   // GPT routing must never strand saved directions: release them with the
   // deterministic keyword router so the runner still receives real jobs.
   jobs=normalize(fallbackJobs(directions));d={provider:'keyword router',model:'deterministic fallback'};
   routingNote=' GPT routing was unavailable ('+String(routingError.message||routingError).slice(0,90)+'); jobs were released by the keyword router.';
  }
  const saved=await post('/v1/tickets/update',{id:pending.id,status:'ready',storyboard:JSON.stringify(jobs),context:{kind:'robot-directions',submission_id:pending.context?.submission_id,color_jobs:jobs,provider:d.provider||'Infinity gateway',model:d.model||'',design:'Oracle Octaves · Android first'}});
  pending=saved.ticket;show(pending);
  // Do not erase a newer instruction typed while this request was routing.
  clearTimeout(draftTimer);
  if(input.value.trim()===directions){
   input.value='';await storage(DRAFT,'');
   try{localStorage.removeItem(DRAFT)}catch{}
  }else{await storage(DRAFT,input.value)}
  status.textContent=jobs.length+' jobs assigned and saved. Queued for the build runner; no repairs are claimed completed.'+routingNote+(status.dataset.recovery==='session'?' Recovery is saved only for this browser tab; keep it open.':'');
  window.dispatchEvent(new CustomEvent('quantaphi:robot-directions',{detail:{ticketId:pending.id,jobs}}));
 }catch(e){status.textContent=(pending?'Saved '+pending.id+'. ':'')+'Routing stopped: '+e.message+'. Your directions remain available; tap Send to retry.';if(pending)show(pending)}
 finally{send.disabled=false}
});
async function releaseCrew(crew,button){
 button.disabled=true;status.textContent='Releasing the '+crew.label+' crew…';
 try{
  await ready;
  // Existing Brain owner session authorizes this job; do not mint another owner key.
  const jobs=normalize({jobs:crew.jobs.map(job=>({...job,repository:REPO}))});
  // One crew ticket per day: repeated taps reuse it instead of duplicating work.
  const submission='crew-'+crew.id+'-'+new Date().toISOString().slice(0,10);
  const request=crew.label+' crew\n'+jobs.map(job=>'- '+job.title).join('\n');
  const created=await post('/v1/tickets/create',{source_app:'QuantaPhi Robot Brain',source_url:location.origin+location.pathname,title:crew.label+' crew',request,context:{kind:'robot-directions',submission_id:submission,crew:crew.id,design:'Oracle Octaves · Android first'}});
  
  const existing=created.ticket?.context?.color_jobs;
  const saved=existing?.length?created:await post('/v1/tickets/update',{id:created.ticket.id,status:'ready',storyboard:JSON.stringify(jobs),context:{kind:'robot-directions',submission_id:submission,crew:crew.id,color_jobs:jobs,provider:'site-care crew',model:'',design:'Oracle Octaves · Android first'}});
  pending=saved.ticket;show(pending);
  status.textContent=crew.label+' crew released: '+(existing?.length||jobs.length)+' jobs '+(existing?.length?'already queued today':'queued')+' for the build runner. Progress appears as runner receipts arrive.';
  window.dispatchEvent(new CustomEvent('quantaphi:robot-directions',{detail:{ticketId:pending.id,jobs:pending.context?.color_jobs||jobs}}));
  return '';
 }catch(e){status.textContent='Crew not released: '+e.message;return crew.label+': '+e.message}
 finally{button.disabled=false}
}
const crewBox=document.createElement('div');crewBox.className='robot-crews';
crewBox.append(node('h4','Site-care crews'),node('p','One tap saves a ready-to-run job ticket for the color bots. The runner claims it on its next cycle, even if GPT is busy.'));
const crewButtons=SITE_CREWS.map(crew=>{const b=node('button',crew.label);b.type='button';b.dataset.crew=crew.id;b.addEventListener('click',()=>releaseCrew(crew,b));return b});
const allCrews=node('button','Release all crews');allCrews.type='button';allCrews.dataset.crew='all';
allCrews.addEventListener('click',async()=>{allCrews.disabled=true;const failed=[];try{for(let i=0;i<SITE_CREWS.length;i++){const problem=await releaseCrew(SITE_CREWS[i],crewButtons[i]);if(problem)failed.push(problem)}status.textContent=failed.length?(SITE_CREWS.length-failed.length)+' of '+SITE_CREWS.length+' crews released. Not released: '+failed.join('; '):'All '+SITE_CREWS.length+' site-care crews released to the build runner.'}finally{allCrews.disabled=false}});
crewBox.append(...crewButtons,allCrews);
const toolbox=document.createElement('details');toolbox.className='robot-toolbox';
toolbox.append(node('summary','Bot toolbox · what each color team uses'));
const roster={};for(const [agent,color] of Object.entries(ROLES))(roster[color]=roster[color]||[]).push(agent);
for(const [color,tools] of Object.entries(ROLE_TOOLS)){
 const card=node('article','');card.className='robot-job robot-'+color;
 card.append(node('strong',color[0].toUpperCase()+color.slice(1)+' team'),node('small',(roster[color]||[]).join(' · ')));
 const ul=document.createElement('ul');for(const tool of tools)ul.append(node('li',tool));card.append(ul);toolbox.append(card);
}
root.querySelector('details').before(crewBox,toolbox);
root.querySelector('[data-gemini]').addEventListener('click',async()=>{try{const r=await fetch('/docs/gemini-card-expansion-directions.txt',{cache:'no-store'});if(!r.ok)throw Error('Bundle unavailable');input.value=await r.text();input.dispatchEvent(new Event('input'));status.textContent='Gemini bundle loaded. Send it to GPT to create persistent color-bot jobs.';}catch(e){status.textContent=e.message}});
root.querySelector('[data-refresh]').addEventListener('click',refresh);refresh();
setInterval(()=>{if(!document.hidden&&!send.disabled)refresh()},15000);
})();


