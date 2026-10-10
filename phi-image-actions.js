/* Phi visual result actions: Star = taste; Share/Collect = existing StarCoin hooks. */
(function(){
'use strict';
const host=document.getElementById('phiImageBuilder');
if(!host)return;
const starsKey='phi_image_stars_v1',collectKey='quantaPhiCollected';
const list=key=>{try{const x=JSON.parse(localStorage.getItem(key)||'[]');return Array.isArray(x)?x:[]}catch(_){return []}};
const save=(key,data)=>{try{localStorage.setItem(key,JSON.stringify(data));return true}catch(_){return false}};
const message=s=>{const el=host.querySelector('.pi-finished .pi-notice');if(el)el.textContent=s};
const artifactState=()=>window.PhiImageBuilder?.get()||{};
function star(artifact){
 const saved=list(starsKey),exists=saved.some(x=>x.id===artifact.id);
 const next=exists?saved.filter(x=>x.id!==artifact.id):[...saved,{id:artifact.id,mode:artifact.mode,prompt:artifact.prompt,story:artifact.story,search:artifact.search,createdAt:artifact.createdAt}].slice(-500);
 if(!save(starsKey,next)){message('Could not save this design preference on this device.');return}
 const b=host.querySelector('[data-pi-action="star"]');if(b)b.textContent=exists?'☆ Star':'★ Starred';
 if(!exists)window.QuantaStarCredit?.('star',artifact.id,artifact);
 window.PhiImageLearning?.record(artifact,exists?'star_off':'star');
 window.dispatchEvent(new CustomEvent('phi:image:star',{detail:{...artifact,starred:!exists}}));
 message(exists?'Removed from design preferences.':'Starred! This design is saved as an inspiration for more like this. StarCoin receipt submitted.');
}
async function blobOf(src){
 const b=await window.PhiVisualRender.asBlob(src);
 return b;
}
function fileOf(blob,artifact){
 const ext=blob.type==='image/jpeg'?'jpg':blob.type==='image/webp'?'webp':'png';
 return new File([blob],'phi-'+String(artifact.mode||'image').toLowerCase().replace(/\s+/g,'-')+'.'+ext,{type:blob.type});
}
async function share(artifact,src){
 try{
  const file=fileOf(await blobOf(src),artifact);
  if(typeof navigator.share!=='function'||!navigator.canShare?.({files:[file]})){
   message('To share this artwork, save the image to your phone and send the file. Automatic share credit requires a confirmed native share.');return
  }
  await navigator.share({files:[file],title:'Phi Image',text:artifact.prompt.slice(0,140)});
  try{window.QuantaStarCredit?.('share','phi-image:share:'+artifact.id+':'+Date.now(),artifact)}catch(error){console.warn('StarCoin share sync deferred',error)}
  window.PhiImageLearning?.record(artifact,'share');
  message('Image shared. StarCoin share credit submitted to your existing wallet.');
  window.dispatchEvent(new CustomEvent('phi:image:share',{detail:artifact}));
 }catch(error){message(error?.name==='AbortError'?'Share cancelled. No credit issued.':'Share unavailable: '+String(error?.message||error))}
}
async function database(){
 return new Promise((resolve,reject)=>{
  if(!window.indexedDB){reject(Error('Device image storage not available'));return}
  const r=indexedDB.open('phi_image_assets_v1',1);
  r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('images'))r.result.createObjectStore('images',{keyPath:'id'})};
  r.onerror=()=>reject(r.error||Error('IndexedDB error'));r.onsuccess=()=>resolve(r.result);
 });
}
async function putImage(artifact,blob){
 const db=await database();
 try{
  await new Promise((resolve,reject)=>{
   const tx=db.transaction('images','readwrite');
   tx.objectStore('images').put({id:artifact.id,blob,metadata:artifact});
   tx.onerror=()=>reject(tx.error||Error('Storage write failed'));tx.oncomplete=resolve;
  });
 }finally{db.close()}
}
async function collect(artifact,src){
 const key='phi-image|'+artifact.id;
 if(list(collectKey).some(x=>x.key===key)){message('Already collected. No duplicate StarCoin reward.');return}
 try{
  const blob=await blobOf(src);
  await putImage(artifact,blob);
  const item={key,type:'Image',title:artifact.prompt.slice(0,120),story:artifact.prompt.slice(0,1500),media:'',sourceUrl:'',assetId:artifact.id,
   generator:'phi-image-builder',collectedAt:new Date().toISOString()};
  const entries=list(collectKey);entries.push(item);
  if(!save(collectKey,entries))throw Error('Unable to save collection metadata');
  window.dispatchEvent(new CustomEvent('quantaphi:collected',{detail:item}));
  try{window.QuantaStarCredit?.('collect',key,item)}catch(error){console.warn('StarCoin collect sync deferred',error)}
  const bridge=window.QuantaCloudConnection||window.StarQuestCloudLedger;
  if(typeof bridge?.authenticatedFetch==='function'){
   bridge.authenticatedFetch('https://quanta-phi-ledger.marvaseater.workers.dev/v1/quants/collects',{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(item)
   }).catch(e=>console.warn('Phi collect cloud sync deferred',e));
  }
  window.PhiImageLearning?.record(artifact,'collect');
  message('Image collected on this device. StarCoin collect credit submitted. Cloud image-blob backup is not connected.');
  window.dispatchEvent(new CustomEvent('phi:image:collect',{detail:item}));
 }catch(error){message('Collect failed: '+String(error?.message||error).slice(0,160)+'. No StarCoin credit was issued.')}
}
async function download(artifact,src){
 try{
  const file=fileOf(await blobOf(src),artifact);
  const url=URL.createObjectURL(file),a=document.createElement('a');
  a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2500);
  window.PhiImageLearning?.record(artifact,'save_requested');
  message('Download requested. Check your phone Downloads to confirm the image was saved.');
 }catch(error){message('Save image unavailable: '+String(error?.message||error))}
}
window.addEventListener('phi:image:action',event=>{
 const {action,artifact,result}=event.detail||{};
 if(!artifact||!result)return;
 if(action==='star')star(artifact);
 if(action==='share')void share(artifact,result);
 if(action==='collect')void collect(artifact,result);
 if(action==='download')void download(artifact,result);
});
})();
