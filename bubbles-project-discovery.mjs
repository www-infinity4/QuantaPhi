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
export async function discoverProject({request,catalog,views=[],invoke}){
 const allowed=new Set(catalog.map(x=>typeof x==='string'?x:x.repository));
 let terms=discoveryTerms(request);
 if(!terms.length&&views.length)terms=discoveryTerms(views[0].title).slice(0,1);
 if(!terms.length)return null;
 const result=await invoke({action:'search_github_code',scope:'owner',mode:'read',query:terms.join(' ')});
 if(!result.ok||result.status!=='code_search_results')return null;
 const matches=(result.results||[]).filter(x=>allowed.has(x.repository)&&
  !/(?:^|\/)(?:tests?|docs?|work-tickets|\.github)(?:\/|$)/i.test(x.path||'')&&
  /\.(?:m?js|cjs|tsx?|jsx|html|css|json)$/i.test(x.path||'')&&
  terms.some(t=>(x.path+' '+(x.excerpt||'')).toLowerCase().includes(t)));
 const repos=[...new Set(matches.map(x=>x.repository))];
 // One observed source target is required. Page history cannot break a tie
 // between two real repositories or override an explicit manual selection.
 if(repos.length!==1)return null;
 const candidate=matches[0];
 const repo=await invoke({action:'read_repository',mode:'read',repository:candidate.repository});
 if(!repo.ok||!/^([a-f0-9]{40})$/.test(repo.headSha||''))return null;
 const file=await invoke({action:'read_file',mode:'read',repository:candidate.repository,path:candidate.path,ref:repo.headSha});
 if(!file.ok||file.exists===false||!file.sha||!terms.some(t=>String(file.content||'').toLowerCase().includes(t)))return null;
 return {repository:candidate.repository,path:candidate.path,sha:file.sha,source:'verified-code-search-and-file-read',
  views:views.slice(0,3),writeAuthorized:false};
}
export function hasActionDraft(text){
 return /["']action["']\s*:\s*["'](?:read_repo|read_repository|read_file|search|web_search|commit_files|create_pr|deploy)["'][\s\S]{0,1000}["']parameters["']\s*:/i.test(String(text||''));
}
