/* QuantaPhi · Oracle Moltnook iteration card
 * An evidence-linked display, NOT an invented continuous agent dialogue.
 * Learns task categories on this device; no raw search text uploaded or saved. */
(async function () {
 'use strict';
 const root=document.getElementById('quantaAgentIterations');
 if(!root || root.dataset.bound==='1')return;

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
 root.dataset.bound='1';
 const $=selector=>root.querySelector(selector);
 const ui=(tag,cl,text)=>{const el=document.createElement(tag);if(cl)el.className=cl;if(text!==undefined)el.textContent=String(text);return el;};
 const ROLES={
  'gold-diggers-ink':['Gold Digger’s Ink','yellow'],
  'naked-gold-digger':['Naked Gold Digger','yellow'],
  'bluey':['Bluey','blue'],'blueberry':['Blueberry','blue'],'bluth':['Bluth','blue'],
  'orange-julius':['Orange Julius','orange'],'orange-peel':['Orange Peel','orange'],
  'greenbeans':['Greenbeans','green'],'pink-panther':['Pink Panther','pink'],
  'purple-pearl':['Purple Pearl','purple'],'purple-pleasure':['Purple Pleasure','purple'],
  'purple-people-eater':['Purple People Eater','purple'],'gpt-purple':['GPT Purple','purple']
 };
 const PROFILES={
  chemistry:{label:'Elements and chemistry',agent:'blueberry',skill:'Element fact validator',detail:'Validate atomic symbols, numbers, sources and images before an element card is published.',tokens:/\b(atomic|element|periodic|chemistr|molecul|argon|ruthenium|hydrogen|samarium|sulfur|electron|rubidium|catalyst|oxid)\w*\b/i},
  physics:{label:'Physics and theory',agent:'orange-julius',skill:'Physics mechanism worksheet',detail:'Separate hypotheses from physical observations, equations, and testable predictions.',tokens:/\b(physics|quantum|energy|portal|time travel|magnet|wave|gravity|frequency|resonance)\w*\b/i},
  stories:{label:'Stories and writing',agent:'gold-diggers-ink',skill:'Story and source composer',detail:'Convert researched facts into original writing while keeping fiction distinct from sourced claims.',tokens:/\b(story|stories|fantasy|fiction|ghost|mystery|horror|adventur|read|realm|book|poem)\w*\b/i},
  markets:{label:'Bitcoin and markets',agent:'naked-gold-digger',skill:'Research source comparator',detail:'Compare public market sources, dates, definitions, and conflicting claims without trading.',tokens:/\b(bitcoin|crypto|stock|market|trading|investment|coin|crusher|price)\w*\b/i},
  visuals:{label:'Images and design',agent:'purple-pearl',skill:'Image text proofreader',detail:'Check image captions, original source material, repeated lettering and mobile layout.',tokens:/\b(image|picture|photo|illustrat|graphic|visual|design|render|poster)\w*\b/i},
  audio:{label:'Music and media',agent:'pink-panther',skill:'Media playback verifier',detail:'Verify playable sources, progress, playlists and no-repeat audio episodes.',tokens:/\b(audio|music|piano|radio|video|movie|film|episode|space|playback|sound)\w*\b/i},
  wallet:{label:'Wallets and rewards',agent:'blueberry',skill:'StarCoin receipt auditor',detail:'Compare authenticated ledger receipts, masked account identity and duplicate-proof payouts.',tokens:/\b(wallet|starcoin|star coin|quants?|ledger|token|reward|payout|collect|share|mint)\w*\b/i},
  builder:{label:'Websites and code',agent:'greenbeans',skill:'Build-and-preview repair runner',detail:'Check actual repositories, failing CI, interface build iterations and published page results.',tokens:/\b(code|build|website|widget|program|worker|cloudflare|github|api|deploy|agent|script)\w*\b/i}
 };
 const WORKFLOWS={
   'stories>visuals':{label:'Write a story → generate its illustration',agent:'greenbeans',skill:'One-click illustrated Story Writer',detail:'Connect the final story scene, image prompt, artwork, and saved card without entering the topic twice.'},
   'chemistry>visuals':{label:'Research an element → illustrate it',agent:'blueberry',skill:'Chemistry image research studio',detail:'Carry verified element identity, accurate molecular or crystal data, and source context into image creation.'},
   'markets>builder':{label:'Research a market → build a page',agent:'naked-gold-digger',skill:'Research-to-website evidence composer',detail:'Transfer named source comparisons into builder cards with links, dates and citations.'},
   'builder>wallet':{label:'Build a site → check wallet credit',agent:'pink-panther',skill:'End-to-end build reward verifier',detail:'Trace site construction, search tokens and StarCoin reward references through authoritative ledgers.'}
 };
 const STORE='quantaphi:agent-learning-local:v1';
 const read=()=>{try{const x=JSON.parse(localStorage.getItem(STORE)||'{}');return x&&typeof x==='object'?x:{}}catch{return {}}};
 let local=read();
 const defaultData=()=>({enabled:true,counts:{},lastSeen:{},flows:{},lastCategory:'',lastCategoryAt:0,total:0});
 if(!local||typeof local.enabled!=='boolean')local=defaultData();
 const save=()=>{try{localStorage.setItem(STORE,JSON.stringify(local))}catch{}};
 const safeUrl=value=>{try{const url=new URL(value);return url.protocol==='https:'&&['github.com','quantaphi.org','infinity-brain-clock.marvaseater.workers.dev'].includes(url.hostname)?url.href:''}catch{return ''}};
 const role=id=>ROLES[id]||[id||'Observer','blue'];
 const deltaTime=when=>{const age=Date.now()-Date.parse(when||'');if(!Number.isFinite(age))return 'time unknown';if(age<60000)return 'just now';if(age<3600000)return Math.floor(age/60000)+'m ago';if(age<86400000)return Math.floor(age/3600000)+'h ago';return new Date(when).toLocaleDateString()};
 const makeLink=(label,url)=>{const anchor=ui('a','',label);anchor.href=safeUrl(url)||'https://quantaphi.org/moltnook/';anchor.target='_blank';anchor.rel='noopener noreferrer';return anchor;};
 const source='https://quantaphi.org/moltnook/';
 const BASE=(/^(?:www\.)?quantaphi\.org$/i.test(location.hostname)?'/moltnook/':
    'https://raw.githubusercontent.com/www-infinity4/Moltnook/main/');
 const profileData=() => Object.entries(local.counts||{}).filter(([key,count])=>PROFILES[key]&&Number(count)>0)
     .sort((a,b)=>b[1]-a[1]).slice(0,4);
 let data=null,events=[],loading=false;
 // Owner-only work evidence stays separate from the conversation stream.
 let previewRows=[],previewSelected='',previewBusy=false,previewLoaded='',previewLocked=false;
 const previewBox=ui('section','qai-work-preview');previewBox.setAttribute('aria-label','Bot work before and after');
 const previewHeading=ui('h3','','See what the bot changed');
 const previewSelect=ui('select','');previewSelect.setAttribute('aria-label','Choose a recorded bot repair');
 const engineStatus=ui('p','','Cross-repository executor: checking actual runner connections.');
 const previewStatus=ui('p','','Waiting for a real bot commit with before-and-after evidence.');previewStatus.setAttribute('role','status');
 const previewLinks=ui('div','qai-preview-links'),previewPortals=ui('div','qai-preview-portals');
 const previewImages={},previewScrolls={};let focus=null;
 function autoFocus(){if(!focus)return;for(const side of ['before','after']){const img=previewImages[side],box=previewScrolls[side];if(!img.naturalWidth||!box.clientWidth)return;const scale=Math.min(3,Math.max(1,1/Math.max(.34,focus.width)));img.style.width=(scale*100)+'%';img.style.maxWidth='none';zoom.value=String(Math.round(scale*100));box.scrollLeft=Math.max(0,(focus.x+focus.width/2)*img.clientWidth-box.clientWidth/2);box.scrollTop=Math.max(0,(focus.y+focus.height/2)*(focus.imageHeight||img.naturalHeight)*img.clientWidth/(focus.imageWidth||img.naturalWidth)-box.clientHeight/2);}}
 for(const side of ['before','after']){
  const portal=ui('figure','qai-preview-portal'),label=ui('figcaption','',side==='before'?'Before · original source':'After · bot source');
  const scroll=ui('div','qai-preview-scroll'),image=ui('img','');image.alt=side+' repair source preview';image.hidden=true;
  scroll.append(image);portal.append(label,scroll);previewPortals.append(portal);previewImages[side]=image;previewScrolls[side]=scroll;
  scroll.addEventListener('scroll',()=>{if(previewLocked)return;previewLocked=true;const other=previewScrolls[side==='before'?'after':'before'];other.scrollTop=scroll.scrollTop;other.scrollLeft=scroll.scrollLeft;requestAnimationFrame(()=>{previewLocked=false})});
 }
 const zoomLabel=ui('label','','Zoom both views '),zoom=ui('input','');zoom.type='range';zoom.min='100';zoom.max='300';zoom.value='100';zoom.setAttribute('aria-label','Zoom both page views');
 zoom.addEventListener('input',()=>Object.values(previewImages).forEach(img=>{img.style.width=zoom.value+'%';img.style.maxWidth='none'}));zoomLabel.append(zoom);
 const expand=ui('button','','Expand both views');expand.type='button';
 expand.addEventListener('click',()=>{const expanded=previewBox.classList.toggle('qai-preview-expanded');expand.textContent=expanded?'Close expanded views':'Expand both views';expand.setAttribute('aria-expanded',String(expanded))});
 const previous=ui('button','','Previous improvement'),next=ui('button','','Next improvement'),fit=ui('button','','Focus on change'),collect=ui('button','','Collect verified earnings');for(const b of [previous,next,fit,collect])b.type='button';
 previous.addEventListener('click',()=>{const i=previewRows.findIndex(x=>x.commitSha===previewSelected);if(i+1<previewRows.length)selectPreview(previewRows[i+1].commitSha)});
 next.addEventListener('click',()=>{const i=previewRows.findIndex(x=>x.commitSha===previewSelected);if(i>0)selectPreview(previewRows[i-1].commitSha)});fit.addEventListener('click',autoFocus);
 collect.addEventListener('click',()=>{window.dispatchEvent(new CustomEvent('quantaphi:collect-bot-earnings'));previewStatus.textContent='Checking verified work receipts. 1 Quant per qualifying repair or 1 StarCoin per qualifying page build; viewing never pays twice.'});
 const archive=ui('button','','Saved visual evidence'),archiveList=ui('div','qai-evidence-files');archive.type='button';archiveList.hidden=true;let cursor=null;
 async function showArchive(more=false){archive.disabled=true;try{const r=await fetch('https://infinity-brain-clock.marvaseater.workers.dev/work/evidence/list'+(more&&cursor?'?cursor='+encodeURIComponent(cursor):''),{headers:brainHeaders,cache:'no-store',signal:AbortSignal.timeout(15000)});const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'Evidence folder unavailable');if(!more)archiveList.replaceChildren();archiveList.hidden=false;cursor=d.cursor;for(const file of d.objects.filter(x=>/\.(png|jpe?g)$/.test(x.key))){const b=ui('button','',file.key);b.type='button';b.addEventListener('click',async()=>{try{const response=await fetch('https://infinity-brain-clock.marvaseater.workers.dev/work/evidence?key='+encodeURIComponent(file.key),{headers:brainHeaders,signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Saved capture unavailable');const blob=await response.blob(),url=URL.createObjectURL(blob),image=ui('img','');image.src=url;image.alt=file.key;image.style.maxWidth='100%';const old=archiveList.querySelector('img');if(old){URL.revokeObjectURL(old.src);old.remove()}archiveList.prepend(image);}catch(e){previewStatus.textContent=e.message}});archiveList.append(b)}if(cursor){const moreButton=ui('button','','More saved captures');moreButton.type='button';moreButton.addEventListener('click',()=>{moreButton.remove();showArchive(true)});archiveList.append(moreButton)}if(!d.objects.length)archiveList.append(ui('p','','No captures have been archived yet.'));}catch(e){previewStatus.textContent=e.message}finally{archive.disabled=false}}
 archive.addEventListener('click',()=>showArchive());const nav=ui('div','qai-preview-links');nav.append(previous,next,fit,collect,archive);previewBox.append(archiveList);
 previewBox.append(nav,previewHeading,engineStatus,previewSelect,previewStatus,previewLinks,zoomLabel,expand,previewPortals,ui('small','','Pinned source previews use disconnected service fixtures. Live verification is shown separately; images alone do not prove a repair works.'));
 $('.qai-brain').append(previewBox);
 async function selectPreview(sha){
  if(!/^[a-f0-9]{40}$/.test(sha||''))return;
  previewSelected=sha;previewSelect.value=sha;const selectedIndex=previewRows.findIndex(x=>x.commitSha===sha);next.disabled=selectedIndex<=0;previous.disabled=selectedIndex>=previewRows.length-1;if(previewLoaded===sha){autoFocus();return;}
  previewStatus.textContent='Loading exact before-and-after source views…';
  try{
   const response=await fetch('https://infinity-brain-clock.marvaseater.workers.dev/work/preview?sha='+sha,{headers:brainHeaders,cache:'no-store',signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw Error('Preview HTTP '+response.status);const {preview:p}=await response.json();
   if(previewSelected!==sha)return;
   if(p?.commitSha!==sha||!p.baseSha||!['before','after'].every(side=>typeof p[side]==='string'&&p[side].length<=60000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(p[side])))throw Error('Preview evidence is invalid');
   focus=p.focus||null;fit.disabled=!focus;for(const side of ['before','after']){previewImages[side].onload=autoFocus;previewImages[side].style.width='100%';previewImages[side].src=p[side];previewImages[side].hidden=false;previewScrolls[side].scrollTop=0;}
   previewLoaded=sha;requestAnimationFrame(autoFocus);
   previewStatus.textContent=(p.status==='deployed_verified'?'Live repair verified':'Source preview · live behavior not verified')+' · '+p.summary+(focus?' · Both views focused on measured visual changes.':' · No measured visual difference; full views shown.')+(p.archive?' · Visual evidence saved in Cloudflare.':' · Older evidence awaiting archive.');
   previewLinks.replaceChildren(makeLink('Before '+p.baseSha.slice(0,8),'https://github.com/'+p.repository+'/tree/'+p.baseSha),makeLink('After '+sha.slice(0,8),'https://github.com/'+p.repository+'/commit/'+sha),makeLink('Changed files','https://github.com/'+p.repository+'/compare/'+p.baseSha+'...'+sha));
   if(p.runUrl)previewLinks.append(makeLink('Runner / tests',p.runUrl));
  }catch(e){if(previewSelected===sha)previewStatus.textContent='Preview unavailable: '+e.message;}
 }
 previewSelect.addEventListener('change',()=>selectPreview(previewSelect.value));
 async function pullPreviews(){
  if(previewBusy||document.hidden)return;previewBusy=true;
  try{
   const response=await fetch('https://infinity-brain-clock.marvaseater.workers.dev/activity/feed.json',{headers:brainHeaders,cache:'no-store',signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw Error('Evidence service HTTP '+response.status);const payload=await response.json();
   if(payload.engine)engineStatus.textContent='Repository engine · '+payload.engine.status.replaceAll('_',' ')+' · '+(payload.engine.repositoriesVisible??'unknown')+' repositories visible · checked '+deltaTime(payload.engine.when);
   const rows=(payload.previews||[]).filter(p=>/^www-infinity4\/[\w.-]+$/.test(p.repository||'')&&/^[a-f0-9]{40}$/.test(p.commitSha||''));
   const oldNewest=previewRows[0]?.commitSha;previewRows=rows;previewSelect.replaceChildren();
   if(!rows.length){previewSelect.append(ui('option','','No visual repair receipts yet'));return;}
   for(const row of rows){const option=ui('option','',row.repository.split('/')[1]+' · '+row.summary);option.value=row.commitSha;previewSelect.append(option);}
   // Follow new work automatically unless the owner is inspecting an older repair.
   const selected=!previewSelected?rows[rows.length-1].commitSha:previewSelected===oldNewest?rows[0].commitSha:rows.some(x=>x.commitSha===previewSelected)?previewSelected:rows[0].commitSha;
   previewSelect.value=selected;await selectPreview(selected);
  }catch(e){if(!previewLoaded)previewStatus.textContent='No visual evidence available: '+e.message;}
  finally{previewBusy=false;}
 }
 pullPreviews();setInterval(pullPreviews,30000);


 // Display each source-backed event at most once, and only after this visit began.
 const {NotificationDeck}=await import('/brain-notifications.mjs?v=20261016-owner-notifications1');
 const notifications=new NotificationDeck();
 const notificationNav=ui('div','qai-notification-nav');
 const previousNotification=ui('button','','←'),nextNotification=ui('button','','→'),notificationCount=ui('span','','No notifications');
 previousNotification.type=nextNotification.type='button';
 previousNotification.setAttribute('aria-label','Previous notification');nextNotification.setAttribute('aria-label','Next notification');
 for(const button of [previousNotification,nextNotification]){button.style.minHeight='44px';button.style.minWidth='44px';}
 notificationNav.style.cssText='display:flex;align-items:center;justify-content:space-between;gap:12px';
 notificationNav.append(previousNotification,notificationCount,nextNotification);$('#qai-brain-status').before(notificationNav);
 previousNotification.addEventListener('click',()=>{notifications.move(-1);renderBrainNotification()});
 nextNotification.addEventListener('click',()=>{notifications.move(1);renderBrainNotification()});
 function verifiedCommit(item){
   const url=safeUrl(item?.url);
   if(!url||item?.kind!=='commit'||!item?.title||!item?.when)return null;
   if(/refresh verified moltnook agent activity|automatic evidence feed \[skip ci\]/i.test(item.title))return null;
   const sha=(String(item.id||'').match(/[a-f0-9]{40}/i)||[''])[0].slice(0,9);
   return {
     id:'source:'+String(item.id),agent:item.agent||'greenbeans',to:item.to||'pink-panther',
     kind:'commit',phase:'Source commit',project:String(item.project||'Infinity'),
     when:item.when,url,
     message:'A commit was recorded in '+item.project+': “'+String(item.title).slice(0,160)+'”.'+
       (sha?' Commit '+sha+'.':'')+' This is verified source activity, not a claim that the whole job is finished.'
   };
 }
 function assembleBrain(feedItems){
   const clockEvents=(Array.isArray(feedItems)?feedItems:[]).filter(x=>x.clockReceipt===true&&safeUrl(x.url)&&typeof x.message==='string').sort((a,b)=>Date.parse(b.when)-Date.parse(a.when)).slice(0,35);
   const commits=(Array.isArray(feedItems)?feedItems:[])
     .map(verifiedCommit).filter(Boolean).slice(0,35);
   const notes=events.filter(x=>safeUrl(x.url)&&
     /read|test|repository maintenance|inspection|routing|report|commit/i.test(x.kind||''))
     .filter(x=>!/human update:.*?authenticated, scoped writer/i.test(x.message||''))
     .slice(0,42);
   const combined=clockEvents.slice(),keys=new Set(clockEvents.map(x=>String(x.id))),limit=Math.max(commits.length,notes.length);
   // A commit then a verified investigation/CI receipt; no fictional "live" messages.
   for(let i=0;i<limit;i++){
     for(const event of [commits[i],notes[i]]){
       if(!event)continue;
       const key=String(event.id||event.url+'|'+event.message);
       if(keys.has(key))continue;keys.add(key);combined.push(event);
     }
   }
   return combined.slice(0,70);
 }
 function paintBrainEvent(entry,replay){
   const wrap=ui('article','qai-brain-bubble qai-brain-'+role(entry.agent)[1]);
   const top=ui('div','qai-brain-bubble-head');
   top.append(ui('strong','',role(entry.agent)[0]+' → '+role(entry.to)[0]),
     ui('span','qai-brain-when','Recorded · '+deltaTime(entry.when)));
   wrap.append(top,ui('p','',String(entry.message||'Source event recorded').slice(0,390)));
   const foot=ui('div','qai-brain-bubble-foot');
   foot.append(ui('span','',String(entry.phase||entry.kind||'observed')+' · '+String(entry.project||'Infinity')),
     makeLink('View real evidence ↗',entry.url));
   wrap.append(foot);return wrap;
 }
 function renderBrainNotification(){
   const log=$('#qai-brain-log'),status=$('#qai-brain-status'),entry=notifications.current;
   if(entry)log.replaceChildren(paintBrainEvent(entry,false));
   else log.replaceChildren(ui('p','qai-brain-empty','No recorded notifications yet. Send an order below.'));
   notificationCount.textContent=entry?(notifications.index+1)+' of '+notifications.entries.length:'No notifications';
   previousNotification.disabled=notifications.index<=0;
   nextNotification.disabled=notifications.index<0||notifications.index>=notifications.entries.length-1;
   status.textContent='One notification at a time. Use the arrows to read more; new receipts do not move your selection.';
 }
 function updateBrain(feedItems){
   notifications.add(assembleBrain(feedItems).filter(entry=>Date.parse(entry.when||'')<=Date.now()+60000));
   renderBrainNotification();
 }


 function makeEvent(entry){
  const item=ui('article','qai-event');
  const meta=ui('div','qai-event-meta');
  const [label,color]=role(entry.agent);
  meta.append(ui('strong','qai-bot qai-'+color,label+' → '+role(entry.to)[0]),ui('small','',deltaTime(entry.when)));
  item.append(meta,ui('p','',String(entry.message||'No action details').slice(0,550)));
  const bottom=ui('div','qai-event-foot');
  bottom.append(ui('span','',String(entry.phase||entry.kind||'observed')),makeLink('Evidence ↗',entry.url));
  item.append(bottom);return item;
 }
 function renderTicker(){
  const lane=$('.qai-ticker-track');lane.replaceChildren();
  const recent=events.filter(x=>safeUrl(x.url)).slice(0,12);
  if(!recent.length){lane.append(ui('span','qai-muted','No verified events available.'));return;}
  // Two copies for the visible scroll; both represent the same source event.
  for(const duplicate of [false,true]){
   for(const entry of recent){
    const item=ui('span','qai-ticker-item');
    item.append(ui('b','',role(entry.agent)[0]),ui('span','',' · '+String(entry.phase||entry.kind||'read')));
    if(duplicate)item.setAttribute('aria-hidden','true');
    lane.append(item);
   }
  }
 }
 function renderJobs(){
  const slot=$('#qai-jobs');slot.replaceChildren();
  const rows=Array.isArray(data?.jobs)?data.jobs:[];
  const listed=rows.slice().sort((a,b)=>Number(a.priority)-Number(b.priority)).slice(0,9);
  if(!listed.length){slot.append(ui('p','qai-muted','Agent jobs temporarily unavailable.'));return;}
  for(const job of listed){
    const div=ui('div','qai-job'),head=ui('div','qai-job-head');
    head.append(ui('b','','P'+job.priority+' · '+role(job.agent)[0]),ui('small','',String(job.status||'queued').replaceAll('_',' ')));
    div.append(head,ui('p','',job.title||'Unspecified job'));
    const detail=ui('small','','→ '+role(job.next)[0]+' · '+job.repo);
    div.append(detail);
    if(job.head?.url)div.append(makeLink('Inspected commit ↗',job.head.url));
    slot.append(div);
  }
 }
 function renderLearning(){
  $('#qai-watch').checked=local.enabled!==false;
  $('#qai-privacy').textContent='On this device only · '+(local.total||0)+' classified actions · no raw searches stored';
  const slot=$('#qai-skills');slot.replaceChildren();
  const trends=profileData();
  if(!trends.length){slot.append(ui('p','qai-muted',local.enabled===false?
     'Learning is off. Turn it on to detect useful skill categories.':
     'Search for topics or use Image Builder, Story Writer, and other QuantaPhi tools. Skill suggestions will appear from those actions.'));return}
  const repeatedFlows=Object.entries(local.flows||{}).filter(([key,count])=>WORKFLOWS[key]&&Number(count)>=2).sort((a,b)=>b[1]-a[1]).slice(0,2);
  for(const [flowId,n] of repeatedFlows){
    const plan=WORKFLOWS[flowId],section=ui('article','qai-skill');
    section.append(ui('strong','','Learned workflow: '+plan.label),ui('small','','Sequence detected '+n+' times · '+role(plan.agent)[0]));
    section.append(ui('p','',plan.detail));
    const title='[Agent Job] '+plan.skill+' for QuantaPhi';
    const body='Repeated task-pattern proposal.\\nWorkflow: '+plan.label+'\\nAcceptance: '+plan.detail+'\\nRead project READMEs and build a reusable integration with verified tests.';
    const anchor=ui('a','','Open combined-skill job ↗');
    anchor.href='https://github.com/www-infinity4/Oracle-Octaves/issues/new?title='+encodeURIComponent(title)+'&body='+encodeURIComponent(body);
    anchor.rel='noopener noreferrer';anchor.target='_blank';section.append(anchor);slot.append(section);
  }
  for(const [category,n] of trends){
    const info=PROFILES[category],section=ui('article','qai-skill');
    section.append(ui('strong','',info.skill),ui('small','',info.label+' · '+n+' matching actions · '+role(info.agent)[0]));
    section.append(ui('p','',info.detail));
    const title='[Agent Job] Build '+info.skill+' for QuantaPhi';
    const body='Proposed by the local QuantaPhi category watcher.\\nCategory: '+info.label+'\\nSuggested agent: '+role(info.agent)[0]+'\\nAcceptance: '+info.detail+'\\nPlease read the repository README and check existing capabilities before modifying code. The watcher does not upload my individual searches.';
    const anchor=ui('a','','Open skill job ↗');
    anchor.href='https://github.com/www-infinity4/Oracle-Octaves/issues/new?title='+encodeURIComponent(title)+'&body='+encodeURIComponent(body);
    anchor.target='_blank';anchor.rel='noopener noreferrer';
    section.append(anchor);slot.append(section);
  }
 }
 function render(){
  const count=Array.isArray(data?.jobs)?data.jobs.length:0;
  const generated=data?.generatedAt||'';
  $('#qai-jobs-count').textContent=String(count||'—');
  $('#qai-signal-count').textContent=String(events.length);
  $('#qai-updated').textContent=generated?'Checked '+deltaTime(generated):'No verified feed yet';
  $('#qai-updated').dataset.stale=String(!generated||Date.now()-Date.parse(generated)>45*60000);
  renderTicker();renderJobs();renderLearning();
  const latest=events.find(x=>safeUrl(x.url));
  $('#qai-last-event').textContent=latest?'Latest: '+role(latest.agent)[0]+' → '+role(latest.to)[0]+' · '+String(latest.message).slice(0,175):'No verified agent work is available yet.';
  const evidence=$('#qai-source');evidence.href=safeUrl(data?.runUrl)||source;
  const stream=$('#qai-events');stream.replaceChildren();
  const verified=events.filter(x=>safeUrl(x.url)).slice(0,7);
  if(!verified.length)stream.append(ui('p','qai-muted','No verified activity to display.'));
  for(const entry of verified)stream.append(makeEvent(entry));
 }
 async function pull(){
  if(loading)return;loading=true;
  $('#qai-refresh').disabled=true;
  try{
   const res=await fetch(BASE+'activity/iterations.json?fresh='+Date.now(),{cache:'no-store'});
   if(!res.ok)throw Error('HTTP '+res.status);
   const payload=await res.json();
   if(payload.schemaVersion!==2||!Array.isArray(payload.jobs)||!Array.isArray(payload.messages))throw Error('Invalid source format');
   let sourceEvents=[];
   try{
     const actual=await fetch(BASE+'activity/feed.json?fresh='+Date.now(),{cache:'no-store'});
     if(actual.ok){
       const verified=await actual.json();
       if(Array.isArray(verified.items))sourceEvents=verified.items;
     }
   }catch(_){/* Public source feed is optional; job evidence still displays. */}
   try{
    const clock=await fetch('https://infinity-brain-clock.marvaseater.workers.dev/activity/feed.json',{headers:brainHeaders,cache:'no-store',signal:AbortSignal.timeout(12000)});
    if(clock.ok){const receipts=await clock.json();if(receipts.schemaVersion===1&&Array.isArray(receipts.items))sourceEvents.push(...receipts.items.map(x=>({...x,clockReceipt:true})));}
   }catch(_){/* Clock outage does not invent activity or block other real sources. */}
   let repair=null;
   try{
    const check=await fetch(BASE+'activity/repair-report.json?fresh='+Date.now(),{cache:'no-store'});
    if(check.ok)repair=await check.json();
   }catch(_){/* Optional report never blocks the main task feed. */}
   data=payload;events=payload.messages.filter(x=>x&&typeof x.message==='string'&&safeUrl(x.url));
   if(repair?.schemaVersion===1&&repair?.runId&&Array.isArray(repair.unresolved)){
    events.push({id:'repair-'+repair.runId,agent:'greenbeans',to:'pink-panther',project:'Moltnook',
      kind:'repository maintenance',phase:'Verified repair scan',when:repair.when,
      url:'https://github.com/www-infinity4/Moltnook/actions/runs/'+encodeURIComponent(repair.runId),
      message:'Scanned '+repair.scannedHtml+' HTML pages and recorded '+repair.applied+' safe fixes, with '+repair.unresolved.length+' unresolved references. See test and commit evidence.'});
   }
   events.sort((a,b)=>Date.parse(b.when||'')-Date.parse(a.when||''));
   $('#qai-connection').textContent='Verified source feed';
   updateBrain(sourceEvents);
   render();
  }catch(error){
   $('#qai-connection').textContent='Source unavailable · previous evidence retained';
   if(!data)render();
   console.warn('QuantaPhi Moltnook feed deferred',error);
  }finally{loading=false;$('#qai-refresh').disabled=false;}
 }
 // Observe only the category of searches and tool actions, never their text.
 let lastSignal='',lastAt=0;
 function observe(input,category){
  if(!local.enabled)return;
  const raw=String(input||'').trim();
  if(category!=='tool'&&(!raw||raw.length>160||/https?:\/\/|@|\b\d{7,}\b/i.test(raw)))return;
  let selected=[];
  if(category==='tool'&&PROFILES[raw])selected=[raw];
  else selected=Object.keys(PROFILES).filter(key=>PROFILES[key].tokens.test(raw)).slice(0,2);
  if(!selected.length)return;
  const id=selected.join('|')+':'+raw.slice(0,100);
  if(id===lastSignal&&Date.now()-lastAt<3500)return;
  lastSignal=id;lastAt=Date.now();
  // Learn repeated sequences without retaining words, URLs or identities.
  const step=selected[0],pair=String(local.lastCategory||'')+'>'+step;
  if(WORKFLOWS[pair]&&Date.now()-Number(local.lastCategoryAt||0)<30*60000){
    if(!local.flows||typeof local.flows!=='object')local.flows={};
    local.flows[pair]=Math.min(9999,(Number(local.flows[pair])||0)+1);
  }
  local.lastCategory=step;local.lastCategoryAt=Date.now();
  for(const key of selected){
    local.counts[key]=Math.min(9999,Math.max(0,Number(local.counts[key])||0)+1);
    local.lastSeen[key]=Date.now();
  }
  local.total=Math.min(99999,Math.max(0,Number(local.total)||0)+1);
  save();renderLearning();
 }
 const search=document.getElementById('q'),go=document.getElementById('go');
 if(go&&search)go.addEventListener('click',()=>observe(search.value));
 if(search)search.addEventListener('keydown',event=>{if(event.key==='Enter')observe(search.value)});
 document.addEventListener('click',event=>{
  if(!(event.target instanceof Element))return;
  const target=event.target.closest('button,a');if(!target)return;
  if(target.closest('#phiStoryWriter'))observe('stories','tool');
  else if(target.closest('#phiImageBuilder'))observe('visuals','tool');
  else if(target.closest('#infiniteBook'))observe('stories','tool');
  else if(target.closest('#fredSpacesRadio,#magooSpacesRadio'))observe('audio','tool');
  else if(target.closest('#controlPhiWalletPanel,#controlPhiWalletButton'))observe('wallet','tool');
 });
 $('#qai-watch').addEventListener('change',event=>{local.enabled=event.target.checked;save();renderLearning()});
 $('#qai-reset').addEventListener('click',()=>{local=defaultData();save();renderLearning()});
 const more=$('#qai-more'),dashboard=$('#qai-dashboard');
 more.addEventListener('click',()=>{
   const opening=dashboard.hidden;
   dashboard.hidden=!opening;
   more.setAttribute('aria-expanded',String(opening));
   more.replaceChildren(document.createTextNode(opening?'Hide jobs, tools and learning ':'View jobs, tools and learning '),
     ui('span','','▾'));
 });
 $('#qai-refresh').addEventListener('click',pull);
 render();pull();

 setInterval(()=>{if(!document.hidden)pull()},10000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)pull()});
})();
