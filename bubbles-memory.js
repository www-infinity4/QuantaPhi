/* Private, append-only Bubbles transcript memory. Opt-in browser storage and
   separately opt-in wallet-scoped Cloudflare sync. No ChatGPT account scraping. */
(function(global){
 'use strict';
 const DB_NAME='quantaphi-bubbles-memory-v1',API='https://bubbles-memory.marvaseater.workers.dev';
 function uid(){return (global.crypto?.randomUUID?.()||('m'+Date.now().toString(36)+Math.random().toString(36).slice(2))).replace(/-/g,'')}
 function normalize(m){if(!m||!['user','assistant','note'].includes(m.role)||typeof m.text!=='string')return null;
   if(!m.text.trim())return null;
   return {id:/^[A-Za-z0-9_-]{8,80}$/.test(m.id||'')?m.id:uid(),role:m.role,text:m.text.slice(0,6000),at:Number.isSafeInteger(m.at)?m.at:Date.now()};
 }
 function database(){return new Promise(resolve=>{
  if(!global.indexedDB)return resolve(null);
  let finished=false;const done=db=>{if(!finished){finished=true;resolve(db)}};
  try{const request=indexedDB.open(DB_NAME,2);
   request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('turns')){
    const store=db.createObjectStore('turns',{keyPath:'id'});store.createIndex('byTime','at');}
   if(!db.objectStoreNames.contains('terms'))db.createObjectStore('terms',{keyPath:'key'}).createIndex('byTerm','scopeTerm');};
   request.onsuccess=()=>done(request.result);request.onerror=()=>done(null);
   request.onblocked=()=>done(null);
  }catch{done(null)}
 })}
 function request(db,kind,write,operation){return new Promise((resolve,reject)=>{
  try{const storeName=kind==='terms'?'terms':'turns';
   const tx=db.transaction(storeName,write?'readwrite':'readonly'),s=tx.objectStore(storeName);
   const r=operation(s);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);
  }catch(e){reject(e)}
 })}
 async function list(db){return db?request(db,'all',false,s=>s.getAll()):[]}
 function tokenize(text){return [...new Set(String(text).toLowerCase().match(/[a-z0-9]{3,}/g)||[])].slice(0,160)}
 async function record(db,entry){if(!db)return false;return new Promise(resolve=>{
  try{const t=db.transaction(['turns','terms'],'readwrite');t.objectStore('turns').put(entry);
   const terms=t.objectStore('terms'),partition=entry.scope||'guest';
   for(const term of tokenize(entry.text))terms.put({key:partition+'|'+term+'|'+entry.id,scopeTerm:partition+'|'+term,id:entry.id});
   t.oncomplete=()=>resolve(true);t.onerror=t.onabort=()=>resolve(false);
  }catch{resolve(false)}})}
 function matches(e,q){const words=q.toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>2);
  if(!words.length)return 0;const str=e.text.toLowerCase();
  return words.reduce((score,w)=>score+(str.includes(w)?1:0),0);}
 function make(){
  let dbPromise=database(),enabled=false,cloud=false,token='',cursor=0,clock=null;
  const PROFILE_KEY='quantaphi:bubbles:active-memory-profile:v1';
  let scope='guest';try{scope=localStorage.getItem(PROFILE_KEY)||'guest'}catch{}
  let onChange=()=>{},syncing=false;
  async function append(msg,{remote=false}={}){
   if(!enabled)return false;
   const e=normalize(msg);if(!e)return false;
   const db=await dbPromise;if(!db)return false;
   const existing=await request(db,'one',false,s=>s.get(e.id));
   if(existing)return true; // Never downgrade a previously synced entry.
   const ok=await record(db,{...e,scope,synced:remote===true});
   if(ok&&!remote&&cloud)void sync();return ok;
  }
  async function appendAll(items,{remote=false}={}){
   if(!Array.isArray(items))return;
   for(const m of items)await append(m,{remote});
  }
  async function all(){const db=await dbPromise;return (await list(db))
   .filter(e=>(e.scope||'guest')===scope).sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id))}
  async function recent(limit=30){return (await all()).slice(-limit)}
  async function search(q,limit=8){
   const db=await dbPromise;if(!db)return [];
   const terms=tokenize(q).slice(0,24),scores=new Map();
   // Indexed retrieval: search only the matching terms, not every old transcript.
   for(const term of terms){
    const items=await request(db,'terms',false,s=>s.index('byTerm').getAll(scope+'|'+term));
    for(const item of items)scores.set(item.id,(scores.get(item.id)||0)+1);
   }
   const xs=[];
   for(const [id,score] of scores){const e=await request(db,'one',false,s=>s.get(id));
    if(e&&(e.scope||'guest')===scope)xs.push({...e,score});
   }
   xs.sort((a,b)=>b.score-a.score||b.at-a.at);return xs.slice(0,limit);
  }
  async function context(q){
   if(!enabled)return '';
   const last=await recent(12),related=await search(q,8),ids=new Set(last.map(e=>e.id));
   const archived=related.filter(e=>!ids.has(e.id)).reverse();
   const items=[...archived,...last];let result='';
   for(const e of items){const line=e.role+': '+e.text.slice(0,900)+'\n';
    if(result.length+line.length>7800)break;result+=line;}
   return result;
  }
  async function remoteFetch(path,options={}){
   const r=await fetch(API+path,{...options,headers:{'authorization':'Bearer '+token,'content-type':'application/json',...(options.headers||{})},cache:'no-store'});
   let j={};try{j=await r.json()}catch{}
   if(!r.ok||!j.ok)throw Error(j.error||('memory_http_'+r.status));
   return j;
  }
  async function connect(){
   const connection=global.QuantaCloudConnection;
   if(!connection?.resolveDeviceToken)throw Error('Connect your QuantaPhi Unified Wallet in this window to enable private sync.');
   token=await connection.resolveDeviceToken();
   if(!token)throw Error('Verified Unified Wallet is not connected in this browser or Android panel.');
   // Do not upload a prior account's IndexedDB records under a new wallet.
   const identity=await remoteFetch('/v1/profile');
   if(!/^[a-f0-9]{64}$/.test(identity.profile||''))throw Error('wallet_profile_unavailable');
   const db=await dbPromise;
   if(scope==='guest'&&db){
    const guests=(await list(db)).filter(e=>(e.scope||'guest')==='guest');
    for(const e of guests)await record(db,{...e,scope:identity.profile,synced:false});
   }
   if(scope!==identity.profile)cursor=0;
   scope=identity.profile;try{localStorage.setItem(PROFILE_KEY,scope)}catch{}
   cloud=true;await sync();
   clearInterval(clock);clock=setInterval(()=>{if(!document.hidden)void sync()},12000);
   return true;
  }
  async function sync(){
   if(!cloud||syncing||!enabled)return;
   syncing=true;
   try{
    const unsynced=(await all()).filter(e=>!e.synced);
    for(let i=0;i<unsynced.length;i+=40){
     const batch=unsynced.slice(i,i+40),response=await remoteFetch('/v1/events',{method:'POST',body:JSON.stringify({events:batch.map(({id,role,text,at})=>({id,role,text,at}))})});
     if(!response.ok)break;
     const db=await dbPromise;for(const e of batch)await record(db,{...e,synced:true});
    }
    let changed=false;
    for(let page=0;page<100;page++){
     const batch=await remoteFetch('/v1/history?after='+cursor+'&limit=100');
     const events=batch.events||[];if(!events.length)break;
     const db=await dbPromise;
     for(const e of events){
      if(!e.id)continue;
      const old=await request(db,'one',false,s=>s.get(e.id));
      if(!old){await append(e,{remote:true});changed=true;}
     }
     cursor=Math.max(cursor,Number(batch.next)||cursor);
     if(events.length<100)break;
    }
    if(changed)onChange(await recent(30));
   }catch(e){cloud=false;clearInterval(clock);onChange(null,String(e.message||e))}
   finally{syncing=false}
  }
  async function clear({cloudToo=false}={}){
   if(cloudToo&&cloud)await remoteFetch('/v1/history',{method:'DELETE'});
   const db=await dbPromise;if(db)await new Promise(resolve=>{
    const tx=db.transaction(['turns','terms'],'readwrite'),store=tx.objectStore('turns');
    const cursorRequest=store.openCursor();
    cursorRequest.onsuccess=()=>{const row=cursorRequest.result;if(row){
     if((row.value.scope||'guest')===scope)row.delete();row.continue();
    }};
    const termRequest=tx.objectStore('terms').openCursor();
    termRequest.onsuccess=()=>{const row=termRequest.result;if(row){
     if(row.value.scopeTerm.startsWith(scope+'|'))row.delete();row.continue();
    }};
    tx.oncomplete=tx.onerror=tx.onabort=()=>resolve();
   });
   cursor=0;
  }
  function setEnabled(value){enabled=value===true;if(!enabled){cloud=false;token='';clearInterval(clock)}}
  function onUpdate(handler){onChange=typeof handler==='function'?handler:()=>{}}
  return {setEnabled,onUpdate,append,appendAll,recent,search,context,connect,sync,clear,
    get cloudConnected(){return cloud},get enabled(){return enabled}};
 }
 global.BubblesMemory=create();
 function create(){return make()}
})(window);
