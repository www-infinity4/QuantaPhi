/* QuantaPhi Oracle Scholastic Reader + interactive Data Extraction.
   Research actions enrich the current Quant without minting or charging StarCoins. */
(function(window,document){
'use strict';
const API='https://infinity-rogers.marvaseater.workers.dev/v1/chat';
const SEARCH='https://orange-brook-a2ac.marvaseater.workers.dev/search';
let active=null;
const clean=x=>String(x==null?'':x).replace(/\s+/g,' ').trim();
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el};
const urlOK=u=>{try{const x=new URL(u);return x.protocol==='https:'?x.href:''}catch{return''}};
const safeText=x=>clean(x).slice(0,170);
function status(message){
 if(!active)return;
 const el=active.yellow.querySelector('.qdata-status');
 if(el)el.textContent=message;
}
function selected(){return active?[...active.selected]:[]}
function sync(){
 if(!active)return;
 const values=selected(),n=values.length;
 active.yellow.querySelectorAll('.qdata-select').forEach(btn=>{
  const yes=active.selected.has(btn.dataset.value);
  btn.setAttribute('aria-pressed',String(yes));btn.classList.toggle('is-selected',yes);
 });
 const count=active.yellow.querySelector('.qdata-count');
 if(count)count.textContent=n+' selected · choose up to 8';
 const bar=active.yellow.querySelector('.qdata-actions');
 if(bar){
  bar.querySelector('[data-work="extract"]').disabled=n===0;
  bar.querySelector('[data-work="compare"]').disabled=n<2;
  bar.querySelector('[data-work="build"]').disabled=n===0;
  bar.querySelector('[data-work="clear"]').disabled=n===0;
 }
}
function renderLinks(){
 if(!active)return;
 const list=active.yellow.querySelector('#qYellowDataList');if(!list)return;
 // This list is replaced by category and GPT indexers; preserve selections.
 for(const li of list.querySelectorAll('li')){
  if(li.dataset.qdataReady==='yes')continue;
  const link=li.querySelector('a[href]');if(!link)continue;
  const value=safeText(link.textContent);if(!value)continue;
  const originHref=link.href;li.replaceChildren();
  const btn=make('button','qdata-select',value);
  btn.type='button';btn.dataset.value=value;btn.title='Select '+value+' for extraction, comparison, or building';
  const go=make('a','qdata-open','↗');go.href=originHref;go.title='Start a separate Quant search for '+value;go.setAttribute('aria-label','Search '+value+' as a new Quant');
  li.append(btn,go);li.dataset.qdataReady='yes';
  const needle=clean(active.yellow.querySelector('.qdata-filter')?.value||'').toLowerCase();
  li.hidden=!!needle&&!value.toLowerCase().includes(needle);
 }
 sync();
}
function hero(zone,kind){
 if(zone.querySelector('.q-oracle-hero'))return;
 const wrapper=make('div','q-oracle-hero q-oracle-'+kind);
 const image=make('img','q-oracle-avatar');
 image.src=kind==='reader'?'/assets/phi-scholastic-reader.svg':'/assets/phi-data-analyst.svg';
 image.alt=kind==='reader'?'Illustrated open encyclopedia radiating scholarly light':'Illustrated futuristic android analyst with glowing data screens';
 image.loading='lazy';image.decoding='async';
 const copy=make('div','q-oracle-heading');
 copy.append(make('span','q-oracle-eyebrow','QUANTAPHI · ORACLE RESEARCH'),
  make('strong','',kind==='reader'?'Scholastic Reader':'Data Extraction'),
  make('small','',kind==='reader'?'AI Overview · Research & reading':'Select · Extract · Compare · Build'));
 wrapper.append(image,copy);
 zone.insertBefore(wrapper,zone.firstChild);
}
function sourceNotes(items,container){
 if(!container)return;
 const details=make('details','qdata-sources');const summary=make('summary','', 'Sources consulted · '+items.length);details.append(summary);
 const ul=make('ul');
 for(const item of items.slice(0,24)){
  const li=make('li');const a=make('a','',item.title||item.url);a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';li.append(a);ul.append(li)
 }
 details.append(ul);container.append(details);
}
async function lookup(term){
 const u=new URL(SEARCH);
 u.search=new URLSearchParams({q:term,format:'json',categories:'general',safesearch:'1'});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
 try{
  const response=await fetch(u.href,{signal:controller.signal,cache:'no-store'});
  if(!response.ok)throw Error('Source search HTTP '+response.status);
  const d=await response.json();
  return (Array.isArray(d.results)?d.results:[]).slice(0,4).map(x=>({
   title:clean(x.title).slice(0,170),url:urlOK(x.url),
   excerpt:clean(x.content||x.description).slice(0,400)
  })).filter(x=>x.url&&x.title);
 }catch{return []}finally{clearTimeout(timer)}
}
function show(kind,title,body,byTerm){
 if(!active)return;
 const result=active.yellow.querySelector('.qdata-output');
 if(!result)return;
 result.replaceChildren();result.hidden=false;
 const h=make('h4','',title);result.append(h);
 const p=make('p','qdata-response',body);result.append(p);
 if(byTerm){
  for(const item of byTerm){
   const detail=make('details','qdata-evidence');const heading=make('summary','',item.term+' · '+item.sources.length+' sources');detail.append(heading);
   const list=make('ul');
   for(const src of item.sources.slice(0,3)){
    const li=make('li');const link=make('a','',src.title);link.href=src.url;link.target='_blank';link.rel='noopener noreferrer';
    li.append(link);if(src.excerpt)li.append(make('p','',src.excerpt));list.append(li);
   }
   if(!item.sources.length)detail.append(make('p','','No source results returned; no factual claim verified.'));
   else detail.append(list);
   result.append(detail);
  }
 }
 result.scrollIntoView({block:'nearest',behavior:'smooth'});
}
async function saveToCurrent(tokenId,entries,comparison){
 const ledger=window.QuantaUnifiedTokenLedger;
 if(!tokenId||!ledger?.mutate)throw Error('Active Quant storage unavailable');
 const updated=await ledger.mutate(all=>{
  const token=all.find(x=>x.id===tokenId);if(!token)return[];
  const prev=token.dataExtraction||{},stored=Array.isArray(prev.selectedEntries)?prev.selectedEntries:[];
  const byValue=new Map(stored.map(x=>[clean(x.value).toLowerCase(),x]));
  for(const e of entries||[])byValue.set(clean(e.value).toLowerCase(),e);
  const comparisons=Array.isArray(prev.comparisons)?prev.comparisons.slice(-19):[];
  if(comparison)comparisons.push(comparison);
  token.dataExtraction={...prev,selectedEntries:[...byValue.values()].slice(-100),comparisons,updatedAt:new Date().toISOString()};
  token.payload=token.payload||{};
  const findings=Array.isArray(token.payload.findings)?token.payload.findings:[];
  token.payload.findings=[...new Set([...findings,...(entries||[]).map(x=>x.value)])].slice(-110);
  token.updatedAt=new Date().toISOString();
  return[token];
 });
 if(!updated?.length)throw Error('Current Quant not found. Search first.');
 try{await window.QuantaInfinityCredit?.persistResearch?.(updated[0])}
 catch(error){console.warn('Selected research saved locally; cloud sync deferred',error)}
 return updated[0];
}
async function extract(snapshot){
 const terms=selected();if(!terms.length)return;
 status('Extracting '+terms.length+' selected data item'+(terms.length===1?'':'s')+'…');
 const byTerm=await Promise.all(terms.map(async term=>({term,sources:await lookup(term)})));
 if(active!==snapshot)return;
 const entries=byTerm.map(x=>({value:x.term,originQuery:snapshot.query,sourceQuantId:snapshot.tokenId,
  sources:x.sources.slice(0,3),status:x.sources.length?'indexed source extracts · not full-page verified':'selected term · source verification unavailable',
  extractedAt:new Date().toISOString()}));
 try{
  await saveToCurrent(snapshot.tokenId,entries,null);
  if(active!==snapshot)return;
  window.PhiAssimilation?.signal?.({kind:'data',action:'click',query:snapshot.query,title:'Extracted research',terms:terms.join(' + ')});
  show('extract','Extracted into this Quant',terms.length+' item'+(terms.length===1?'':'s')+' saved with available source references. This does not mint new Quants or StarCoins.',byTerm);
  status(terms.length+' extracted · linked to the active Quant research record');
 }catch(err){if(active===snapshot)status('Extraction could not be saved: '+clean(err.message))}
}
function explanationText(value){
 if(typeof value==='string')return value;
 if(Array.isArray(value))return value.map(x=>typeof x==='string'?x:clean(x.text||x.content)).join('\n');
 if(value&&typeof value==='object')return value.text||value.content||JSON.stringify(value);
 return'';
}
async function compare(snapshot){
 const terms=selected();if(terms.length<2)return;
 status('Finding real sources for '+terms.length+' subjects…');
 const byTerm=await Promise.all(terms.map(async term=>({term,sources:await lookup(term)})));
 if(active!==snapshot)return;
 const evidences=byTerm.map(x=>({term:x.term,sources:x.sources.slice(0,3)}));
 const input=[
  'You are QuantaPhi Scholastic Data Comparison. Compare exactly these user-selected entries from the live yellow extraction index:',
  JSON.stringify(terms),
  'Primary research context: '+snapshot.query,
  'Retrieved public search evidence for each term: '+JSON.stringify(evidences).slice(0,7800),
  'Write a specific, original comparison. Explain similarities, differences, meaningful classifications and additional closely related entities the reader could search next. Example: plum and grapefruit may point to stone fruits vs citrus, orchard cultivation and related fruits. Do NOT state they share a genus.',
  'Use only retrieved evidence for factual specifics. Explicitly distinguish proven facts, conceptual analogies and unknowns. If the evidence is unavailable, give a useful comparison plan and label it unverified.',
  'Use clearly separated short paragraphs; give a 2-5 sentence conclusion with a concrete next research question. No invented sources or URLs.'
 ].join('\n');
 status('Comparing source evidence with GPT…');
 let prose='',verified=false;
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),32000);
  let r;
  try{r=await fetch(API,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({input,context:{application:'QuantaPhi',task:'data-extraction-compare',requireCloudflare:true}}),signal:controller.signal})}
  finally{clearTimeout(timer)}
  const d=await r.json().catch(()=>({}));
  if(!r.ok||d.ok===false)throw Error(String(d.error||'GPT comparison unavailable'));
  prose=String(explanationText(d.output_text??d.output??d.answer??d.response)||'').trim().slice(0,9000);
  if(!prose||prose.length<50)throw Error('GPT returned no usable comparison');
  verified=true;
 }catch(err){
  prose='GPT comparison could not be completed ('+clean(err.message).slice(0,90)+'). Source results for each selected term are listed below. These records are research inputs, not proof that the subjects share a particular relationship.';
 }
 if(active!==snapshot)return;
 const comparison={terms,primaryQuery:snapshot.query,analysis:prose,sourceEvidence:evidences,
  status:verified?'AI synthesis from retrieved source snippets':'source evidence only · GPT unavailable',createdAt:new Date().toISOString()};
 try{
  await saveToCurrent(snapshot.tokenId,[],comparison);
  if(active!==snapshot)return;
  snapshot.lastComparison=comparison;
  show('compare','Compared '+terms.length+' selected subjects',prose,byTerm);
  window.PhiAssimilation?.signal?.({kind:'comparison',action:'click',title:'Data comparison',query:snapshot.query,terms:terms.join(' + ')});
  status('Comparison saved in this Quant · select Build to reuse it');
 }catch(err){
  if(active===snapshot){show('compare','Comparison (not saved)',prose,byTerm);status('Could not save comparison: '+clean(err.message))}
 }
}
function build(snapshot,reader=false){
 const terms=reader?[snapshot.query]:selected();
 if(!terms.length)return;
 const combined=terms.join(' + ').slice(0,350);
 const context=reader?'Build a unique website from the QuantaPhi Scholastic Reader overview on '+snapshot.query+'. Use actual sourced research.':
  'Build an interactive website using these QuantaPhi selected extracted data topics: '+terms.join(', ')+'. Compare their verified similarities and differences, retain source references and include useful research widgets.';
 const matchingComparison=!reader&&snapshot.lastComparison&&snapshot.lastComparison.terms.join('|')===terms.join('|');
 const extra=reader?clean(snapshot.red.querySelector('.qreader-prose')?.textContent||'').slice(0,900):
  matchingComparison?snapshot.lastComparison.analysis:'';
 const combinedPrompt=(context+' '+extra).slice(0,1250);
 const u=new URL('/infinity-phi/',location.origin);
 u.searchParams.set('q',combined);u.searchParams.set('intent','build');u.searchParams.set('from','quanta-data');
 u.searchParams.set('buildPrompt',combinedPrompt);
 if(snapshot.tokenId)u.searchParams.set('sourceQuant',snapshot.tokenId);
 const a=make('a');a.href=u.href;a.dataset.siteUrl=u.href;a.dataset.siteTitle=reader?'Build from Scholastic Reader':'Build with '+terms.length+' data subjects';
 window.PhiAssimilation?.signal?.({kind:'data',action:'build',title:combined,query:snapshot.query,terms:combined});
 if(typeof window.QuantaOpenSite==='function')window.QuantaOpenSite(a);
 else location.assign(u.href);
}
function click(event){
 if(!active)return;
 const select=event.target.closest('.qdata-select');
 if(select&&active.yellow.contains(select)){
  event.preventDefault();
  const value=select.dataset.value;if(!value)return;
  if(active.selected.has(value))active.selected.delete(value);
  else if(active.selected.size<8)active.selected.add(value);
  else {status('Up to eight subjects can be compared together. Clear one selection first.');return}
  sync();status(active.selected.size+' selected. Use Extract, Compare, or Build.');return;
 }
 const work=event.target.closest('[data-work]');
 if(!work||!active.yellow.contains(work))return;
 event.preventDefault();if(active.busy)return;
 const snapshot=active;
 const job=work.dataset.work;
 if(job==='clear'){snapshot.selected.clear();sync();status('Selection cleared.');return}
 if(job==='build'){build(snapshot);return}
 if(job==='extract'||job==='compare'){
  snapshot.busy=true;
  snapshot.yellow.querySelectorAll('.qdata-actions button').forEach(b=>b.disabled=true);
  void (job==='extract'?extract(snapshot):compare(snapshot)).finally(()=>{
   snapshot.busy=false;if(active===snapshot)sync();
  });return;
 }
}
function activate(query,sections,evidence){
 const root=document.getElementById('overview');
 const red=root?.querySelector('.qzoneRed'),yellow=root?.querySelector('.qzoneYellow');
 if(!red||!yellow)return;
 if(active?.observer)active.observer.disconnect();
 red.classList.add('qscholastic-reader');yellow.classList.add('qdata-oracle-card');
 active={query:clean(query),tokenId:window.__qActiveTokenId||'',selected:new Set(),yellow,red,sections,evidence,busy:false,lastComparison:null,observer:null};
 hero(red,'reader');hero(yellow,'data');
 const redTitle=red.querySelector('h3');
 if(redTitle){redTitle.textContent='Scholastic Reader';redTitle.classList.add('qreader-original-title')}
 const prosa=make('div','qreader-prose');
 const paras=[...red.querySelectorAll(':scope > p')];
 for(const p of paras)prosa.append(p);
 red.append(prosa);
 const readerActions=make('div','qreader-actions');
 const read=make('button','','Read the overview');read.type='button';read.addEventListener('click',()=>prosa.scrollIntoView({block:'start',behavior:'smooth'}));
 const buildReader=make('button','','Build from overview');buildReader.type='button';
 buildReader.addEventListener('click',()=>{if(active)build(active,true)});
 readerActions.append(read,buildReader);red.append(readerActions);
 const original=yellow.querySelector('h3');if(original)original.textContent='Data Extraction · live index';
 const description=make('p','qdata-lead','Tap subjects to select them. Extract a term into this Quant, compare 2–8 subjects with GPT and source evidence, or build a website from the selection.');
 const toolbar=make('div','qdata-toolbar');
 const filter=make('input','qdata-filter');filter.type='search';filter.placeholder='Find among extracted data…';
 filter.setAttribute('aria-label','Filter the clickable data index');
 filter.addEventListener('input',()=>{
  const needle=clean(filter.value).toLowerCase();
  yellow.querySelectorAll('#qYellowDataList li').forEach(li=>{
   li.hidden=!!needle&&!clean(li.querySelector('.qdata-select')?.dataset.value||li.textContent).toLowerCase().includes(needle);
  });
 });
 yellow.insertBefore(filter,yellow.querySelector('#qYellowDataList'));
 const count=make('span','qdata-count','0 selected · choose up to 8');count.setAttribute('aria-live','polite');
 const actions=make('div','qdata-actions');
 for(const [key,label] of [['extract','Extract'],['compare','Compare selected'],['build','Build'],['clear','Clear']]){
  const button=make('button','qdata-action qdata-'+key,label);button.type='button';button.dataset.work=key;actions.append(button)
 }
 toolbar.append(count,actions);
 const list=yellow.querySelector('#qYellowDataList');yellow.insertBefore(description,list);yellow.insertBefore(toolbar,list);
 const output=make('section','qdata-output');output.hidden=true;output.setAttribute('aria-live','polite');
 yellow.append(output);
 const notice=make('p','qdata-status','Select one item to extract, or several to compare.');
 notice.setAttribute('role','status');yellow.append(notice);
 yellow.addEventListener('click',click);
 // The Yellow index replaces its <li> links after more source discovery.
 // Decorate newly inserted rows without losing the user's selected terms.
 active.observer=new MutationObserver(()=>{if(active?.yellow===yellow)renderLinks()});
 active.observer.observe(list,{childList:true,subtree:true});
 renderLinks();sync();
}
window.PhiScholasticData={activate,decorate:renderLinks};
// A shared URL can launch search before a deferred file finishes loading.
// Rehydrate the card if both research zones already exist on arrival.
if(document.getElementById('overview')?.querySelector('.qzoneYellow')){
 activate(document.getElementById('q')?.value||new URL(location.href).searchParams.get('q')||'');
}
})(window,document);