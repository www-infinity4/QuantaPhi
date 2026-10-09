/* Full-history Phi assimilation. Analysis/interaction events never mint currency. */
(function(w){
'use strict';
const API='https://quanta-phi-ledger.marvaseater.workers.dev',KEY='quantaPhiCardInteractionsV1';
const STOP=new Set('the and from for with what who how when where which about this that they these are were was have has story secrets search share collect card'.split(' '));
const DOMAINS={
 planetary:'venus mars mercury earth moon jupiter saturn planet planets asteroid astronomy solar atmosphere spacecraft',
 chemistry:'manganese element elements atomic metal metals chemistry oxide sulfur acid mineral minerals hydrogen helium vanadium',
 geology:'volcano volcanic lava rock rocks basalt crust mineral minerals geology surface soil mantle pressure temperature',
 energy:'electricity battery solar nuclear power energy hydrogen thermal fuel generator',
 history:'history historical ancient archeology archaeology invention inventor patent discovery museum',
 music:'song songs music guitar piano band singer album concert radio',
 nature:'biology life plant plants tree trees animal cell organism photosynthesis botanical fruits fruit orchard crop crops cultivar cultivars citrus grapefruit plum plums berry berries apple apples pear pears',
 food:'fruit fruits grapefruit citrus plum plums berries berry apple apples pear pears orchard orchards crop crops vegetable vegetables produce cooking juice nutrition agriculture horticulture',
 technology:'technology robotics computer electronics engineering machine circuit invention engine',
 finance:'stock stocks market business gold silver money economy finance currency'
};
const CONNECT={planetary:['chemistry','geology','energy','technology','nature'],chemistry:['planetary','geology','energy','nature'],geology:['planetary','chemistry','history'],energy:['planetary','chemistry','technology'],history:['technology','geology','music','finance'],nature:['planetary','chemistry','geology','food'],food:['nature','chemistry','geology','history'],music:['history','technology'],technology:['planetary','chemistry','energy','finance'],finance:['history','technology','chemistry']};
const clean=s=>String(s||'').replace(/\s+/g,' ').trim().slice(0,600);
const terms=s=>new Set((clean(s).toLowerCase().match(/[\p{L}\p{N}]+/gu)||[]).filter(x=>x.length>2&&!STOP.has(x)));
const cats=s=>{const t=terms(s);return Object.keys(DOMAINS).filter(k=>DOMAINS[k].split(' ').some(v=>t.has(v)))};
const parse=v=>{try{return typeof v==='string'?JSON.parse(v):v||{}}catch{return{}}};
function local(key){try{const v=parse(localStorage.getItem(key));return Array.isArray(v)?v:[]}catch{return[]}}
async function cloud(path,options){const b=w.QuantaCloudConnection||w.StarQuestCloudLedger;if(!b||typeof b.authenticatedFetch!=='function')throw Error('cloud offline');const r=await b.authenticatedFetch(API+path,options);if(!r.ok)throw Error('cloud '+r.status);return r.json()}
async function corpus(){
 const all=[],ids=new Set();let remote=false;
 function add(x){const query=clean(x.query||x.title);if(!query)return;const id=String(x.id||'text:'+query.toLowerCase());if(ids.has(id))return;ids.add(id);all.push({id,query,detail:clean(x.detail),kind:x.kind||'search',weight:x.weight||1})}
 const [history,tokens]=await Promise.all([cloud('/v1/quants/history').catch(()=>null),w.QuantaUnifiedTokenLedger?.load?.().catch(()=>[])||[]]);
 if(history&&Array.isArray(history.searches)){remote=true;
  for(const x of history.searches)add({id:'search:'+x.search_id,query:x.query_text});
  for(const x of history.tokens||[]){const d=parse(x.data_json),r=parse(x.research_json);add({id:'quant:'+x.token_id,query:d.query||r.query||r.title,detail:[r.overview,...(r.keyTakeaways||[])].join(' '),kind:'quant'})}
 }
 for(const x of Array.isArray(tokens)?tokens:[])add({id:'local:'+x.id,query:x.query||x.title,detail:[x.payload?.overview,...(x.payload?.findings||[])].join(' '),kind:'quant'});
 for(const x of local('quantaPhiBuildHistoryV1'))add({id:'old:'+String(x.search_id||x.id||x.query),query:x.query});
 for(const x of local('quantaPhiCollected'))add({id:'collected:'+x.key,query:x.searchQuery||x.title,detail:x.story,kind:'story',weight:4});
 const oldStars=new Set(local('phi_infinite_book_favorites_v1'));
 for(const x of local('phi_infinite_book_live_v2'))if(oldStars.has(x.id))add({id:'legacy-favorite:'+x.id,query:x.title,detail:x.summary,kind:'story',weight:7});
 let events=local(KEY);
 try{const r=await cloud('/v1/quants/card-interactions');if(Array.isArray(r.events)){const known=new Set(events.map(x=>x.id));for(const x of r.events){if(!known.has(x.event_id)){events.push({id:x.event_id,kind:x.kind,action:x.action,title:x.title,query:x.query_text,terms:x.index_terms});known.add(x.event_id)}}}}catch{}
 for(const x of events){const weight={star:7,collect:6,share:5,build:5,expand:3,open:2,click:1,unstar:0}[x.action]||1;add({id:'event:'+x.id,query:x.query||x.title,detail:x.terms,kind:x.kind||'card',weight})}
 return{items:all,remote};
}
function rank(items,q,sections){
 const qs=terms([q,...(sections?.yellow||[]).map(x=>x.value)].join(' ')),qc=cats([q,...(sections?.yellow||[]).map(x=>x.value)].join(' ')),seen=new Set();
 return items.map(x=>{const ts=terms(x.query+' '+x.detail),cs=cats(x.query+' '+x.detail),overlap=[...qs].filter(v=>ts.has(v)).length,same=cs.filter(v=>qc.includes(v)).length,cross=cs.some(c=>qc.some(z=>(CONNECT[z]||[]).includes(c)))&&!same;return {...x,score:overlap*9+same*5+(cross?4:0)+Math.min(Math.max(0,(Number(x.weight)||1)-1),5),cross,categories:cs}})
 .filter(x=>x.query.toLowerCase()!==clean(q).toLowerCase()).sort((a,b)=>b.score-a.score).filter(x=>{const id=x.query.toLowerCase();if(seen.has(id))return false;seen.add(id);return true});
}
const safe=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function evidence(q,old){try{const u=new URL('https://orange-brook-a2ac.marvaseater.workers.dev/search');u.search=new URLSearchParams({q:q+' '+old,format:'json',categories:'general',safesearch:'1'});const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),4500);let r;try{r=await fetch(u,{signal:ctl.signal})}finally{clearTimeout(timer)}const j=r.ok?await r.json():{};return (j.results||[]).slice(0,2).map(x=>({url:x.url,title:clean(x.title),excerpt:clean(x.content||x.description).slice(0,320)})).filter(x=>/^https:\/\//.test(x.url||''))}catch{return[]}}

let ticket=0;
function researchTopic(raw){
 return clean(raw).replace(/\([0-9]{6,}\)\.(?:jpe?g|png|webp)$/i,'').replace(/\.(?:jpe?g|png|webp)$/i,'').trim().slice(0,130);
}
function packageOptions(items,q,sections){
 const ranked=rank(items,q,sections);
 const candidates=ranked.filter(x=>x.score>0&&!/^\w+:\/\/|^https?:|^\s*data:/i.test(x.query)&&researchTopic(x.query).length>=3);
 const chosen=[],counts={};
 for(const x of candidates){
  if(chosen.length>=24)break;
  const category=x.categories[0]||'general';
  if((counts[category]||0)>=8)continue;
  counts[category]=(counts[category]||0)+1;chosen.push({...x,query:researchTopic(x.query)});
 }
 return {ranked,chosen};
}
function parsePackages(payload,allowed,sourceUrls){
 let value=payload?.output_text??payload?.output??payload?.answer??payload?.response??payload?.content??payload?.message??payload?.text??'';
 if(Array.isArray(value))value=value.map(x=>x?.text||x?.content||'').join('\n');
 if(value&&typeof value==='object')value=value.text||value.content||JSON.stringify(value);
 const raw=String(value||'');let obj=parse(raw);
 if(!Array.isArray(obj.packages)){const m=raw.match(/\{[\s\S]*\}/);obj=m?parse(m[0]):{}}
 return (Array.isArray(obj.packages)?obj.packages:[]).map(x=>{
  const related=(Array.isArray(x.topics)?x.topics:[]).map(researchTopic).filter(t=>allowed.has(t.toLowerCase())).slice(0,4);
  return {title:clean(x.title).slice(0,110),topics:[...new Set(related)],connection:clean(x.connection).slice(0,450),question:clean(x.next_question||x.question).slice(0,240),status:x.status==='supported'&&sourceUrls.has(String(x.source_url||''))?'source-backed':'research comparison',sourceUrl:sourceUrls.has(String(x.source_url||''))?String(x.source_url||''):''};
 }).filter(x=>x.title&&x.topics.length&&x.connection).slice(0,5);
}
function fallbackPackages(chosen,q){
 // When AI research is unavailable, present useful *questions* instead of invented links.
 const groups=new Map();
 for(const x of chosen.filter(x=>x.score>=8)){const k=x.categories[0]||'other';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x);}
 const packages=[];
 for(const [domain,arr] of groups){
  if(packages.length>=4)break;
  const topics=arr.slice(0,3).map(x=>x.query);
  if(!topics.length)continue;
  packages.push({title:domain==='other'?'Compare earlier research':domain[0].toUpperCase()+domain.slice(1)+' connections',topics,connection:'Explore what the current subject and these earlier topics have in common, where they differ, and what additional evidence is needed. No factual relationship is assumed.',question:'What related subjects emerge when '+q+' is compared with '+topics.slice(0,2).join(' and ')+'?',status:'research comparison',sourceUrl:''});
 }
 return packages;
}
function showPackages(list,packages,q){
 list.replaceChildren();
 for(const pack of packages){
  const li=document.createElement('li');li.className='qassim-package';
  const heading=document.createElement('strong');heading.textContent=pack.title;
  const text=document.createElement('p');text.textContent=pack.connection;
  const related=document.createElement('small');related.textContent='Combines: '+[q,...pack.topics].join(' + ');
  const actions=document.createElement('div');actions.className='qassim-actions';
  const compare=document.createElement('button');compare.type='button';compare.textContent='Compare & compile';compare.dataset.assimilate=encodeURIComponent([pack.title,pack.connection,pack.question,'Compare '+q+' with '+pack.topics.join(', ')].filter(Boolean).join('. ').slice(0,650));actions.append(compare);
  const explore=document.createElement('a');const topic=pack.question||('How are '+q+' and '+pack.topics.join(', ')+' connected?');
  explore.href='/?q='+encodeURIComponent(topic.slice(0,250));explore.textContent='Explore new Quant';actions.append(explore);
  const build=document.createElement('a');build.href='/infinity-phi/?q='+encodeURIComponent([q,...pack.topics].join(' + ').slice(0,250))+'&intent=build';build.textContent='Build website';actions.append(build);
  li.append(heading,text,related,actions);
  if(pack.status==='source-backed'&&/^https:\/\//.test(pack.sourceUrl)){const source=document.createElement('a');source.href=pack.sourceUrl;source.target='_blank';source.rel='noopener noreferrer';source.textContent='View research source';li.append(source)}
  list.append(li);
 }
}
async function load(q,sections){
 const id=++ticket,list=document.getElementById('qPurpleList');if(!list)return;
 list.textContent='Combining saved Quant research…';
 const {items,remote}=await corpus();
 if(id!==ticket||!list.isConnected)return;
 const {ranked,chosen}=packageOptions(items,q,sections);
 const old=document.getElementById('qAssimilationChips');if(old)old.remove();
 if(!chosen.length){list.innerHTML='<li>There are no matching earlier topics available for this research yet. Explore a new Quant to add another connection.</li>';return}
 list.textContent='Assembling related research packages…';
 // Evidence is collected for promising bridges only; history remains indexed, not
 // dumped to the screen or sent wholesale with private card interaction details.
 const samples=await Promise.all(chosen.slice(0,5).map(async x=>({query:x.query,sources:await evidence(q,x.query)})));
 if(id!==ticket||!list.isConnected)return;
 const prompt=[
 'You are the GPT synthesis engine for QuantaPhi Assimilation. Your job is to COMBINE useful saved research into 3-5 coherent topic packages, not print an inventory of old searches.',
 'CURRENT SUBJECT:',q,
 'CURRENT SOURCED OVERVIEW:',clean(sections?.red?.overview).slice(0,1000),
 'CURRENT FACT INDEX:',JSON.stringify((sections?.yellow||[]).slice(0,12).map(x=>x.value)),
 'SHORTLIST FROM THE COMPLETE STORED SEARCH, QUANT, AND INTERACTION INDEX:',JSON.stringify(chosen.map(x=>({query:x.query,domain:x.categories,kind:x.kind,score:x.score}))),
 'INDEPENDENT WEB EVIDENCE:',JSON.stringify(samples),
 'Example: plums + grapefruit may lead to a citrus-versus-stone-fruit comparison, orchard cultivation, fruit chemistry or related crops, not a random fruit-name list. Explore the deeper family of useful ideas without asserting that the fruits share a botanical genus.',
 'Only select topics exactly present in the shortlist. Some comparisons are conceptual, not factual; say what to RESEARCH rather than pretending a connection is verified. If a claim is supported, cite a URL actually present in the evidence; otherwise status must be conceptual.',
 'Each package must contain at least one earlier topic and the current subject, a clear synthesis, and a strong follow-up question that can drive a new Quant or website. Avoid generic filler, repetition, and filenames.',
 'Return strict JSON {"packages":[{"title":"meaningful cluster","topics":["exact earlier topic"],"connection":"why this is a promising comparison","next_question":"specific deeper research question","status":"conceptual|supported","source_url":"URL from supplied evidence or empty"}]}.'
 ].join('\n');
 let packages=[];
 try{
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),24000);
  let response;try{response=await fetch('https://infinity-rogers.marvaseater.workers.dev/v1/chat',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},body:JSON.stringify({input:prompt,context:{application:'QuantaPhi',task:'full-history-assimilation',requireCloudflare:true,scanned_records:items.length}}),signal:ctl.signal})}finally{clearTimeout(timer)}
  if(!response.ok)throw Error('AI status '+response.status);
  const payload=await response.json();
  packages=parsePackages(payload,new Set(chosen.map(x=>x.query.toLowerCase())),new Set(samples.flatMap(s=>s.sources.map(x=>x.url))));
 }catch(error){console.warn('GPT package synthesis unavailable; showing labeled research comparisons',error)}
 if(id!==ticket||!list.isConnected)return;
 if(!packages.length)packages=fallbackPackages(chosen,q);
 if(!packages.length){list.textContent='No useful comparison was found in the available Quant history.';return}
 showPackages(list,packages,q);
 list.parentElement.querySelectorAll('.qassim-count').forEach(x=>x.remove());
 const caption=document.createElement('small');caption.className='qassim-count';caption.textContent='Assessed '+items.length+' stored records ('+(remote?'cloud and device':'device only')+'), grouped '+ranked.filter(x=>x.score>0).length+' potentially related topics. These packages are research paths, not automatic factual claims.';list.after(caption);
}

function signal({kind='card',action='click',key='',title='',query='',terms='',id}={}){
 if(!['open','expand','star','unstar','collect','share','build','click'].includes(action))return;
 const event={id:id||'ci_'+(w.crypto?.randomUUID?.()||String(Date.now())+'_'+Math.random().toString(36).slice(2)),kind:clean(kind).slice(0,35),action,key:clean(key).slice(0,250),title:clean(title),query:clean(query),terms:clean(terms),createdAt:new Date().toISOString()};
 try{const a=local(KEY);if(!a.some(x=>x.id===event.id)){a.push(event);localStorage.setItem(KEY,JSON.stringify(a.slice(-2500)))}}catch{}
 void cloud('/v1/quants/card-interactions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(event)}).catch(()=>{});
}
w.PhiAssimilation={load,rank,corpus,signal};
})(window);
