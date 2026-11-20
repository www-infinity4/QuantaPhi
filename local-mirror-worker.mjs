import {prepareRecord,DB_NAME,DB_STORE} from './local-mirror-core.mjs';

function database() {
 return new Promise((resolve,reject)=>{
   const open = indexedDB.open(DB_NAME,1);
   open.onupgradeneeded = () => {
     const db=open.result;
     if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE,{keyPath:'id'});
   };
   open.onsuccess = () => resolve(open.result);
   open.onerror = () => reject(open.error || new Error('Local storage unavailable'));
 });
}
async function transaction(mode,action) {
 const db=await database();
 try {
   return await new Promise((resolve,reject)=>{
     const tx=db.transaction(DB_STORE,mode);
     const store=tx.objectStore(DB_STORE);
     let result;
     tx.onerror=()=>reject(tx.error || new Error('Local storage failed'));
     tx.oncomplete=()=>resolve(result);
     action(store, value=>{result=value;});
   });
 } finally {db.close();}
}
async function storeRecord(text){
 const record=await prepareRecord(text);
 await transaction('readwrite',(store)=>{store.put(record);});
 return {id:record.id,sha256:record.sha256,timestamp:record.timestamp,length:record.length,lexicalProfile:record.lexicalProfile};
}
async function listRecords(){
 const records=await transaction('readonly',(store,set)=>{
   const req=store.getAll();req.onsuccess=()=>set(req.result||[]);
 });
 return records.map(({id,sha256,timestamp,length,lexicalProfile})=>({id,sha256,timestamp,length,lexicalProfile}));
}
self.addEventListener('message',async event=>{
 const request=event.data;
 if (!request || typeof request!=='object' || !Number.isSafeInteger(request.requestId)) return;
 const {requestId,type}=request;
 try {
   let result;
   if (type === 'STORE' && request.consent === true) result=await storeRecord(request.text);
   else if (type === 'LIST' && request.consent === true) result=await listRecords();
   else if (type === 'CLEAR') {
     await transaction('readwrite',(store)=>{store.clear();});result={cleared:true};
   } else throw new Error('Consent required or unsupported action');
   self.postMessage({requestId,ok:true,result});
 } catch (e) {self.postMessage({requestId,ok:false,error:String(e?.message||'Local storage operation failed').slice(0,140)});}
});
