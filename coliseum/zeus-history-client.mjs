/* Private Zeus transcript history. Runs INSIDE the Bubbles iframe; host pages
 * never receive conversation text. Cloud writes require explicit user opt-in. */
const API='https://infinity-coliseum.marvaseater.workers.dev';
const CONSENT='quantaphi:zeus:history-consent:v1';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const label=(text)=>{const p=document.createElement('p');p.textContent=text;return p};
const button=(text)=>{const b=document.createElement('button');b.type='button';b.className='ba-control';b.textContent=text;return b};
const stored=()=>{try{return JSON.parse(localStorage.getItem(CONSENT)||'null')}catch{return null}};
const save=value=>{try{localStorage.setItem(CONSENT,JSON.stringify(value));return true}catch{return false}};
export function mountZeusArchive({root,snapshot,openThread}){
 const wrap=document.createElement('details');wrap.className='ba-zeus-cloud-history';
 const summary=document.createElement('summary');summary.textContent='Zeus · Cloud history and backup';
 const intro=label('Private to your verified StarQuest wallet. With your permission, Zeus saves both your messages and assistant replies in Cloudflare D1, with a separate private R2 copy. This is not end-to-end encrypted.');
 const status=label('Cloud history is not connected. Conversations remain on this device.');
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const controls=document.createElement('div');controls.className='ba-folder-actions';
 const enable=button('Enable automatic cloud backup');
 const listButton=button('View cloud conversations');
 const retry=button('Retry pending backup');
 const exportButton=button('Download complete Zeus history');
 const recovery=document.createElement('a');recovery.href='/wallet-recovery.html?verify=1';recovery.textContent='Sign in / verify your existing StarQuest wallet';
 recovery.rel='nofollow';
 const list=document.createElement('div');list.className='ba-folder-list';
 controls.append(enable,listButton,retry,exportButton);
 wrap.append(summary,intro,controls,recovery,status,list);
 root.append(wrap);
 let profile='',enabled=false,loading=false,running=false;
 const unsent=new Map(),sent=new Set();
 const say=value=>{status.textContent=value};
 async function call(path,options={}){
  const bridge=window.QuantaCloudConnection;
  if(!bridge?.authenticatedFetch)throw Error('Sign in to the existing wallet first.');
  if(bridge.ready)await bridge.ready;
  const response=await bridge.authenticatedFetch(API+path,{
   ...options,cache:'no-store',headers:{'content-type':'application/json',...(options.headers||{})}
  });
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.ok)throw Error(result.error||'Cloud history unavailable');
  return result;
 }
 async function verify(){
  const result=await call('/v1/private/zeus/threads?offset=0');
  if(!/^[0-9a-f]{32}$/.test(result.profile||''))throw Error('Wallet identity verification failed.');
  if(profile&&profile!==result.profile){
   enabled=false;unsent.clear();sent.clear();
   say('The signed-in wallet changed. Previous drafts were not uploaded. Enable backup for this account separately.');
   throw Error('wallet_changed');
  }
  profile=result.profile;
  const consent=stored();
  enabled=Boolean(consent?.enabled&&consent.profile===profile);
  enable.textContent=enabled?'Pause automatic backup':'Enable automatic cloud backup';
  return result;
 }
 async function turnPages(threadId){
  const all=[];let offset=0;
  for(;;){
   const result=await call('/v1/private/zeus/threads/'+encodeURIComponent(threadId)+'/messages?offset='+offset);
   all.push(...(result.items||[]));
   if(result.next===null||result.next===undefined)return all;
   if(result.next<=offset)throw Error('Incomplete message pagination');
   offset=result.next;
  }
 }
 async function threadPages(){
  const all=[];let offset=0;
  for(;;){
   const result=await call('/v1/private/zeus/threads?offset='+offset);
   all.push(...(result.items||[]));
   if(result.next===null||result.next===undefined)return all;
   if(result.next<=offset)throw Error('Incomplete conversation pagination');
   offset=result.next;
  }
 }
 async function showList(){
  const data=await verify();
  list.replaceChildren();
  const threads=await threadPages();
  if(!threads.length)list.append(label('No cloud conversations saved yet.'));
  for(const thread of threads){
   const open=button((thread.title||'Zeus conversation')+' · '+String(thread.updated_at||'').slice(0,10));
   open.addEventListener('click',()=>void action(async()=>{
    const rows=await turnPages(thread.id);
    await openThread(thread,rows);
    say('Recovered '+rows.length+' messages from your verified wallet. The cloud archive remains intact.');
   }));
   list.append(open);
  }
  say(threads.length+' private cloud conversation(s) available for this wallet.'+(enabled?' Automatic backup is enabled.':' Automatic backup is off.'));
  return data;
 }
 async function action(job){
  if(loading)return;
  loading=true;for(const b of [enable,listButton,retry,exportButton])b.disabled=true;
  try{await job()}catch(e){
   say('Cloud history: '+String(e.message||e).replaceAll('_',' ')+'. Your device conversations were not deleted.');
  }finally{loading=false;for(const b of [enable,listButton,retry,exportButton])b.disabled=false}
 }
 async function drain(){
  if(running||!enabled)return;
  running=true;
  try{
   await verify();
   if(!enabled)return;
   for(const [threadId,task] of unsent){
    if(!uuid.test(threadId))continue;
    const created=await call('/v1/private/zeus/threads',{method:'POST',body:JSON.stringify({id:threadId,title:task.title})});
    if(!created.backedUp){say('Conversation saved in Cloudflare D1; separate R2 backup pending. Tap Retry pending backup.');return}
    for(const m of task.messages.values()){
     const key=threadId+':'+m.id;
     if(sent.has(key))continue;
     const saved=await call('/v1/private/zeus/threads/'+threadId+'/messages',{method:'POST',body:JSON.stringify(m)});
     if(!saved.backedUp){say('Message saved in D1; R2 copy pending. Tap Retry pending backup.');return}
     sent.add(key);
    }
    unsent.delete(threadId);
   }
   say('Zeus conversation history backed up to Cloudflare D1 and private R2 for this wallet.');
  }catch(e){say('Cloud backup waiting: '+String(e.message||e)+'. Your local history is unchanged.');}
  finally{running=false}
 }
 function queue(threadId,messages,thread){
  if(!enabled||!profile||!uuid.test(threadId))return;
  const task=unsent.get(threadId)||{title:(thread?.title||'Zeus conversation').slice(0,100),messages:new Map()};
  for(const m of messages||[]){
   if(!m||!['user','assistant'].includes(m.role)||typeof m.text!=='string'||!m.text.trim())continue;
   const id=uuid.test(m.id)?m.id:undefined;
   if(!id||sent.has(threadId+':'+id))continue;
   task.messages.set(id,{id,role:m.role,text:m.text.slice(0,6000)});
  }
  unsent.set(threadId,task);
  void drain();
 }
 enable.addEventListener('click',()=>void action(async()=>{
  await verify();
  if(enabled){enabled=false;save({enabled:false,profile});enable.textContent='Enable automatic cloud backup';say('New cloud backups paused. Existing D1 and R2 histories remain intact.');return}
  if(!confirm('Enable private Cloudflare storage of Zeus conversations for this verified wallet, including the current conversation? Your messages and AI replies will be readable by the service operator.'))return;
  if(!save({enabled:true,profile}))throw Error('Cannot save your backup preference on this device');
  enabled=true;enable.textContent='Pause automatic backup';
  const current=snapshot();queue(current.id,current.messages,current.thread);
  say('Cloud backup enabled. Checking the conversation and R2 backup…');
  void drain();
 }));
 listButton.addEventListener('click',()=>void action(showList));
 retry.addEventListener('click',()=>void action(async()=>{
  await verify();
  if(!enabled){say('Automatic cloud backup is paused. Enable it to save new messages.');return}
  const current=snapshot();queue(current.id,current.messages,current.thread);
  await drain();
 }));
 exportButton.addEventListener('click',()=>void action(async()=>{
  await verify();
  const threads=await threadPages();
  const records=[];
  for(const thread of threads)records.push({thread,messages:await turnPages(thread.id)});
  const payload={format:'zeus-private-cloud-history-v1',exportedAt:new Date().toISOString(),conversations:records};
  const href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
  const a=document.createElement('a');a.href=href;a.download='zeus-conversations-backup.json';
  document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(href),10000);
  say('Exported '+records.length+' cloud conversations. Store your downloaded file privately.');
 }));
 // Reading is opt-in; never initiate a write or import an old account's history
 // until the account has been verified and the person enables backup.
 wrap.addEventListener('toggle',()=>{if(wrap.open&&!profile)void action(async()=>{await verify();say(enabled?'Cloud backup enabled for this wallet.':'Verified wallet connected. Cloud backup is off until you choose to enable it.');})});
 return {queue};
}
