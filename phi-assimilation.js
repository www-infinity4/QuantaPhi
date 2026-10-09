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
 nature:'biology life plant plants tree trees animal cell organism photosynthesis',
 technology:'technology robotics computer electronics engineering machine circuit invention engine',
 finance:'stock stocks market business gold silver money economy finance currency'
};
const CONNECT={planetary:['chemistry','geology','energy','technology','nature'],chemistry:['planetary','geology','energy','nature'],geology:['planetary','chemistry','history'],energy:['planetary','chemistry','technology'],history:['technology','geology','music','finance'],nature:['planetary','chemistry','geology'],music:['history','technology'],technology:['planetary','chemistry','energy','finance'],finance:['history','technology','chemistry']};
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
 let events=local(KEY);
 try{const r=await cloud('/v1/quants/card-interactions');if(Array.isArray(r.events)){const known=new Set(events.map(x=>x.id));for(const x of r.events){if(!known.has(x.event_id)){events.push({id:x.event_id,kind:x.kind,action:x.action,title:x.title,query:x.query_text,terms:x.index_terms});known.add(x.event_id)}}}}catch{}
 for(const x of events){const weight={star:7,collect:6,share:5,build:5,expand:3,open:2,click:1,unstar:0}[x.action]||1;add({id:'event:'+x.id,query:x.query||x.title,detail:x.terms,kind:x.kind||'card',weight})}
 return{items:all,remote};
}
function rank(items,q,sections){
 const qs=terms([q,...(sections?.yellow||[]).map(x=>x.value)].join(' ')),qc=cats([q,...(sections?.yellow||[]).map(x=>x.value)].join(' ')),seen=new Set();
 return items.map(x=>{const ts=terms(x.query+' '+x.detail),cs=cats(x.query+' '+x.detail),overlap=[...qs].filter(v=>ts.has(v)).length,same=cs.filter(v=>qc.includes(v)).length,cross=cs.some(c=>qc.some(z=>(CONNECT[z]||[]).includes(c)))&&!same;return {...x,score:overlap*9+same*5+(cross?4:0)+Math.min(x.weight-1,5),cross,categories:cs}})
 .filter(x=>x.query.toLowerCase()!==clean(q).toLowerCase()).sort((a,b)=>b.score-a.score).filter(x=>{const id=x.query.toLowerCase();if(seen.has(id))return false;seen.add(id);return true});
}
const safe=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function evidence(q,old){try{const u=new URL('https://orange-brook-a2ac.marvaseater.workers.dev/search');u.search=new URLSearchParams({q:q+' '+old,format:'json',categories:'general',safesearch:'1'});const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),4500);let r;try{r=await fetch(u,{signal:ctl.signal})}finally{clearTimeout(timer)}const j=r.ok?await r.json():{};return (j.results||[]).slice(0,2).map(x=>({url:x.url,title:clean(x.title),excerpt:clean(x.content||x.description).slice(0,320)})).filter(x=>/^https:\/\//.test(x.url||''))}catch{return[]}}
let ticket=0;
async function load(q,sections){
 const id=++ticket,list=document.getElementById('qPurpleList');if(!list)return;
 list.innerHTML='<li>Indexing all saved Quants, searches and interacted-with cards…</li>';
 const {items,remote}=await corpus();if(id!==ticket||!list.isConnected||clean(document.getElementById('q')?.value).toLowerCase()!==clean(q).toLowerCase())return;
 const ranked=rank(items,q,sections),selected=[],limits={};
 for(const x of ranked){if(selected.length>=16)break;const c=x.categories[0]||'other';if((limits[c]||0)>=5&&selected.length>=7)continue;selected.push(x);limits[c]=(limits[c]||0)+1;}
 let chips=document.getElementById('qAssimilationChips');if(!chips){chips=document.createElement('div');chips.id='qAssimilationChips';chips.className='qchips';list.parentElement.append(chips)}chips.replaceChildren();
 const label=document.createElement('small');label.style.width='100%';label.textContent='Compared '+items.length+' available records ('+(remote?'cloud and device':'device only')+'); '+ranked.length+' distinct earlier topics. Select a suggestion to refine without minting.';chips.append(label);
 for(const x of selected.slice(0,10)){const btn=document.createElement('button');btn.type='button';btn.className='qchip';btn.dataset.assimilate=encodeURIComponent(x.query);btn.textContent=x.query;chips.append(btn)}
 if(!selected.length){list.innerHTML='<li>No saved research could be read for this identity. Existing Quants remain unchanged.</li>';return}
 list.innerHTML='<li>Checking cross-topic evidence across '+selected.length+' promising indexed topics…</li>';
 const samples=await Promise.all(selected.slice(0,5).map(async x=>({query:x.query,sources:await evidence(q,x.query)})));
 if(id!==ticket||!list.isConnected)return;
 const prompt=['You are QuantaPhi Purple Assimilation. Use these shortlisted topics from the FULL saved Quant and story index. Current research:',q,JSON.stringify({overview:clean(sections?.red?.overview).slice(0,850),facts:(sections?.yellow||[]).slice(0,10).map(x=>x.value)}),'Related topics:',JSON.stringify(selected.map(x=>({query:x.query,categories:x.categories,crossDomain:x.cross,kind:x.kind}))),'Evidence:',JSON.stringify(samples),'Find 3-6 genuinely interesting connections. Cross-domain similarities are research questions unless evidence verifies a factual relationship. Example: manganese, element 25, and Venus can motivate investigating planetary mineral chemistry; DO NOT assert manganese was detected on Venus without evidence. Do not invent facts or URLs. Return JSON only {"purple":[{"type":"factual|conceptual","history_query":"exact earlier topic","relationship":"clear specific relation or hypothesis","bridge":"why interesting","source_url":"verified evidence URL if factual"}]}'].join('\n');
 try{
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),16000);let r;try{r=await fetch('https://infinity-rogers.marvaseater.workers.dev/v1/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({input:prompt,context:{application:'QuantaPhi',task:'full-history-assimilation',scanned_records:items.length}}),signal:ctl.signal})}finally{clearTimeout(timer)}
  if(!r.ok)throw Error('no ai');const d=await r.json();const raw=String(d.output||d.text||d.response||d.content||'');const json=raw.match(/\{[\s\S]*\}/)?.[0]||raw;const result=parse(json);const allowed=new Set(selected.map(x=>x.query.toLowerCase()));const rows=(result.purple||[]).filter(x=>allowed.has(clean(x.history_query).toLowerCase())&&clean(x.relationship)).slice(0,6);
  if(!rows.length)throw Error('no bridges');if(id!==ticket||!list.isConnected)return;
  list.innerHTML=rows.map(x=>{const verified=x.type==='factual'&&samples.some(s=>s.query.toLowerCase()===clean(x.history_query).toLowerCase()&&s.sources.some(y=>y.url===x.source_url));const type=verified?'FACTUAL · source checked':'CONCEPTUAL · research question';return '<li><strong>'+type+' · '+safe(x.history_query)+':</strong> '+safe(x.relationship)+(x.bridge?' — '+safe(x.bridge):'')+(verified?' <a href="'+safe(x.source_url)+'" target="_blank" rel="noopener noreferrer">Source ↗</a>':'')+'</li>'}).join('');
 }catch{if(id===ticket&&list.isConnected)list.innerHTML='<li>Earlier topics are indexed, but independent bridge verification is unavailable. Select a topic to research it without an unsupported factual claim.</li>'}
}
function signal({kind='card',action='click',key='',title='',query='',terms='',id}={}){
 if(!['open','expand','star','unstar','collect','share','build','click'].includes(action))return;
 const event={id:id||'ci_'+(w.crypto?.randomUUID?.()||String(Date.now())+'_'+Math.random().toString(36).slice(2)),kind:clean(kind).slice(0,35),action,key:clean(key).slice(0,250),title:clean(title),query:clean(query),terms:clean(terms),createdAt:new Date().toISOString()};
 try{const a=local(KEY);if(!a.some(x=>x.id===event.id)){a.push(event);localStorage.setItem(KEY,JSON.stringify(a.slice(-2500)))}}catch{}
 void cloud('/v1/quants/card-interactions',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(event)}).catch(()=>{});
}
w.PhiAssimilation={load,rank,corpus,signal};
})(window);
