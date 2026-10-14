/* Device-local image learning signals. No uploads or remote telemetry. */
(function(root){
'use strict';
const KEY='phi_image_learning_v1',MAX=120;
const signals=new Set(['review','star','star_off','collect','share','save_requested','looks_good','needs_fix','refine']);
function read(){try{const data=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(data)?data:[]}catch(_){return []}}
function persist(list){try{localStorage.setItem(KEY,JSON.stringify(list.slice(-MAX)));return true}catch(_){return false}}
function str(value,max=220){return String(value||'').replace(/\s+/g,' ').trim().slice(0,max)}
function record(artifact,signal,info={}){
 if(!artifact?.id||!signals.has(signal))return false;
 const list=read(),id=str(artifact.id,120);
 let entry=list.find(x=>x.id===id);
 if(!entry){entry={id,mode:str(artifact.mode,32),prompt:str(artifact.prompt,240),signals:[],issues:[],createdAt:Date.now()};list.push(entry)}
 if(signal==='star_off')entry.signals=entry.signals.filter(x=>x!=='star');
 else if(!entry.signals.includes(signal))entry.signals.push(signal);
 if(signal==='review')entry.issues=(Array.isArray(info.issues)?info.issues:[]).slice(0,5).map(x=>str(x.problem,180)).filter(Boolean);
 if(signal==='needs_fix'&&info.problem)entry.issues=[str(info.problem,180),...entry.issues].slice(0,5);
 entry.updatedAt=Date.now();
 return persist(list);
}
function preferences(mode){
 const entries=read().filter(x=>x.mode===mode).sort((a,b)=>b.updatedAt-a.updatedAt);
 const likes=entries.filter(x=>x.signals?.some(v=>['star','collect','looks_good'].includes(v))).slice(0,3).map(x=>str(x.prompt,170));
 const corrections=entries.filter(x=>x.signals?.includes('needs_fix')&&x.issues?.length).slice(0,3).flatMap(x=>x.issues.slice(0,2));
 return [
  likes.length?'Previous images explicitly appreciated by this user: '+likes.join(' | '):'',
  corrections.length?'Earlier user-requested corrections; apply only if relevant: '+corrections.join(' | '):''
 ].filter(Boolean).join('\n').slice(0,750);
}
root.PhiImageLearning={record,preferences,summary:()=>read().map(x=>({...x}))};
})(window);
\n\n/* Intelligent Card workspace modules. Loaded before phi-image-builder.js in the existing deferred sequence. */\n/* QuantaPhi card context: same-tab topic and source, never payment or account state. */
(function(root){
'use strict';
const KEY='phi_card_context_v1',TTL=1800000;
const text=(v,n=140)=>String(v||'').replace(/[<>\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
function topic(v){const s=text(v);return /@|https?:\/\/|(?:\d[ -]?){8,}/.test(s)?'':s}
function read(){
 let p;try{p=JSON.parse(root.sessionStorage?.getItem(KEY)||'null')}catch{return null}
 if(!p||p.schemaVersion!==1||p.expiresAt<=Date.now()||!topic(p.topic)){try{root.sessionStorage?.removeItem(KEY)}catch{}return null}
 return {...p};
}
function publish(input={}){
 const t=topic(input.topic);if(!t)return null;
 const old=read(),source=text(input.sourceCard||'search',32);
 if(old?.topic===t&&old.sourceCard===source)return old;
 const now=Date.now(),record={schemaVersion:1,topic:t,sourceCard:source,intent:text(input.intent||'research',30),
 summary:topic(input.summary)?.slice(0,240)||'',entities:[...new Set((t.match(/[A-Za-z][A-Za-z-]{2,}/g)||[]).map(v=>v.toLowerCase()))].slice(0,8),
 updatedAt:now,expiresAt:now+TTL};
 try{root.sessionStorage?.setItem(KEY,JSON.stringify(record))}catch{}
 root.dispatchEvent(new CustomEvent('phi:card-context:update',{detail:record}));return record;
}
function clear(){try{root.sessionStorage?.removeItem(KEY)}catch{}root.dispatchEvent(new CustomEvent('phi:card-context:update',{detail:null}))}
function subscribe(fn){const listener=e=>fn(e.detail);root.addEventListener('phi:card-context:update',listener);return()=>root.removeEventListener('phi:card-context:update',listener)}
root.PhiCardContext={read,getSnapshot:read,publish,clear,subscribe};
function wire(){
 const q=document.getElementById('q'),go=document.getElementById('go'),book=document.getElementById('infiniteBook');
 const search=()=>{if(q?.value)publish({topic:q.value,sourceCard:'search'})};
 go?.addEventListener('click',search);
 q?.addEventListener('keydown',e=>{if(e.key==='Enter')search()});
 q?.addEventListener('search',search);
 if(book&&root.MutationObserver){
  let previous='';
  const observe=()=>{const title=topic(book.querySelector('.ib-title')?.textContent);
   if(title&&title!==previous&&!/^(loading|untitled|reads? and realms)$/i.test(title)){previous=title;publish({topic:title,sourceCard:'story',intent:'illustration',summary:book.querySelector('.ib-summary')?.textContent})}};
  const obs=new root.MutationObserver(observe);obs.observe(book,{subtree:true,childList:true,characterData:true});
 }
 if(!read()&&q?.value)search();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire,{once:true});else wire();
})(window);
\n/* Small deterministic, testable suggestions; GPT is never claimed unless invoked. */
(function(root){
'use strict';
const modes=[
 ['Image','Image'],['Trading Card','Trading Card'],['Advertisement','Advertisement'],
 ['Billboard','Billboard'],['Poster','Poster'],['Cover Art','Cover Art'],
 ['Kit Illustration','Image'],['Vintage Catalog Ad','Advertisement'],
 ['Exploded Parts Diagram','Image'],['Club Badge','Image'],
 ['Logo / Wordmark','Image'],['Instruction Booklet Cover','Cover Art'],
 ['Box Art','Cover Art'],['Sticker','Image'],['Story Illustration','Image'],
 ['Thumbnail','Image']
];
const formatInstructions={
 'Kit Illustration':'Show a credible three-dimensional view of the assembled kit with visible, era-appropriate materials and no invented specifications.',
 'Vintage Catalog Ad':'Compose a period-inspired catalog advertisement with clear product imagery and reserved space for accurate typeset copy.',
 'Exploded Parts Diagram':'Create a clean exploded-parts illustration; show only components supported by the source. Avoid invented labels or safety instructions.',
 'Club Badge':'Design a simple collectible club insignia centered on the subject, without impersonating a real brand.',
 'Logo / Wordmark':'Design an original readable emblem or wordmark inspired by the subject; do not copy existing protected logos.',
 'Instruction Booklet Cover':'Design an attractive educational instruction booklet cover, not fabricated assembly directions.',
 'Box Art':'Create original packaging illustration suitable for a kit product; reserve clear space for trustworthy copy.',
 'Sticker':'Create one bold, easily identifiable die-cut sticker concept.',
 'Story Illustration':'Depict one authentic story scene with the main subject as the focus.',
 'Thumbnail':'Create a legible 16:9 image thumbnail with a clear subject and uncluttered composition.'
};
const normal=s=>String(s||'').replace(/[<>\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,140);
const has=(t,re)=>re.test(t.toLowerCase());
function ranked(topic){
 const t=normal(topic);
 let priority=['Image','Trading Card','Poster','Cover Art','Advertisement','Exploded Parts Diagram'];
 if(has(t,/radio|electronic|receiver|clubhouse|kit|circuit|shortwave|amateur|transistor/))
  priority=['Kit Illustration','Vintage Catalog Ad','Exploded Parts Diagram','Trading Card','Club Badge','Logo / Wordmark'];
 else if(has(t,/pink floyd|music|piano|album|record|guitar|song|radio station/))
  priority=['Cover Art','Poster','Story Illustration','Trading Card','Thumbnail','Logo / Wordmark'];
 else if(has(t,/ruthenium|helium|element|physics|chemistry|molecule|atom|science/))
  priority=['Exploded Parts Diagram','Image','Trading Card','Poster','Story Illustration','Cover Art'];
 else if(has(t,/story|novel|mystery|adventure|character|fiction/))
  priority=['Story Illustration','Cover Art','Poster','Trading Card','Thumbnail','Image'];
 return priority.filter((v,i,a)=>a.indexOf(v)===i);
}
function instructions(kind){return formatInstructions[kind]||''}
function renderMode(kind){return modes.find(x=>x[0]===kind)?.[1]||'Image'}
function promptFor(topic,kind='Image'){
 const t=normal(topic);if(!t)return '';
 const subject='“'+t+'”';
 const sentences={
  'Kit Illustration':'Create a polished vintage-inspired illustration of '+subject+' as a practical electronics kit, with era-appropriate parts and a welcoming workshop. Show coils and tuning controls only where historically appropriate.',
  'Vintage Catalog Ad':'Create original mid-century catalog artwork presenting '+subject+' as an educational kit. Use tasteful retro graphic design and leave editable space for accurate advertising copy.',
  'Exploded Parts Diagram':'Illustrate '+subject+' with an educational exploded view of only verified parts; use clean separation, precise shapes and blank caption areas rather than fabricated labels.',
  'Trading Card':'Create an original collector trading card featuring '+subject+', strong hero artwork, a tasteful border, and a readable title space.',
  'Club Badge':'Design a vintage-inspired club badge featuring '+subject+' with one memorable silhouette and clean, printable edges.',
  'Logo / Wordmark':'Create a distinct, original wordmark or emblem inspired by '+subject+', using clean readable typography and avoiding copied logos.',
  'Advertisement':'Create a professional product advertisement about '+subject+', with clear imagery and a space for truthful text.',
  'Poster':'Create a striking original poster based on '+subject+' with bold composition and space for a short accurate title.',
  'Cover Art':'Create refined, original cover art inspired by '+subject+' with an expressive centerpiece.',
  'Instruction Booklet Cover':'Create an original period-inspired instruction booklet cover for '+subject+', with educational aesthetics and legible title space.',
  'Box Art':'Create original packaging illustration for '+subject+', with an appealing product scene and clear information space.',
  'Sticker':'Create a simple high-contrast die-cut sticker illustration inspired by '+subject+'.',
  'Story Illustration':'Create a cinematic but faithful story illustration based on '+subject+', avoiding invented historical claims.',
  'Thumbnail':'Create an attractive subject-first thumbnail about '+subject+' with clear shapes and editable title space.'
 };
 return sentences[kind]||'Create an original, detailed illustration of '+subject+', reflecting the topic with grounded visual details and a clear focal point.';
}
root.PhiImageSuggestions={modes:modes.map(([label,base])=>({label,renderMode:base})),ranked,renderMode,instructions,promptFor};
})(window);
