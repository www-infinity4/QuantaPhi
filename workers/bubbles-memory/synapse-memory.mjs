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
// A deliberately small, inspectable dictionary: aliases suggest retrieval,
// not truth, intent, ownership, or authority to act.
const STOPWORDS=new Set([
 'about','after','again','been','before','could','did','does','from','have',
 'hello','here','into','just','know','last','like','memory','mine','more',
 'much','note','notes','please','remember','said','show','some','tell',
 'that','them','there','these','this','those','what','when','where','which',
 'with','would','your','you','the','and','for','are','was','why','how'
]);
const CONCEPTS=Object.freeze({
 radio:['radio','radyo','radios','receiver','receivers','transmitter','transmitters',
  'antenna','antennas','broadcast','tuner','tuners','frequency','frequencies'],
 electronics:['electronics','electronic','electrinics','circuit','circuits',
  'capacitor','capacitors','resistor','resistors','inductance'],
 programming:['programming','program','code','coding','software','syntax','grammarphi',
  'quantaphi','repository','repositories'],
 music:['music','musical','songs','song','playlist','playlists','audio'],
 wallet:['wallet','wallets','starcoin','starcoins','tokens','ledger'],
 hydrogen:['hydrogen','hydrogem','h2']
});
const CONCEPT_BY_WORD=new Map(Object.entries(CONCEPTS)
 .flatMap(([concept,terms])=>terms.map(term=>[term,concept])));
function boundedDistance(a,b,maxDistance){
 if(Math.abs(a.length-b.length)>maxDistance)return maxDistance+1;
 let previous=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){
  const row=[i];let minimum=i;
  for(let j=1;j<=b.length;j++){
   row[j]=Math.min(previous[j]+1,row[j-1]+1,
    previous[j-1]+(a[i-1]===b[j-1]?0:1));
   minimum=Math.min(minimum,row[j]);
  }
  if(minimum>maxDistance)return maxDistance+1;
  previous=row;
 }
 return previous[b.length];
}
function retrieveMatch(word,textTerms,repoTerms,topicTerms){
 if(textTerms.has(word))return {strength:8,kind:'exact'};
 if(repoTerms.has(word))return {strength:6,kind:'repository'};
 if(topicTerms.has(word))return {strength:5,kind:'topic'};
 const concept=CONCEPT_BY_WORD.get(word);
 if(concept&&[...textTerms,...repoTerms,...topicTerms].some(w=>
  CONCEPT_BY_WORD.get(w)===concept))return {strength:4,kind:'related'};
 if(word.length>=5){
  const distance=word.length>=10?2:1;
  if([...textTerms,...repoTerms,...topicTerms].some(w=>
   w.length>=5&&Math.abs(word.length-w.length)<=distance&&
   boundedDistance(word,w,distance)<=distance))
   return {strength:2,kind:'typo'};
 }
 return null;
}
export function recallSynapses(nodes,query='',limit=8){
 const cap=Math.max(1,Math.min(20,Number(limit)||8));
 const ownerRows=Array.isArray(nodes)?nodes:[];
 const originalWords=tokenize(query).filter(w=>!STOPWORDS.has(w)).slice(0,16);
 // Saved owner definitions expand retrieval, never action authorization.
 const definitions=new Map();
 for(const note of [...ownerRows].sort((a,b)=>(a.at||0)-(b.at||0))){
  if(note.source!=='owner_note')continue;
  const match=/^when I say ["“]?([a-z][a-z0-9-]{2,29})["”]?,? I mean\s+(.{3,160})[.!]?$/i.exec(String(note.text||'').trim());
  if(match)definitions.set(match[1].toLowerCase(),{sourceId:note.id,meaning:match[2]});
 }
 const aliasReferences=originalWords.filter(word=>definitions.has(word)).map(term=>({term,...definitions.get(term)}));
 const words=[...new Set([...originalWords,...aliasReferences.flatMap(ref=>tokenize(ref.meaning).filter(w=>!STOPWORDS.has(w)))])].slice(0,24);
 const scored=ownerRows.map(n=>{
  const textTerms=new Set(tokenize(n.text));
  const repoTerms=new Set(tokenize(n.repository));
  const topicTerms=new Set(tokenize(String(n.topic||'').replace(/_/g,' ')));
  const matchedBy=[],matchedTerms=[];
  let score=0;
  for(const word of words){
   const match=retrieveMatch(word,textTerms,repoTerms,topicTerms);
   if(match){score+=match.strength;matchedBy.push(match.kind);matchedTerms.push(word)}
  }
  if(!words.length)score=1; // Empty/stop-word-only search returns recent notes.
  return {...n,score,aliasReferences,matchedBy:[...new Set(matchedBy)],matchedTerms,
   relatedTo:Array.isArray(n.relatedTo)?n.relatedTo:[]};
 }).filter(n=>n.score>0).sort((a,b)=>b.score-a.score||b.at-a.at).slice(0,cap);
 // Only rows previously fetched using an authenticated owner filter may resolve
 // linked IDs. Invented words never acquire definitions that are not in a note.
 const byId=new Map(ownerRows.map(n=>[n.id,n]));
 return scored.map(node=>({...node,neighbors:node.relatedTo
  .filter(id=>byId.has(id)).slice(0,4).map(id=>{
   const n=byId.get(id);return {id,topic:n.topic,repository:n.repository,
    excerpt:String(n.text||'').slice(0,160)};
  })}));
}
