// Observed first-party views are hints, never write authority or source proof.
const KEY='bubbles:observed-project-views:v1';
const clean=s=>String(s||'').replace(/[\x00-\x1f]/g,' ').trim().slice(0,160);
const stop=new Set('a an the my our your this that it here page card cards repo repository repositories github fix repair update add ads advertisement advertisements search find fill populate build create implement fetch dataset data api from for with and to in on of is was just please want need i you can could should he she bubbles work working code source file files all more next previous current fill stop stopped where when every time product full make get use using improve improve expand complete gather proper properly real actual'.split(' '));
export function discoveryTerms(request){return [...new Set(String(request||'').slice(0,2500).toLowerCase().match(/[a-z][a-z0-9-]{2,}/g)||[])].filter(w=>!stop.has(w)).slice(0,4);}
export function recordProjectView(view,storage=globalThis.localStorage,now=Date.now()){
 try{
  const url=new URL(view.url,globalThis.location?.origin||'https://quantaphi.org');
  if(!['quantaphi.org','www.quantaphi.org'].includes(url.hostname)||url.protocol!=='https:')return;
  const item={title:clean(view.title),cardId:clean(view.cardId),url:url.origin+url.pathname,observedAt:now};
  const old=JSON.parse(storage.getItem(KEY)||'[]');
  storage.setItem(KEY,JSON.stringify([item,...(Array.isArray(old)?old:[]).filter(x=>x.cardId!==item.cardId)].slice(0,8)));
 }catch{}
}
export function relevantProjectViews(request,storage=globalThis.localStorage,now=Date.now()){
 try{
  const rows=JSON.parse(storage.getItem(KEY)||'[]');if(!Array.isArray(rows))return [];
  const terms=discoveryTerms(request),relative=/\b(?:this|that|current|previous|last)\s+(?:page|card|project)|\b(?:it|here)\b/i.test(request);
  return rows.filter(x=>Number.isFinite(x.observedAt)&&now-x.observedAt>=0&&now-x.observedAt<30*60*1000&&
   (terms.some(t=>(x.title+' '+x.cardId).toLowerCase().includes(t))||(!terms.length&&relative)))
   .slice(0,3).map(x=>({title:clean(x.title),cardId:clean(x.cardId),url:clean(x.url),observedAt:x.observedAt}));
 }catch{return []}
}
// A card's registered title/aliases are evidence of which project the owner
// means, not permission to edit it. Prefer the longest named match.
import {cards} from './bubbles-card-catalog.mjs';
const normalized=s=>' '+String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim()+' ';
export function namedCardFor(request){
 const q=normalized(request);
 const possible=cards.flatMap(card=>[card.title,card.id,...(card.aliases||[])]
  .map(alias=>({card,alias:normalized(alias).trim()}))
  .filter(item=>item.alias.length>=5&&q.includes(' '+item.alias+' ')));
 possible.sort((a,b)=>b.alias.length-a.alias.length);
 return possible[0]?.card||null;
}
// Use recent owner conversation to resolve "fix that card" without making the
// user repeat a repository name. This lookup never authorizes a write.
export function sourceQueryFor(request,history=[]){
 const q=String(request||'').trim();
 if(discoveryTerms(q).length||!/\b(?:it|that|this|card|one|thing)\b/i.test(q))return q;
 for(const row of (Array.isArray(history)?history:[]).slice(-8).reverse()){
  if(row?.role!=='user'||typeof row.text!=='string')continue;
  const card=namedCardFor(row.text);
  if(card)return q+' '+card.title;
 }
 return q;
}
// A named card can be a direct engineering target even when the owner does
// not mention GitHub, repository, source, code, or the word "card".
export function cardWorkTargetFor(request,history=[]){
 const q=String(request||'').trim().slice(0,2400);
 if(!q||/^(?:(?:please|bubbles)[,\s]+)*(?:do\s+not|don't|never|how|why|what|explain|describe)\b/i.test(q))return null;
 const direct=/^(?:(?:please|hey\s+bubbles|bubbles)[,\s:]+)*(?:(?:can|could|would|will)\s+you\s+)?(?:fix|repair|restore|debug|update|upgrade|rebuild|build|implement|improve|redesign|correct|replace|wire|connect|finish)\b/i.test(q);
 const directive=/^(?:(?:please|bubbles)[,\s:]+)*(?:i\s+(?:need|want)\s+(?:you|bubbles)\s+to|we\s+need\s+(?:you|bubbles)\s+to|you\s+(?:need|have)\s+to)\b/i.test(q)&&
  /\b(?:fix|repair|restore|debug|update|upgrade|rebuild|build|implement|improve|redesign|correct|replace|wire|connect|finish)\b/i.test(q);
 if(!direct&&!directive)return null;
 return namedCardFor(sourceQueryFor(q,history));
}
function rankSource(hit,terms,expected){
 const path=String(hit.path||'').toLowerCase(),excerpt=String(hit.excerpt||'').toLowerCase();
 const joined=path+' '+excerpt;
 const hits=terms.filter(t=>joined.includes(t));
 if(!hits.length)return null;
 const pathHits=terms.filter(t=>path.includes(t)).length;
 const score=hits.length*12+pathHits*5+
  (/\bcard\b|card[.\-_]/.test(path)?4:0)+
  (expected?.repository===hit.repository?24:0);
 return {...hit,score,termHits:hits.length};
}
export async function discoverProject({request,catalog=null,views=[],invoke}){
 // A complete 448-repository inventory is NOT a prerequisite for source discovery.
 // Authenticated owner code search is read-only; actual files are pinned below.
 const allowed=Array.isArray(catalog)?new Set(catalog.map(x=>typeof x==='string'?x:x.repository)):null;
 let terms=discoveryTerms(request);
 if(!terms.length&&views.length)terms=discoveryTerms(views[0].title).slice(0,1);
 if(!terms.length)return null;
 // Multi-word GitHub code searches can return zero despite an indexed file
 // containing the project's proper name. Retry narrower, bounded queries.
 const queries=[...new Set([terms.join(' '),terms.slice(0,2).join(' '),terms.length>1?terms[1]:terms[0]])].filter(Boolean).slice(0,3);
 const expected=namedCardFor(request);
 for(const query of queries){
  let result;
  try{result=await invoke({action:'search_github_code',scope:'owner',mode:'read',query})}
  catch{continue}
  if(!result?.ok||result.status!=='code_search_results')continue;
  const matches=(result.results||[]).filter(x=>
   /^www-infinity4\/[A-Za-z0-9_.-]+$/.test(x.repository||'')&&
   (!allowed||allowed.has(x.repository))&&
   !/(?:^|\/)(?:tests?|docs?|work-tickets|\.github)(?:\/|$)/i.test(x.path||'')&&
   /\.(?:m?js|cjs|tsx?|jsx|html|css|json)$/i.test(x.path||''))
   .map(x=>rankSource(x,terms,expected)).filter(Boolean)
   .sort((a,b)=>b.score-a.score||a.repository.localeCompare(b.repository)||a.path.localeCompare(b.path));
  if(!matches.length)continue;
  // Equal-strength hits across projects are insufficient to authorize routing.
  const top=matches[0],otherRepo=matches.find(x=>x.repository!==top.repository);
  if(otherRepo&&top.score-otherRepo.score<6)continue;
  let repo;
  try{repo=await invoke({action:'read_repository',mode:'read',repository:top.repository})}
  catch{continue}
  if(!repo?.ok||!/^([a-f0-9]{40})$/.test(repo.headSha||''))continue;
  for(const candidate of matches.filter(x=>x.repository===top.repository).slice(0,3)){
   let file;
   try{file=await invoke({action:'read_file',mode:'read',repository:candidate.repository,path:candidate.path,ref:repo.headSha})}
   catch{continue}
   if(!file?.ok||file.exists===false||!file.sha)continue;
   const content=String(file.content||'').toLowerCase();
   const actual=terms.filter(t=>content.includes(t));
   if(actual.length<Math.min(2,terms.length))continue;
   return {repository:candidate.repository,path:candidate.path,sha:file.sha,source:'verified-code-search-and-file-read',
    card:expected?.repository===candidate.repository?expected.id:null,
    views:views.slice(0,3),writeAuthorized:false};
  }
 }
 return null;
}
export function hasActionDraft(text){
 return /["']action["']\s*:\s*["'](?:read_repo|read_repository|read_file|search|web_search|commit_files|create_pr|deploy)["'][\s\S]{0,1000}["']parameters["']\s*:/i.test(String(text||''));
}
