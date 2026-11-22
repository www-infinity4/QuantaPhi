// Same-origin installed app client: fragment-only network traffic.
// The owner issues one app credential; no per-fragment prompts and no access
// to a user's files outside this app's IndexedDB sandbox.
import {AppShardCache,openBrowserShardStore} from './app-cache.mjs';
const TOKEN='infinity:mesh-peer-token:v1';
const PAUSE='infinity:mesh-peer-paused:v1';
const byId=id=>document.getElementById(id);
const status=message=>{byId('peerStatus').textContent=message;};
let cache=null,busy=false,activeToken='',pollTimer=null;
function getSetting(name){try{return localStorage.getItem(name)||''}catch{return''}}
function setSetting(name,value){try{localStorage.setItem(name,value);return true}catch{return false}}
async function send(method,path,body){
 const response=await fetch(path,{method,redirect:'error',credentials:'omit',cache:'no-store',
  headers:{Authorization:'Bearer '+activeToken,...(body===undefined?{}:{'Content-Type':'application/json'})},
  body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 const data=await response.json();
 if(!response.ok)throw Error('Mesh returned '+response.status+' ('+String(data.error||'unavailable')+')');
 return data;
}
async function refresh(){
 if(!cache)return;
 const info=await cache.usage();
 byId('peerEntries').textContent=String(info.entries);
 byId('peerBytes').textContent=info.bytes.toLocaleString()+' bytes';
 byId('peerPause').textContent=cache.enabled?'Pause caching':'Resume caching';
}
async function inventory(){
 // Report only our own hashed encrypted fragments, not personal files.
 await cache.sweep();
 if(!cache.enabled)return [];
 return (await cache.store.list()).slice(0,4096).map(x=>({fileId:x.fileId,index:x.index,sha256:x.sha256}));
}
async function sync(){
 if(busy||!cache||!activeToken||document.hidden||!navigator.onLine)return;
 busy=true;
 try{
  const report=await send('POST','/v1/node/heartbeat',{inventory:await inventory()});
  if(cache.enabled){
   let received=0;
   for(let i=0;i<4;i++){
    const job=await send('GET','/v1/node/next');
    if(!job.fragment)break;
    const saved=await cache.put(job.fragment); // SHA-256 verified locally before receipt
    if(!saved.stored)break;
    await send('POST','/v1/node/ack',{fileId:job.fragment.fileId,index:job.fragment.index,sha256:job.fragment.sha256});
    received++;
   }
   status('Mesh connected · '+received+' encrypted fragment(s) updated ·'+(report.invalidated?' cache loss reported for repair':' ready'));
  }else status('Mesh connected; caching paused. Other nodes can receive replacement fragments.');
  await refresh();
 }catch(error){status('Mesh unavailable: '+String(error.message||error)+' · Existing app cache unchanged');}
 finally{busy=false;}
}
async function init(){
 try{
  cache=new AppShardCache({store:await openBrowserShardStore(),enabled:getSetting(PAUSE)!=='yes'});
  activeToken=getSetting(TOKEN);
  byId('peerToken').value=activeToken?'':'';
  byId('peerSave').addEventListener('click',()=>{
   const next=byId('peerToken').value.trim();
   if(next.length<32){status('Enter the private app enrollment credential provided by the server owner.');return;}
   if(!setSetting(TOKEN,next)){status('This browser cannot save app enrollment on this device.');return;}
   activeToken=next;
   byId('peerToken').value='';
   status('App credential stored in this app. Checking the server…');
   void sync();
  });
  byId('peerSync').addEventListener('click',()=>void sync());
  byId('peerPause').addEventListener('click',async()=>{
   cache.enabled=!cache.enabled;setSetting(PAUSE,cache.enabled?'no':'yes');
   await refresh();
   status(cache.enabled?'App caching resumed.':'App caching paused. Cached bytes remain removable.');
   void sync();
  });
  byId('peerClear').addEventListener('click',async()=>{
   await cache.clear();await refresh();
   status('Encrypted mesh fragments cleared from this app; report will trigger replica repair.');
   void sync();
  });
  await refresh();
  status(activeToken?'Previously enrolled; checking encrypted cache…':'Not enrolled. No peer network traffic is active.');
  if(activeToken)await sync();
  pollTimer=setInterval(()=>{if(!document.hidden)void sync()},30000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void sync()});
 }catch(error){status('App storage unavailable: '+String(error.message||error));}
}
void init();
