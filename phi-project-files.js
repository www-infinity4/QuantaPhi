/* Native image upload storage for Phi projects: files stay on this device until a Cloudflare asset API exists. */
(function(root){
'use strict';
if(root.PhiProjectFiles)return;
const DB='quantaphi-project-files-v1',STORE='images',MAX_BYTES=12*1024*1024;
const TYPES=new Set(['image/png','image/jpeg','image/webp','image/gif','image/avif']);
const validId=id=>typeof id==='string'&&/^upload-[a-z0-9-]{8,100}$/i.test(id);
function connect(){
 return new Promise((resolve,reject)=>{
  if(!root.indexedDB){reject(Error('Local file storage is unavailable on this browser.'));return}
  let request;
  try{request=root.indexedDB.open(DB,1)}catch(e){reject(e);return}
  request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'})};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||Error('Could not open local file storage.'));
  request.onblocked=()=>reject(Error('Close other project tabs and retry the upload.'));
 });
}
async function transact(mode,work){
 const db=await connect();
 try{
  return await new Promise((resolve,reject)=>{
   const tx=db.transaction(STORE,mode);
   let output;
   const req=work(tx.objectStore(STORE));
   req.onsuccess=()=>{output=req.result};
   req.onerror=()=>reject(req.error||Error('File storage request failed.'));
   tx.oncomplete=()=>resolve(output);
   tx.onerror=()=>reject(tx.error||Error('Could not save the file.'));
   tx.onabort=()=>reject(tx.error||Error('File storage transaction aborted.'));
  });
 }finally{db.close()}
}
async function save(file){
 if(!(file instanceof Blob)||!TYPES.has(file.type))throw Error('Choose a PNG, JPEG, WebP, GIF, or AVIF image.');
 if(!file.size||file.size>MAX_BYTES)throw Error('Image must be larger than zero and at most 12 MB.');
 const id='upload-'+(root.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2));
 const record={id,blob:file,name:String(file.name||'Uploaded image').slice(0,180),mime:file.type,size:file.size,storedAt:new Date().toISOString()};
 await transact('readwrite',store=>store.put(record));
 return {id,name:record.name,mime:record.mime,size:record.size};
}
const get=id=>validId(id)?transact('readonly',store=>store.get(id)):Promise.resolve(null);
const remove=id=>validId(id)?transact('readwrite',store=>store.delete(id)):Promise.resolve();
async function objectUrl(id){const record=await get(id);return record?.blob?URL.createObjectURL(record.blob):''}
root.PhiProjectFiles=Object.freeze({save,get,remove,objectUrl,MAX_BYTES});
})(window);
