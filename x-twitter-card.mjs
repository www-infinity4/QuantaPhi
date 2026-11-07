/* QuantaPhi X native Quick Card. Provider-confirmed data only; no fabricated feed or actions. */
const API='https://media-star-following-spaces.marvaseater.workers.dev';
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const append=(n,...children)=>{n.append(...children);return n};
const safeHandle=x=>/^[A-Za-z0-9_]{1,15}$/.test(String(x||''))?String(x):'';
export function parseXPostId(value){
 const raw=String(value||'').trim();
 if(/^[0-9]{1,22}$/.test(raw))return raw;
 try{
  const u=new URL(raw);
  if(u.protocol!=='https:'||!['x.com','www.x.com','twitter.com','www.twitter.com'].includes(u.hostname)||u.username||u.password)return null;
  const match=u.pathname.match(/^\/(?:[A-Za-z0-9_]{1,15}|i)\/status\/([0-9]{1,22})\/?$/);
  return match?match[1]:null;
 }catch{return null}
}
export function mountXTwitterCard(root){
 if(!root||typeof document==='undefined')return null;
 const initialPost=parseXPostId(new URLSearchParams(window.location.search).get('post'));
 const state={tab:initialPost?'post':'public',singleId:initialPost,single:null,connected:false,canPost:false,canLike:false,pending:false,posts:[],spaces:[],profile:null,archive:[],topic:'technology',updatedAt:null,notice:'Connect your QuantaPhi wallet and X account to load genuine posts.'};
 const card=el('article','xt-card'),head=el('header','xt-head'),title=el('h2','', '𝕏 · Twitter'),caption=el('p','xt-caption','Original X content, inside an Infinity card. No fake posts or likes.');
 const connect=el('a','xt-button xt-connect','Connect X · read & reply');connect.href='/connect-x?write=1';connect.setAttribute('aria-label','Connect your X account through QuantaPhi');
 const write=el('a','xt-button xt-write','Enable posting');write.href='/connect-x?write=1';
 const profile=el('button','xt-button xt-profile','Profile'),compose=el('button','xt-button xt-compose','Compose');profile.type=compose.type='button';
 append(head,append(el('div','xt-title'),title,caption),append(el('div','xt-head-actions'),profile,compose,connect,write));
 const tabs=el('nav','xt-tabs');tabs.setAttribute('aria-label','X card sections');tabs.setAttribute('role','tablist');
 const labels=[['public','Public'],['following','Following'],['post','One post'],['spaces','Live Spaces'],['archive','Saved Spaces'],['profile','Profile']];
 const tabButtons=new Map();
 for(const [id,label] of labels){const b=el('button','xt-tab',label);b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-selected',String(id===state.tab));b.addEventListener('click',()=>{state.tab=id;select();if(id==='post'&&!state.singleId){render();return}void load()});tabButtons.set(id,b);tabs.append(b)}
 const search=el('div','xt-search'),topic=el('input','xt-topic');topic.type='search';topic.value='technology';topic.maxLength=60;topic.placeholder='Topic on X';topic.setAttribute('aria-label','Search public X posts or live Spaces');
 const searchButton=el('button','xt-button','Search');searchButton.type='button';
 searchButton.addEventListener('click',()=>{state.topic=topic.value.trim();void load()});
 append(search,topic,searchButton);
 const postSearch=el('div','xt-search xt-post-search');
 const postInput=el('input','xt-topic');postInput.type='text';postInput.placeholder='Paste an X post URL or post ID';postInput.setAttribute('aria-label','X post URL or numeric ID');
 const readPost=el('button','xt-button','Read this post');readPost.type='button';
 append(postSearch,postInput,readPost);
 readPost.addEventListener('click',()=>{
  const id=parseXPostId(postInput.value);
  if(!id){status('Enter a valid X post URL or numeric post ID.');return}
  state.singleId=id;state.single=null;state.tab='post';select();void load();
 });
 postInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();readPost.click()}});
 if(initialPost)postInput.value=initialPost;
 const notice=el('p','xt-status');notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
 const fetched=el('small','xt-fetched');
 const timeline=el('div','xt-timeline');
 const refresh=el('button','xt-button xt-refresh','Refresh X data');refresh.type='button';refresh.addEventListener('click',()=>void load());
 const footer=append(el('footer','xt-footer'),fetched,refresh);
 const dialog=el('dialog','xt-dialog');dialog.setAttribute('aria-labelledby','xtDialogTitle');
 const dialogTitle=el('h3','', 'Compose on X'),dialogNote=el('p','xt-dialog-note','Your post is sent to X only after you press Send.');
 const textarea=el('textarea','xt-editor');textarea.maxLength=280;textarea.rows=5;textarea.placeholder="What's happening?";textarea.setAttribute('aria-label','Post text for X');
 const counter=el('small','xt-counter','0 / 280');
 const actions=el('div','xt-dialog-actions'),cancel=el('button','xt-button','Cancel'),send=el('button','xt-button xt-send','Send to X');cancel.type=send.type='button';
 const feedback=el('p','xt-feedback');feedback.setAttribute('role','status');
 append(actions,cancel,send);append(dialog,dialogTitle,dialogNote,textarea,counter,feedback,actions);
 append(card,head,postSearch,tabs,search,notice,timeline,footer,dialog);root.replaceChildren(card);
 let replyTo=null;
 let queuedLoad=false;
 const openComposer=(id=null)=>{replyTo=id;dialogTitle.textContent=id?'Reply on X':'Compose on X';textarea.value='';counter.textContent='0 / 280';feedback.textContent='';if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');textarea.focus()};
 const closeComposer=()=>{if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open')};
 textarea.addEventListener('input',()=>{counter.textContent=Array.from(textarea.value).length+' / 280'});
 cancel.addEventListener('click',closeComposer);
 compose.addEventListener('click',()=>openComposer());
 profile.addEventListener('click',()=>{state.tab='profile';select();void load()});
 async function token(){
  const bridge=window.QuantaCloudConnection;
  if(bridge?.ready)await Promise.race([bridge.ready,new Promise(resolve=>setTimeout(resolve,7000))]);
  const t=String(await bridge?.resolveDeviceToken?.()||'');
  if(!/^sq_[A-Za-z0-9_-]{32,}$/.test(t))throw Error('Sign in to your QuantaPhi wallet first.');
  return t;
 }
 async function api(path,method='GET',body){
  const t=await token();
  const response=await fetch(API+path,{method,cache:'no-store',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const payload=await response.json().catch(()=>({}));
  if(!response.ok||payload.error)throw Error(payload.error||'X service returned '+response.status);
  return payload;
 }
 const status=s=>{state.notice=s;notice.textContent=s};
 function select(){
  for(const [id,b] of tabButtons)b.setAttribute('aria-selected',String(state.tab===id));
  search.hidden=!['public','spaces'].includes(state.tab);
  topic.placeholder=state.tab==='spaces'?'Find live Spaces by topic':'Search public X posts';
  compose.disabled=!state.connected||!state.canPost;
  compose.title=compose.disabled?'Authorize X posting permission first':'Compose a post on X';
  profile.disabled=!state.connected;
  connect.hidden=state.connected;
  write.hidden=!state.connected||(state.canPost&&state.canLike);
 }
 const text=(tag,value,cls='')=>el(tag,cls,value==null?'':String(value));
 function renderPost(p){
  const node=el('article','xt-post'),heading=el('div','xt-post-head');
  append(heading,text('strong',p.author?.name||'X account'),text('span',p.author?.handle?'@'+p.author.handle:'X · '+p.id,'xt-muted'));
  if(p.createdAt)heading.append(text('time',new Date(p.createdAt).toLocaleString(),'xt-time'));
  const words=text('p',p.text||'','xt-post-text');
  const tools=el('div','xt-post-actions');
  const like=el('button','xt-button','Like'),reply=el('button','xt-button','Reply'),repost=el('button','xt-button','Repost');
  const original=el('a','xt-button','View original');original.href=p.url;original.target='_blank';original.rel='noopener noreferrer';
  like.type=reply.type=repost.type='button';like.disabled=!state.canLike;reply.disabled=repost.disabled=!state.canPost;
  like.addEventListener('click',()=>void act('/v1/x/like',{postId:p.id},'Liked on X'));
  reply.addEventListener('click',()=>openComposer(p.id));
  repost.addEventListener('click',()=>void act('/v1/x/repost',{postId:p.id},'Reposted on X'));
  append(tools,like,reply,repost,original);
  const counts=p.metrics;
  const metrics=counts?text('small',[['Replies',counts.reply_count],['Reposts',counts.retweet_count],['Likes',counts.like_count]].filter(x=>Number.isFinite(x[1])).map(x=>x[0]+': '+x[1]).join(' · '),'xt-metrics'):null;
  append(node,heading,words,...(metrics?[metrics]:[]),tools);
  return node;
 }
 function render(){
  timeline.replaceChildren();
  if(state.tab==='post'){
   if(!state.single)timeline.append(text('p',state.singleId?'No verified X post loaded yet.':'Paste a post URL or ID to read it here.','xt-empty'));
   else timeline.append(renderPost(state.single));
  }else if(state.tab==='public'||state.tab==='following'){
   if(!state.posts.length)timeline.append(text('p','No verified X posts available for this view.','xt-empty'));
   for(const p of state.posts)timeline.append(renderPost(p));
  }else if(state.tab==='spaces'){
   if(!state.spaces.length)timeline.append(text('p','No currently verified live Spaces for this topic. Ended Spaces are excluded.','xt-empty'));
   for(const sp of state.spaces){
    const box=el('article','xt-post');
    const player=el('a','xt-button xt-space','Listen in X');player.href=sp.url;player.target='_blank';player.rel='noopener noreferrer';
    append(box,text('strong',sp.title),text('p',[(sp.creatorHandle?'@'+sp.creatorHandle:'X host'),'LIVE confirmed at fetch time'].join(' · '),'xt-muted'),player);
    timeline.append(box);
   }
  }else if(state.tab==='archive'){
   if(!state.archive.length)timeline.append(text('p','No followed Spaces indexed in the archive.','xt-empty'));
   for(const sp of state.archive){const box=el('article','xt-post');append(box,text('strong',sp.title),text('p','@'+sp.handle+' · archived link, playback not verified','xt-muted'));
    if(sp.url){const a=el('a','xt-button','Open source on X');a.href=sp.url;a.target='_blank';a.rel='noopener noreferrer';box.append(a)}timeline.append(box)}
  }else if(state.tab==='profile'){
   if(!state.profile)timeline.append(text('p','An authorized X profile is not available.','xt-empty'));
   else{const p=state.profile.profile,box=el('section','xt-post'),a=el('a','xt-button','Open full profile on X');a.href=p.url;a.target='_blank';a.rel='noopener noreferrer';
    append(box,text('h3',p.name||p.handle),text('p','@'+p.handle,'xt-muted'),text('p',p.description||''),a);timeline.append(box)}
  }
  fetched.textContent=state.updatedAt?(state.tab==='archive'?'Media Star index · ':'X API verified · ')+new Date(state.updatedAt).toLocaleTimeString():'No live X data loaded';
  select();
 }
 async function act(path,payload,success){
  if(state.pending)return;state.pending=true;refresh.disabled=true;let reload=false;
  try{const result=await api(path,'POST',payload);if(result.ok&&result.source==='x_api_confirmed'){status(success+' · confirmed by X.');reload=state.tab!=='spaces';}else status('X did not confirm that action.')}
  catch(e){status('X action not completed: '+String(e.message||e))}
  finally{state.pending=false;refresh.disabled=false}
  if(reload)void load();
 }
 send.addEventListener('click',async()=>{
  if(state.pending||!state.canPost)return;
  const value=textarea.value.trim();
  if(!value||Array.from(value).length>280){feedback.textContent='Enter 1 to 280 characters.';return}
  state.pending=true;send.disabled=true;feedback.textContent='Sending once to X…';let reload=false;
  try{const result=await api('/v1/x/post','POST',{text:value,...(replyTo?{replyTo}:{})});
   if(result.ok&&result.source==='x_api_confirmed'){feedback.textContent='Published on X · '+result.postId;status('X confirmed your '+(replyTo?'reply.':'post.'));closeComposer();reload=true;}
   else feedback.textContent='X did not confirm the post; do not retry until checked.';
  }catch(e){feedback.textContent='Could not confirm a post: '+String(e.message||e)+'. Check your X account before retrying.'}
  finally{state.pending=false;send.disabled=false}
  if(reload)void load();
 });
 async function load(){
  if(state.pending){queuedLoad=true;return}
  const requestedTab=state.tab,requestedTopic=state.topic;
  state.pending=true;refresh.disabled=true;status('Reading X source data…');
  // Never keep stale live cards visible after a failed refresh.
  if(state.tab==='spaces'){state.spaces=[];render()}
  try{
   const account=await api('/v1/x/account');
   state.connected=Boolean(account.xConnected);state.canPost=Boolean(account.canPost);state.canLike=Boolean(account.canLike);
   if(!state.connected){
    state.posts=[];state.spaces=[];state.profile=null;state.archive=[];
    status('Connect X once to load genuine feeds and reply in this card. X permission is requested on its official consent screen.');render();return;
   }
   let result;
   if(state.tab==='post'&&state.singleId){result=await api('/v1/x/post?id='+encodeURIComponent(state.singleId));state.single=result.post||null}
   if(state.tab==='profile'){result=await api('/v1/x/profile');state.profile=result}
   if(state.tab==='public'||state.tab==='following'){result=await api('/v1/x/timeline?feed='+state.tab+(state.tab==='public'?'&q='+encodeURIComponent(state.topic):''));state.posts=result.posts||[]}
   if(state.tab==='spaces'){result=await api('/v1/x/spaces/live?q='+encodeURIComponent(state.topic));state.spaces=(result.spaces||[]).filter(s=>s.state==='live')}
   if(state.tab==='archive'){result=await api('/v1/x/archive');state.archive=result.spaces||[]}
   if(state.tab!==requestedTab||state.topic!==requestedTopic){queuedLoad=true;return}
   state.updatedAt=result?.fetchedAt||new Date().toISOString();
   status(state.tab==='post'?'One verified X post loaded inside this card.':state.tab==='spaces'?'Live-only X Space results · refreshes while this tab is visible.':state.tab==='archive'?'Showing indexed Space links, not verified X API playback.':state.canPost?'Showing genuine X posts. Reply without leaving the card.':'Showing genuine X posts. Select Enable posting to authorize in-card replies.');
   render();
  }catch(e){if(state.tab==='spaces')state.spaces=[];if(state.tab==='post')state.single=null;if(state.tab==='public'||state.tab==='following')state.posts=[];status('X data unavailable: '+String(e.message||e)+'. No estimated or stale records displayed.');render()}
  finally{state.pending=false;refresh.disabled=false;if(queuedLoad){queuedLoad=false;void load()}}
 }
 // Rate-limited fetch only for the visible live tab; never label ended Spaces as current.
 const poll=setInterval(()=>{if(root.isConnected&&state.tab==='spaces'&&document.visibilityState==='visible'&&!state.pending)void load();if(!root.isConnected)clearInterval(poll)},90000);
 select();void load();return card;
}
if(typeof document!=='undefined')mountXTwitterCard(document.getElementById('xTwitterCard'));
