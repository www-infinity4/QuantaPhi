// SanDisk Oracle Cloud Memory — bounded semantic routing, not a claim of cognition.
// Metadata is a retrieval hint. Repository names and user supplied labels do not
// independently verify the factual truth of the memory content.
export const TOPICS=Object.freeze([
 'electronics_computing','ai_programming','physics_science',
 'music_radio','stories_media','wallet_ledger','people_pets','general'
]);
const repoTopics=Object.freeze({
 'radio-clubhouse':'electronics_computing',
 'quanta-phi':'ai_programming','quantaphi':'ai_programming',
 'grammar-phi':'ai_programming','code-phi':'ai_programming',
 'omni-phi':'ai_programming','widgetphi':'ai_programming',
 'infinity-phi':'ai_programming','moltnook':'ai_programming',
 'infinity-radio':'music_radio','media-star':'stories_media',
 'starquest-ledger':'wallet_ledger','oracle-octaves':'music_radio'
});
const max=(value,length)=>String(value||'').trim().slice(0,length);
const safeId=s=>/^[a-zA-Z0-9_-]{8,100}$/.test(s);
function tokenize(text){
 return [...new Set(max(text,4000).toLowerCase().match(/[a-z0-9]{3,30}/g)||[])].slice(0,40);
}
export function routeNamespace(repository='',chosenTopic=''){
 const repo=max(repository,130);
 const name=repo.toLowerCase().split('/').at(-1);
 const hinted=repoTopics[name]||'general';
 const explicitlyChosen=TOPICS.includes(chosenTopic);
 return {topic:explicitlyChosen?chosenTopic:hinted,
  basis:explicitlyChosen?'owner_selected':name in repoTopics?'repository_hint':'general_fallback'};
}
export function normalizeSynapse(value,now=Date.now()){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('memory_note_invalid');
 const id=max(value.id,110),text=max(value.text,1801);
 const repository=max(value.repository,140),source=max(value.source,32)||'owner_note';
 const sessionId=max(value.sessionId,100),messageId=max(value.messageId,100);
 const at=value.at??now;
 if(!safeId(id)||!text||text.length>1800||
    (repository&&!/^www-infinity4\/[a-zA-Z0-9_.-]{1,100}$/.test(repository))||
    !['owner_note','chat_import','repository_reference'].includes(source)||
    (sessionId&&!safeId(sessionId))||(messageId&&!safeId(messageId))||
    !Number.isSafeInteger(at)||at<946684800000||at>now+300000)throw Error('memory_note_invalid');
 const namespace=routeNamespace(repository,value.topic);
 const related=Array.isArray(value.relatedTo)?value.relatedTo:[];
 if(related.length>8||related.some(x=>!safeId(x)||x===id))throw Error('memory_links_invalid');
 return {id,text,repository,source,sessionId,messageId,at,
  topic:namespace.topic,basis:namespace.basis,
  relatedTo:[...new Set(related)]};
}
export function recallSynapses(nodes,query='',limit=8){
 const words=tokenize(query),cap=Math.max(1,Math.min(20,Number(limit)||8));
 const scored=(Array.isArray(nodes)?nodes:[]).map(n=>{
  const content=String(n.text||'').toLowerCase(),repo=String(n.repository||'').toLowerCase(),
   subject=String(n.topic||'').toLowerCase(),tags=new Set(tokenize(content));
  let score=words.reduce((total,w)=>total+(tags.has(w)?4:content.includes(w)?2:repo.includes(w)?3:subject.includes(w)?3:0),0);
  if(!words.length)score=1;
  return {...n,score,relatedTo:Array.isArray(n.relatedTo)?n.relatedTo:[]};
 }).filter(n=>n.score>0).sort((a,b)=>b.score-a.score||b.at-a.at).slice(0,cap);
 // Link neighbors are resolved only among owner-scoped rows already fetched.
 // A cross-owner ID never appears because the caller query is owner-filtered.
 const byId=new Map((Array.isArray(nodes)?nodes:[]).map(n=>[n.id,n]));
 return scored.map(node=>({...node,neighbors:node.relatedTo
  .filter(id=>byId.has(id)).slice(0,4).map(id=>{
   const n=byId.get(id);return {id,topic:n.topic,repository:n.repository,excerpt:String(n.text||'').slice(0,160)};
  })}));
}
