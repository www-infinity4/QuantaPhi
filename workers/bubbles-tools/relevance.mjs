/* Lexical relevance is a presentation hint, not verification or a trending feed.
 * Preserve every upstream source and its exact metadata; never invent results.
 */
const CONTEXT=new Set(['please','search','look','looking','lookup','find','for','about','the','and','a','an','of','in','on','with','what','is','are','new','emerging','latest','today','recent','trending','information','news','result','results','web','google','bubbles']);
const words=value=>String(value??'').slice(0,800).normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().match(/[a-z0-9]+/g)||[];

export function rankSearchResults(query,results){
 if(!Array.isArray(results))return [];
 const terms=[...new Set(words(query).filter(word=>word.length>=3&&!CONTEXT.has(word)))].slice(0,8);
 if(terms.length<2)return results.slice();
 const ranked=results.map((item,index)=>{
  const title=new Set(words(item?.title)),snippet=new Set(words(item?.snippet));
  const titleHits=terms.filter(term=>title.has(term)).length;
  const totalHits=terms.filter(term=>title.has(term)||snippet.has(term)).length;
  // An exact multi-term subject in a title is stronger than a trending
  // snippet. A mention in the body is still useful but weaker.
  const score=titleHits===terms.length?100+titleHits:
   totalHits===terms.length?50+titleHits:titleHits*5+totalHits;
  return {item,index,score,totalHits};
 });
 // If no returned source covers the subject, do not invent confidence or
 // reshuffle unrelated articles merely because they share a common word.
 if(!ranked.some(row=>row.totalHits===terms.length))return results.slice();
 ranked.sort((a,b)=>b.score-a.score||a.index-b.index);
 return ranked.map(row=>row.item);
}
