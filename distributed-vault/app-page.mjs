import {openBrowserShardStore,AppShardCache} from './app-cache.mjs';

const byId=id=>document.getElementById(id);
const status=byId('vaultStatus');
const cacheButton=byId('vaultTestCache');
const pauseButton=byId('vaultPause');
const clearButton=byId('vaultClear');
const SETTING='infinity:app-shards:cache-paused:v1';
let cache=null;
function message(text){status.textContent=text;}
function isPaused(){
 try{return localStorage.getItem(SETTING)==='yes';}
 catch{return false;}
}
function savePaused(value){
 try{localStorage.setItem(SETTING,value?'yes':'no');return true;}
 catch{return false;}
}
async function refresh(){
 if(!cache)return;
 const info=await cache.usage();
 byId('vaultEntries').textContent=info.entries.toLocaleString();
 byId('vaultBytes').textContent=info.bytes.toLocaleString()+' bytes';
 pauseButton.textContent=cache.enabled?'Pause app caching':'Resume app caching';
 cacheButton.disabled=!cache.enabled;
}
async function cacheDemo(){
 if(!cache.enabled){message('App caching is paused. No fragment stored.');return;}
 // Static, same-origin demo asset; NO access to personal files or other apps.
 const response=await fetch('./demo-shard.json',{credentials:'omit',cache:'no-store'});
 if(!response.ok)throw Error('demo asset unavailable: '+response.status);
 const shard=await response.json();
 const result=await cache.put(shard);
 message(result.stored?'Verified demo fragment stored in this app cache. Nothing was sent to another device.':'App caching is paused.');
 await refresh();
}
async function ready(){
 try{
  const store=await openBrowserShardStore();
  cache=new AppShardCache({store,enabled:!isPaused()});
  cacheButton.addEventListener('click',async()=>{
   cacheButton.disabled=true;
   try{await cacheDemo();}
   catch(error){message('Unable to cache demo: '+String(error.message||error));}
   finally{await refresh();}
  });
  pauseButton.addEventListener('click',async()=>{
   cache.enabled=!cache.enabled;
   const persisted=savePaused(!cache.enabled);
   await refresh();
   message((cache.enabled?'Caching resumed.':'Caching paused.')+
    (persisted?'':' This browser could not save the setting for the next session.'));
  });
  clearButton.addEventListener('click',async()=>{
   await cache.clear();
   await refresh();
   message('Vault fragments removed from this app storage. No other app data was changed.');
  });
  await refresh();
  if(cache.enabled)await cacheDemo();
  else message('App caching paused. Existing encrypted fragments remain removable below.');
 }catch(error){
  message('This browser cannot open app storage: '+String(error.message||error));
  cacheButton.disabled=true;pauseButton.disabled=true;clearButton.disabled=true;
 }
}
void ready();
