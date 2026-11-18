/* ASTEROID RADIO · Media Star host card. Read-only public curated D1, static verified-source fallback.
 * Provider controls all playback. An indexed link never proves working audio.
 */
import {normalizeAsteroidCatalog,chooseNextAsteroid} from './asteroid-spaces-model.mjs';
const root=document.getElementById('asteroidSpacesRadio');
if(root){
 const endpoint='https://media-star-following-spaces.marvaseater.workers.dev/v1/curated/asteroid';
 const index='/asteroid-spaces-index.json',storage='phi:asteroid-spaces-seen:v1';
 const state={episodes:[],currentId:null,seen:[],search:'',loading:true,source:'',notice:''};
 try{const saved=JSON.parse(localStorage.getItem(storage)||'[]');if(Array.isArray(saved))state.seen=saved.filter(x=>typeof x==='string').slice(-1000);}catch{}
 const element=(tag,cls,value)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(value!==undefined)node.textContent=value;
  return node;
 };
 const card=element('article','as-card'),label=element('p','as-label','MEDIA STAR · ORIGINAL X SPACES');
 const title=element('h2','', 'ASTEROID RADIO 🍎');
 const host=element('p','as-note','@A5T3R0lD · Indexed public broadcasts and original X links');
 const counter=element('p','as-info','Loading the index…');
 const input=element('input','as-search');
 input.type='search';input.placeholder='Search indexed Space titles';input.setAttribute('aria-label','Search ASTEROID RADIO X Spaces');
 const view=element('div','as-episode');view.setAttribute('aria-live','polite');
 const buttons=element('div','as-controls');
 const next=element('button','as-btn','⤨ Next Space'),reload=element('button','as-btn','↻ Refresh');
 next.type='button';reload.type='button';
 buttons.append(next,reload);
 const status=element('p','as-status','');status.setAttribute('role','status');
 const foot=element('div','as-foot');
 for(const [text,url] of [
  ['ASTEROID RADIO on X','https://x.com/A5T3R0lD'],
  ['Public archive index','https://www.twitterspacegpt.com/zh/hosts/A5T3R0lD'],
  ['Submitted X post','https://x.com/A5T3R0lD/status/2123131588548387160']
 ]){
  const link=element('a','',text+' ↗');link.href=url;link.target='_blank';link.rel='noopener noreferrer';foot.append(link);
 }
 const disclaimer=element('p','as-note','Source links only. X controls playback and sign-in. Indexed does not mean audio verified, live now, or a complete archive. No StarCoin is charged.');
 card.append(label,title,host,counter,input,view,buttons,status,foot,disclaimer);
 root.replaceChildren(card);
 function visible(){
  const term=state.search.toLowerCase();
  return state.episodes.filter(e=>(e.title+' '+e.date).toLowerCase().includes(term));
 }
 function saveSeen(){
  try{localStorage.setItem(storage,JSON.stringify(state.seen.slice(-1000)));}catch{}
 }
 function render(){
  const list=visible(),current=list.find(e=>e.id===state.currentId)||list[0]||null;
  if(current)state.currentId=current.id;
  counter.textContent=state.loading?'Loading public catalog…':list.length+' of '+state.episodes.length+' indexed X Space'+(state.episodes.length===1?'':'s')+' · '+state.source;
  view.replaceChildren();
  if(current){
   view.append(element('p','as-state',current.availability==='verified_replay'?'Replay catalog marked verified · audio untested':'Original X link indexed · audio untested'),
    element('h3','as-title',current.title),
    element('p','as-meta',[current.date,current.duration].filter(Boolean).join(' · ')||'Original X Space'));
   const play=element('a','as-link as-play','▶ Open original X Space ↗');
   play.href=current.source;play.rel='noopener noreferrer';play.target='_blank';
   view.append(play);
  }else{
   view.append(element('p','as-note',state.loading?'Checking original catalog sources…':state.episodes.length?'No matches for this search.':'No verified original X Spaces indexed yet.'));
  }
  next.disabled=state.loading||list.length<2;
  reload.disabled=state.loading;
  status.textContent=state.notice;
 }
 function nextEpisode(){
  const list=visible();if(!list.length)return;
  const value=new Uint32Array(1);crypto.getRandomValues(value);
  const next=chooseNextAsteroid(list,state.currentId,[...state.seen,state.currentId],value[0]);
  if(!next)return;
  state.currentId=next.id;
  if(state.seen.length>=list.length){state.seen=[];}
  if(!state.seen.includes(next.id))state.seen.push(next.id);
  saveSeen();render();
 }
 input.addEventListener('input',()=>{state.search=input.value.trim().slice(0,100);render();});
 next.addEventListener('click',nextEpisode);
 reload.addEventListener('click',()=>void refresh());
 async function refresh(){
  state.loading=true;state.notice='';render();
  let items=[],label='';
  try{
   const response=await fetch(endpoint,{cache:'no-store'});
   if(!response.ok)throw Error('catalog unavailable');
   const body=await response.json();
   if(!body||!Array.isArray(body.episodes))throw Error('invalid catalog');
   items=normalizeAsteroidCatalog(body.episodes);
   if(items.length)label='Media Star public D1 index';
  }catch{}
  if(!items.length){
   try{
    const response=await fetch(index,{cache:'no-store'});
    if(!response.ok)throw Error('source index unavailable');
    const body=await response.json();
    if(body.handle!=='A5T3R0lD'||!Array.isArray(body.episodes))throw Error('invalid fallback');
    items=normalizeAsteroidCatalog(body.episodes);
    if(items.length)label='source-backed fallback';
   }catch{}
  }
  state.episodes=items;state.source=label||'no catalog available';
  state.currentId=items.some(x=>x.id===state.currentId)?state.currentId:(items[0]?.id||null);
  state.notice=!items.length?'No verified catalog rows returned. No recordings invented.':label==='source-backed fallback'?'Public database not available yet; showing the verified source file.':'Indexed source links loaded; playback has not been verified.';
  state.loading=false;render();
 }
 render();void refresh();
}
