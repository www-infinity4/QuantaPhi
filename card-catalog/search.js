(()=>{'use strict';
const $=id=>document.getElementById(id),params=new URLSearchParams(location.search);
const allowedModes=new Set(['quanta-style','overview-first','image-first','links-only']);
const mode=allowedModes.has(params.get('mode'))?params.get('mode'):'quanta-style';
const isViewer=params.get('viewer')==='true',parent=params.get('parent')||'';
const ownerOrigin=(()=>{try{const u=new URL(parent);return u.protocol==='https:'||u.hostname==='localhost'?u.origin:''}catch{return''}})();
const title=String(params.get('title')||'My Search').replace(/\s+/g,' ').trim().slice(0,60);
$('title').textContent=title;$('subtitle').textContent=mode==='image-first'?'Images first · inspect visual sources':mode==='links-only'?'Research links without an AI summary':mode==='overview-first'?'Overview and evidence first':'AI overview, images, and source trails';
$('resultHeading').textContent=mode==='image-first'?'Visual sources':'Research sources';
const API='https://orange-brook-a2ac.marvaseater.workers.dev/search';
const AI='https://infinity-rogers.marvaseater.workers.dev/v1/chat';
const validUrl=raw=>{try{const u=new URL(raw);return ['https:','http:'].includes(u.protocol)?u.href:''}catch{return''}};
let run=0,controller=null;
function el(tag,cls,txt){const x=document.createElement(tag);if(cls)x.className=cls;if(txt!==undefined)x.textContent=txt;return x}
function signal(action,detail={}){
 if(!ownerOrigin||window.parent===window)return;
 window.parent.postMessage({type:'phi:research:'+action,query:$('query').value.trim().slice(0,200),...detail},ownerOrigin);
}
function sourceViewer(item){
 const url=validUrl(item.url);if(!url)return;
 $('reader').hidden=false;$('viewerTitle').textContent=(item.title||'Source').slice(0,120);
 $('sourceLink').href=url;$('sourceLink').textContent='Open original source ↗';
 if(isViewer||item.preview===true)$('frame').src=url;else $('frame').removeAttribute('src');
 signal('click',{title:String(item.title||'').slice(0,120),url});
 $('reader').scrollIntoView?.({behavior:'smooth',block:'nearest'});
}
$('close').addEventListener('click',()=>{$('reader').hidden=true;$('frame').removeAttribute('src')});
function card(item,visual){
 const box=el('article','result'),url=validUrl(item.url),title=String(item.title||'Source').slice(0,180);
 const h=el('h3'),link=el('a','',title||url);
 link.href=url;link.target='_blank';link.rel='noopener noreferrer';
 if(visual){
  const src=validUrl(item.img_src||item.thumbnail_src||item.thumbnail||'');
  if(src){const image=el('img');image.src=src;image.alt=title;image.loading='lazy';image.referrerPolicy='no-referrer';box.append(image)}
 }
 h.append(link);box.append(h);
 if(!visual)box.append(el('p','',String(item.content||item.description||'').replace(/\s+/g,' ').slice(0,400)));
 if(url){box.append(el('small','',new URL(url).hostname));const view=el('button','','View inside card');view.type='button';view.addEventListener('click',()=>sourceViewer(item));box.append(view);
 link.addEventListener('click',()=>signal('click',{title,url}))}
 return box;
}
function extract(json){
 let v=json?.output_text??json?.output??json?.response??json?.answer??json?.content??json?.message??'';
 if(Array.isArray(v))v=v.map(x=>typeof x==='string'?x:x?.text||'').join(' ');
 if(v&&typeof v==='object')v=v.text||'';
 return String(v||'').trim().slice(0,2400);
}
async function overview(q,items,current,signalAbort){
 if(mode==='links-only'||mode==='image-first')return;
 $('overview').hidden=false;$('overviewBody').replaceChildren(el('p','','Reviewing retrieved sources…'));
 const evidence=items.slice(0,5).map((s,i)=>[i+1,String(s.title||'').slice(0,120),String(s.content||'').slice(0,260),validUrl(s.url)].join(' · ')).join('\n');
 if(!evidence){$('overviewBody').textContent='No source evidence was retrieved. An AI overview was not generated.';return}
 const prompt='Research topic: '+q+'\nUse ONLY the source snippets that follow. Produce a short overview and distinguish gaps/uncertainty. Do not invent facts. Cite source numbers in the overview.\n'+evidence;
 try{const res=await fetch(AI,{method:'POST',headers:{'Content-Type':'application/json'},signal:signalAbort,body:JSON.stringify({input:prompt,context:{application:'Phi Card Catalog',task:'source-bounded-search-overview',requireCloudflare:true}})});
  const data=await res.json();if(current!==run)return;
  if(!res.ok||data.ok===false)throw Error('AI unavailable');
  $('overviewBody').textContent=extract(data)||'The AI did not return an overview. Sources are listed below.';
 }catch{if(current===run)$('overviewBody').textContent='AI overview unavailable. Verified search-source links remain below.'}
}
async function fetchResults(q,cat,signalAbort){
 const u=new URL(API);u.search=new URLSearchParams({q,format:'json',categories:cat,safesearch:'1'});
 const res=await fetch(u,{signal:signalAbort,cache:'no-store'});
 if(!res.ok)throw Error('Search service returned HTTP '+res.status);
 const json=await res.json();return(Array.isArray(json.results)?json.results:[])
  .filter(s=>s&&validUrl(s.url)).slice(0,24);
}
async function search(q){
 q=String(q||'').trim().slice(0,200);if(!q)return;
 controller?.abort();controller=new AbortController();const current=++run;
 $('query').value=q;$('state').textContent='Searching '+q+'…';
 $('results').replaceChildren();$('results').className=mode==='image-first'?'visual':'';
 $('overview').hidden=true;$('reader').hidden=true;$('frame').removeAttribute('src');
 signal('search',{mode});
 const timer=setTimeout(()=>controller.abort(),15000);
 try{
  const visual=mode==='image-first';
  let rows=await fetchResults(q,visual?'images':'general',controller.signal);
  if(visual&&!rows.length)rows=await fetchResults(q,'general',controller.signal);
  if(current!==run)return;
  for(const item of rows)$('results').append(card(item,visual));
  $('state').textContent=rows.length?rows.length+' real source results for '+q:'No search results available. Try another phrase.';
  if(!rows.length)$('results').append(el('p','', 'There are no matching sources in this response.'));
  if(!visual&&mode!=='links-only')void overview(q,rows,current,controller.signal);
 }catch(error){
  if(current!==run)return;
  $('state').textContent='The search service could not be reached. No results have been invented.';
  const a=el('a','','Continue the search on QuantaPhi ↗');a.href='https://quantaphi.org/?q='+encodeURIComponent(q);a.target='_blank';a.rel='noopener';$('results').replaceChildren(a);
 }finally{clearTimeout(timer)}
}
$('searchForm').addEventListener('submit',e=>{e.preventDefault();void search($('query').value)});
const initial=String(params.get('q')||'').slice(0,200);if(initial)void search(initial);
})();
