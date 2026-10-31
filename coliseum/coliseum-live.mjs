/* Authenticated Coliseum beta client: separate from local prototype.
 * This never auto-publishes local drafts or simulates other people or AI.
 * The Worker must independently verify each StarQuest device token. */
const API='https://infinity-coliseum.marvaseater.workers.dev';
const $=id=>document.getElementById(id);
const make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n};
const area=$('arena');
if(area){
 const frame=make('section',undefined,'coliseum-live');
 frame.id='coliseumLive';
 frame.setAttribute('aria-labelledby','liveTitle');
 frame.append(make('p','SHARED COLISEUM · VERIFIED BETA','eyebrow'),make('h2','The connected arena'));
 const status=make('p','Checking whether the invited beta is enabled…','notice');status.id='liveStatus';status.setAttribute('role','status');frame.append(status);
 const heading=make('h3','Join your builders');heading.id='liveTitle';frame.append(heading);
 const intro=make('p','Use the same existing StarQuest wallet as Bubbles and QuantaPhi. Account recovery only reconnects: it never spends or resets tokens. Zeus AI chat is available separately through the existing Bubbles service; human Joust rooms require the verified beta. Paid billing is not live.');
 frame.append(intro);
 const controls=make('div',undefined,'live-controls');
 const sign=make('a','Sign in with StarQuest · keep my tokens');sign.href='/wallet-recovery.html?signin=starquest&returnTo=/coliseum/';sign.className='secondary';
 const refresh=make('button','Check beta');refresh.type='button';refresh.className='secondary';
 const join=make('button','Join free Zeus 6.2');join.type='button';join.className='primary';join.hidden=true;
 controls.append(sign,refresh,join);frame.append(controls);
 const board=make('section');board.hidden=true;board.id='connectedBoard';
 const mine=make('p','');board.append(mine);
 const selectWrap=make('label','Choose a sector: ');selectWrap.htmlFor='liveSector';
 const sector=document.createElement('select');sector.id='liveSector';
 for(const name of ['Technology','Gaming','Shopping','Business','Science','Media','Education','Art & Design','Community']){const op=document.createElement('option');op.value=name;op.textContent=name;sector.append(op)}
 selectWrap.append(sector);board.append(selectWrap);
 const form=make('form');form.id='livePitch';
 const title=make('input');title.name='title';title.type='text';title.placeholder='Your project name';title.minLength=5;title.maxLength=110;title.required=true;title.setAttribute('aria-label','Live project title');
 const description=make('textarea');description.name='description';description.placeholder='What should the group build together?';description.minLength=12;description.maxLength=1800;description.rows=3;description.required=true;description.setAttribute('aria-label','Live project description');
 const publish=make('button','Publish idea to this beta room');publish.type='submit';publish.className='primary';
 form.append(title,description,publish);board.append(form);
 const projects=make('div');projects.id='liveIdeas';
 board.append(make('h3','Shared projects'),projects);
 const chat=make('section');chat.append(make('h3','Room conversation'));
 const chatList=make('div');chatList.id='liveMessages';chat.append(chatList);
 const chatForm=make('form');chatForm.id='liveChatForm';
 const chatText=make('textarea');chatText.rows=2;chatText.maxLength=1000;chatText.placeholder='Offer a helpful question or next step';chatText.required=true;chatText.setAttribute('aria-label','Message to this shared beta room');
 const send=make('button','Post to room');send.type='submit';send.className='primary';
 chatForm.append(chatText,send);chat.append(chatForm);board.append(chat);
 const refreshRoom=make('button','Refresh shared ideas and messages');refreshRoom.className='secondary';refreshRoom.type='button';board.append(refreshRoom);
 frame.append(board);
 area.insertAdjacentElement('afterend',frame);
 // Embed the existing authenticated Bubbles AI conversation in the Zeus card.
 // Never simulate a model, a human participant or paid access.
 const heroButtons=document.querySelector('.hero-buttons');
 if(heroButtons){
  const ask=make('button','Talk to Zeus AI · Bubbles connected','primary');
  ask.id='zeusAskBuilder';ask.type='button';
  ask.setAttribute('aria-expanded','false');
  ask.setAttribute('aria-controls','zeusAssistantPanel');
  const panel=make('section',undefined,'zeus-assistant-panel');
  panel.id='zeusAssistantPanel';panel.hidden=true;
  panel.setAttribute('aria-label','Zeus AI assistant conversation');
  const header=make('div',undefined,'zeus-assistant-heading');
  header.append(make('h2','⚡ Zeus AI · Your builder companion'),make('p','Real Bubbles conversation on your existing QuantaPhi account. Available for ideas, planning and preparation for human Joust rooms. No simulated humans, payment or published drafts.'));
  const chat=make('iframe');
  chat.title='Zeus AI · Bubbles conversation';
  chat.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms allow-popups');
  chat.setAttribute('allow','microphone');
  chat.referrerPolicy='no-referrer';
  chat.loading='lazy';
  const params=new URLSearchParams({
   embed:'1',id:'coliseum-zeus-assistant',role:'builder',name:'Zeus AI · Bubbles',
   instructions:'You are the Bubbles-connected Zeus AI assistant in the Infinity Coliseum. Respond to the visitor, discuss practical projects and ask clarifying questions before proposing a Joust plan. Do not impersonate human members, claim to be an OpenAI model edition, transact, or publish drafts without authorization.'
  });
  let loaded=false;
  function openChat(){
   panel.hidden=false;
   ask.setAttribute('aria-expanded','true');
   ask.textContent='Close Zeus AI conversation';
   if(!loaded){
    loaded=true;chat.src='/bubbles.html?'+params;
   }else if(chat.contentWindow)chat.contentWindow.postMessage({type:'quantaphi:bubbles:open',id:'coliseum-zeus-assistant'},location.origin);
  }
  chat.addEventListener('load',()=>chat.contentWindow?.postMessage({type:'quantaphi:bubbles:open',id:'coliseum-zeus-assistant'},location.origin));
  ask.addEventListener('click',()=>{
   if(panel.hidden){openChat();return}
   panel.hidden=true;ask.setAttribute('aria-expanded','false');ask.textContent='Talk to Zeus AI · Bubbles connected';
  });
  panel.append(header,chat);
  heroButtons.append(ask);
  heroButtons.insertAdjacentElement('afterend',panel);
 }

 let enabled=false,joined=false,modelId='zeus',busy=false;
 const state=s=>status.textContent=s;
 async function call(path,options={}){
  const bridge=window.QuantaCloudConnection;
  if(!bridge?.authenticatedFetch)throw Error('Connect your StarQuest wallet before joining the beta.');
  if(bridge.ready)await bridge.ready;
  const response=await bridge.authenticatedFetch(API+path,{...options,headers:{'content-type':'application/json',...(options.headers||{})},cache:'no-store'});
  const value=await response.json().catch(()=>({}));
  if(!response.ok||!value.ok)throw Error(value.error||'Connected arena unavailable');
  return value;
 }
 async function check(){
  try{
   const response=await fetch(API+'/v1/health',{cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(6000)});
   const data=await response.json();
   enabled=Boolean(response.ok&&data?.ok&&data?.betaEnabled);
   join.hidden=!enabled;
   if(!enabled){board.hidden=true;state('Invited shared beta is not active. The private device-local Coliseum above remains usable.');}
   else state('Verified backend available · sign in and join a free arena.');
  }catch{
   enabled=false;join.hidden=true;board.hidden=true;
   state('Shared service is not yet deployed. You can still create and refine private ideas in the Coliseum above.');
  }
 }
 async function loadBoard(){
  const qs='?'+new URLSearchParams({modelId,sector:sector.value});
  const [ideas,messages]=await Promise.all([call('/v1/ideas'+qs),call('/v1/messages'+qs)]);
  projects.replaceChildren();
  if(!ideas.items.length)projects.append(make('p','No published projects in this room yet.'));
  for(const i of ideas.items){
   const item=make('article',undefined,'live-idea');
   item.append(make('h4',i.title),make('p',i.description),make('small',i.author+' · '+new Date(i.created_at).toLocaleString()));
   if(i.parent_id)item.append(make('p','Branch from '+i.parent_id.slice(0,8)));
   const acts=make('div',undefined,'live-controls');
   for(const [vote,label] of [['support','Support'],['question','Request revision']]){
    const b=make('button',label,'secondary');b.type='button';b.addEventListener('click',()=>void task(async()=>{
     const result=await call('/v1/vote',{method:'POST',body:JSON.stringify({ideaId:i.id,position:vote})});
     state(result.accepted?'Your one verified vote was recorded.':'Your vote was already recorded for this idea.');
     await loadBoard();
    }));acts.append(b);
   }
   const fork=make('button','Branch idea','secondary');fork.type='button';fork.addEventListener('click',()=>void task(async()=>{
    await call('/v1/branch',{method:'POST',body:JSON.stringify({ideaId:i.id})});
    state('New project branch published under your membership.');await loadBoard();
   }));acts.append(fork);item.append(acts);projects.append(item);
  }
  chatList.replaceChildren();
  if(!messages.items.length)chatList.append(make('p','No messages in this room yet.'));
  for(const m of messages.items){
   const post=make('div',undefined,'live-msg');post.append(make('small',m.author+' · '+new Date(m.created_at).toLocaleTimeString()),make('p',m.text));chatList.append(post);
  }
 }
 async function task(fn){
  if(busy)return;busy=true;publish.disabled=true;send.disabled=true;join.disabled=true;refreshRoom.disabled=true;
  try{await fn()}catch(e){const codes={signin_required:'Connect your StarQuest wallet.',beta_invitation_required:'This is a limited invited beta. No public seats are offered yet.',join_room_first:'Join the selected edition first.',slow_down:'This action is temporarily rate-limited.',beta_not_enabled:'The connected beta is disabled.'};state(codes[e.message]||String(e.message).replaceAll('_',' '));}
  finally{busy=false;publish.disabled=false;send.disabled=false;join.disabled=false;refreshRoom.disabled=false;}
 }
 refresh.addEventListener('click',()=>void check());
 join.addEventListener('click',()=>void task(async()=>{
  if(!enabled)return;
  const d=await call('/v1/join',{method:'POST',body:JSON.stringify({modelId})});
  joined=true;board.hidden=false;mine.textContent=d.handle+' · '+d.memberCount+' verified member(s) of '+d.cap+' seats · Free beta';
  state('Member verified. Shared ideas and chat are published intentionally, never from private drafts.');
  await loadBoard();
 }));
 sector.addEventListener('change',()=>{if(joined)void task(loadBoard)});
 refreshRoom.addEventListener('click',()=>{if(joined)void task(loadBoard)});
 form.addEventListener('submit',e=>{e.preventDefault();if(!joined)return;void task(async()=>{
  await call('/v1/ideas',{method:'POST',body:JSON.stringify({modelId,sector:sector.value,title:title.value,description:description.value})});
  form.reset();state('Idea published to your verified group.');await loadBoard();
 })});
 chatForm.addEventListener('submit',e=>{e.preventDefault();if(!joined)return;void task(async()=>{
  await call('/v1/messages',{method:'POST',body:JSON.stringify({modelId,sector:sector.value,text:chatText.value})});
  chatText.value='';state('Message posted to your verified group.');await loadBoard();
 })});
 void check();
}
