/**
 * QuantaPhi feed search assistance. Pure catalog-only logic: never fetches,
 * stores queries, submits forms, invokes AI, or invents live search results.
 * Existing public cards are the only source of suggestions.
 */
export function safeSearchSource(value){
 if(typeof value!=='string'||value.length>2048||/[\\\u0000-\u001f]/.test(value))return null;
 if(/^\/(?!\/)[a-zA-Z0-9/?#=&_.%\-]*$/.test(value))return value;
 try{
  const url=new URL(value);
  if(url.protocol!=='https:'||!url.hostname||url.username||url.password)return null;
  return url.href;
 }catch{return null;}
}
const normal=value=>typeof value==='string'?value.toLowerCase().trim().replace(/\s+/g,' ').slice(0,120):'';
export function suggestFeedSearch(cards,input,{limit=6}={}){
 const query=normal(input);
 if(query.length<2||!Array.isArray(cards))return [];
 const found=[],seen=new Set();
 for(let i=0;i<cards.length;i++){
  const card=cards[i],id=card?.id;
  // Autocomplete is public even when the signed-in owner can access a card.
  // Do not reveal private/unlisted/age-gated or unpublished catalog entries.
  if(!card||card.visibility!=null&&card.visibility!=='public'||
   card.adultOnly===true||card.ageRestricted===true||card.ownerOnly===true||
   card.private===true||card.restricted===true||card.published===false)continue;
  if(typeof id!=='string'||seen.has(id))continue;
  const sourceUrl=safeSearchSource(card.official)||safeSearchSource(card.url);
  if(!sourceUrl)continue;
  const name=typeof card.name==='string'?card.name.slice(0,140):'';
  const category=typeof card.category==='string'?card.category.slice(0,70):'';
  const fields=[name,category,card.feature,card.study].map(normal);
  const priority=fields[0].startsWith(query)?0:fields[0].includes(query)?1:
   fields[1].includes(query)?2:fields[2].includes(query)?3:fields[3].includes(query)?4:
   query.split(' ').every(term=>fields.some(field=>field.includes(term)))?5:-1;
  if(priority<0||!name)continue;
  seen.add(id);
  found.push({id,label:name,category:category||'Quick Card',sourceUrl,priority,index:i});
 }
 const max=Number.isSafeInteger(limit)?Math.max(1,Math.min(8,limit)):6;
 return found.sort((a,b)=>a.priority-b.priority||a.index-b.index).slice(0,max)
  .map(({id,label,category,sourceUrl})=>Object.freeze({id,label,category,sourceUrl}));
}
