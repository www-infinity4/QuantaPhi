// QuantaPhi coin media: opted-in playback from original YouTube publishers.
const STORAGE='infinity-coin-media-prefs:v2';
const KINDS=['music','movies','science'];
// Partition private viewing preferences by the selected StarQuest account on this
// device. Do not copy credentials, wallet IDs, personal titles or API tokens into
// the media settings or send the selected account to YouTube.
export function preferenceKey(){
 let username='';
 try{username=String(window.ControlPhi?.wallet?.()?.username||'').trim()}catch{}
 if(!username||username.toLowerCase()==='guest'){
  try{const session=JSON.parse(localStorage.getItem('starquest_session')||'null');username=String(session?.username||'').trim()}catch{}
 }
 if(!username||username.toLowerCase()==='guest')return STORAGE+':anonymous-device';
 const name=username.toLowerCase(),bytes=new TextEncoder().encode(name);
 let hash=2166136261;
 for(const byte of bytes){hash^=byte;hash=Math.imul(hash,16777619)}
 return STORAGE+':account-'+(hash>>>0).toString(36);
}
const read=()=>{try{const x=JSON.parse(localStorage.getItem(preferenceKey())||'{}');return x&&typeof x==='object'?x:{}}catch{return {}}};
const save=x=>{try{localStorage.setItem(preferenceKey(),JSON.stringify(x))}catch{}};
export function orderCoinMedia(items,{kind='music',seen=[],query=''}={}){
 const text=String(query).trim().toLowerCase();
 const seenSet=new Set(seen);
 return [...new Map((Array.isArray(items)?items:[]).filter(item=>
  item&&/^[A-Za-z0-9_-]{11}$/.test(item.id)&&KINDS.includes(item.kind)&&
  (kind==='all'||item.kind===kind)&&(!text||String(item.title).toLowerCase().includes(text))
 ).map(item=>[item.id,item])).values()].sort((a,b)=>{
  const aSeen=seenSet.has(a.id)?1:0,bSeen=seenSet.has(b.id)?1:0;
  if(aSeen!==bSeen)return aSeen-bSeen;
  const da=Date.parse(a.published)||0,db=Date.parse(b.published)||0;
  return db-da||a.id.localeCompare(b.id);
 });
}
export function youtubeSearchLink(query,kind){
 const extra={music:'official music video',movies:'official movie trailer free movies',science:'documentary science'};
 return 'https://www.youtube.com/results?search_query='+encodeURIComponent([String(query||'').trim().slice(0,100),extra[kind]||''].filter(Boolean).join(' '));
}
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const yt=id=>'https://www.youtube.com/watch?v='+id;
function mount(root){
 const coin=root.closest('[data-coin]')?.dataset.coin||'alien-coin';
 const saved=read(),prefs=saved[coin]||{};
 const heading=el('h3','coin-media-head','Movies & music · YouTube discovery');
 const explanation=el('p','coin-media-explain','Select your interests. Recent publisher uploads appear where available; search opens YouTube’s complete current results. No video or audio is copied or stored by Infinity.');
 const tools=el('div','coin-media-controls');
 const select=el('select','coin-media-select');select.setAttribute('aria-label','Media interest');
 for(const [value,name] of [['music','Music'],['movies','Movies & trailers'],['science','Science & documentaries']]){const option=el('option','',name);option.value=value;select.append(option)}
 select.value=KINDS.includes(prefs.kind)?prefs.kind:'music';
 const input=el('input','coin-media-query');input.type='search';input.maxLength=100;input.placeholder='Artist, film, topic…';input.setAttribute('aria-label','YouTube media topic');
 const find=el('a','coin-media-search','Search all of YouTube');find.target='_blank';find.rel='noopener noreferrer';
 const next=el('button','coin-media-next','Next unseen video');next.type='button';
 const clear=el('button','coin-media-next','Clear watched history');clear.type='button';
 const freeMovies=el('a','coin-media-search','Free movies on YouTube');freeMovies.href='https://www.youtube.com/movies';freeMovies.target='_blank';freeMovies.rel='noopener noreferrer';
 tools.append(select,input,find,next,freeMovies,clear);
 const status=el('p','coin-media-status','Loading public media sources…');status.setAttribute('role','status');
 const list=el('div','coin-media-results'),player=el('div','coin-media-player');
 const foot=el('p','coin-media-explain','Source links and the official YouTube player govern playback. A movie trailer is not a full movie; full films depend on the provider’s rights and availability.');
 root.append(heading,explanation,tools,status,list,player,foot);
 let items=[],state='loading',cursor=0,version=0;
 const track=()=>{const all=read(),p=all[coin]||{};p.kind=select.value;all[coin]=p;save(all)};
 const recent=()=>{const all=read();return Array.isArray(all[coin]?.seen)?all[coin].seen:[]};
 const remember=id=>{const all=read(),p=all[coin]||{};p.kind=select.value;p.seen=[id,...(Array.isArray(p.seen)?p.seen:[]).filter(x=>x!==id)].slice(0,80);all[coin]=p;save(all)};
 const show=item=>{
  remember(item.id);player.replaceChildren();
  const caption=el('p','','YouTube · '+item.channel+' · '+item.title);
  const frame=el('iframe','coin-media-frame');
  frame.src='https://www.youtube-nocookie.com/embed/'+item.id+'?playsinline=1&rel=0&autoplay=1';
  frame.title='YouTube video: '+item.title;frame.loading='eager';frame.allow='encrypted-media; picture-in-picture; fullscreen; autoplay';
  frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';
  const external=el('a','coin-media-search','Watch on YouTube if playback is blocked');
  external.href=yt(item.id);external.target='_blank';external.rel='noopener noreferrer';
  player.append(caption,frame,external);
  render();
 };
 const render=()=>{
  const kind=select.value,query=input.value.trim(),seen=recent();
  find.href=youtubeSearchLink(query,kind);
  freeMovies.hidden=kind!=='movies';
  const matches=orderCoinMedia(items,{kind,seen,query});
  const total=orderCoinMedia(items,{kind,seen:[],query}).length;
  list.replaceChildren();
  if(state==='error')status.textContent='Live source feed unavailable. Use Search all of YouTube; no catalog is being invented.';
  else if(!total)status.textContent=query?'No matching upload in the limited recent pool. Search all of YouTube for more.':
    'No recent uploads in this category. Search all of YouTube for current options.';
  else status.textContent=total+' real sourced video'+(total===1?'':'s')+' in this recent pool · '+matches.filter(x=>!seen.includes(x.id)).length+' not yet opened on this device'+(state==='partial'?' · some publisher feeds unavailable':'')+'.';
  for(const item of matches.slice(0,5)){
   const button=el('button','coin-media-choice');button.type='button';
   const thumb=el('img','coin-media-thumbnail');thumb.src='https://i.ytimg.com/vi/'+item.id+'/mqdefault.jpg';thumb.alt='';thumb.loading='lazy';
   const detail=el('span','');detail.append(el('strong','',item.title),el('small','',item.channel+' · '+(item.kind==='movies'?'Trailer roundup':item.kind)));
   button.append(thumb,detail);button.addEventListener('click',()=>show(item));list.append(button);
  }
  next.disabled=!matches.length;
 };
 const load=async()=>{
  const current=++version;state='loading';render();
  try{
   const response=await fetch('/api/infinity-coin-media?kind=all',{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(9000)});
   if(!response.ok)throw Error('HTTP '+response.status);
   const data=await response.json();
   if(!data?.ok||!Array.isArray(data.items))throw Error('invalid_catalog');
   if(version!==current)return;
   items=data.items;state=data.partial?'partial':'ready';render();
  }catch{if(current!==version)return;state='error';items=[];render()}
 };
 select.addEventListener('change',()=>{track();cursor=0;player.replaceChildren();render()});
 // Switching account in place must never display the former account's choices.
 document.addEventListener('starquest:auth-changed',()=>{
  const selected=read()[coin]||{};select.value=KINDS.includes(selected.kind)?selected.kind:'music';
  input.value='';cursor=0;player.replaceChildren();render();
 });
 clear.addEventListener('click',()=>{const all=read(),p=all[coin]||{};p.seen=[];all[coin]=p;save(all);cursor=0;render()});
 input.addEventListener('input',()=>{cursor=0;render()});
 next.addEventListener('click',()=>{
  const selected=orderCoinMedia(items,{kind:select.value,seen:recent(),query:input.value.trim()});
  if(!selected.length)return;
  // The first unseen clip is preferred. Once exhausted, revisit publisher uploads.
  const choice=selected.find(item=>!recent().includes(item.id))||selected[cursor++%selected.length];
  show(choice);
 });
 render();void load();
}
export function mountCoinMedia(){for(const root of document.querySelectorAll('[data-coin-media]'))mount(root)}
if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountCoinMedia,{once:true});else mountCoinMedia()}
