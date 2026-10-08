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
