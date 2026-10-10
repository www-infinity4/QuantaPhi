/* QuantaPhi · Oracle Moltnook iteration card
 * An evidence-linked display, NOT an invented continuous agent dialogue.
 * Learns task categories on this device; no raw search text uploaded or saved. */
(function () {
 'use strict';
 const root=document.getElementById('quantaAgentIterations');
 if(!root || root.dataset.bound==='1')return;
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
  'purple-people-eater':['Purple People Eater','purple']
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
 const STORE='quantaphi:agent-learning-local:v1';
 const read=()=>{try{const x=JSON.parse(localStorage.getItem(STORE)||'{}');return x&&typeof x==='object'?x:{}}catch{return {}}};
 let local=read();
 const defaultData=()=>({enabled:true,counts:{},lastSeen:{},total:0});
 if(!local||typeof local.enabled!=='boolean')local=defaultData();
 const save=()=>{try{localStorage.setItem(STORE,JSON.stringify(local))}catch{}};
 const safeUrl=value=>{try{const url=new URL(value);return url.protocol==='https:'&&url.hostname==='github.com'?url.href:''}catch{return ''}};
 const role=id=>ROLES[id]||[id||'Observer','blue'];
 const deltaTime=when=>{const age=Date.now()-Date.parse(when||'');if(!Number.isFinite(age))return 'time unknown';if(age<60000)return 'just now';if(age<3600000)return Math.floor(age/60000)+'m ago';if(age<86400000)return Math.floor(age/3600000)+'h ago';return new Date(when).toLocaleDateString()};
 const makeLink=(label,url)=>{const anchor=ui('a','',label);anchor.href=safeUrl(url)||'https://quantaphi.org/moltnook/';anchor.target='_blank';anchor.rel='noopener noreferrer';return anchor;};
 const source='https://quantaphi.org/moltnook/';
 const BASE=(/^(?:www\.)?quantaphi\.org$/i.test(location.hostname)?'/moltnook/':
    'https://raw.githubusercontent.com/www-infinity4/Moltnook/main/');
 const profileData=() => Object.entries(local.counts||{}).filter(([key,count])=>PROFILES[key]&&Number(count)>0)
     .sort((a,b)=>b[1]-a[1]).slice(0,4);
 let data=null,events=[],loading=false;
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
 $('#qai-refresh').addEventListener('click',pull);
 render();pull();
 setInterval(()=>{if(!document.hidden)pull()},45000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)pull()});
})();
