/* Shop Phi seller media: on-card camera, mobile file picker, device-local drafts.
 * It does not authenticate products, mint tokens, or publish inventory. */
(function(root){
'use strict';
if(root.ShopPhiSeller)return;
const DB='shop-phi-seller-media-v1',STORE='files';
const PHOTO=new Set(['image/jpeg','image/png','image/webp','image/avif']);
const VIDEO=new Set(['video/mp4','video/webm','video/quicktime']);
const LIM_PHOTO=12*1024*1024,LIM_VIDEO=50*1024*1024;
const validId=x=>/^shopmedia-[a-z0-9-]{8,100}$/i.test(String(x||''));
const el=(tag,text,cls)=>{const a=document.createElement(tag);if(text!==undefined)a.textContent=text;if(cls)a.className=cls;return a};
function dbOpen(){
 return new Promise((ok,fail)=>{
  if(!root.indexedDB)return fail(Error('Local media storage is unavailable.'));
  const r=root.indexedDB.open(DB,1);
  r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'id'})};
  r.onsuccess=()=>ok(r.result);
  r.onerror=()=>fail(r.error||Error('Could not open device media storage.'));
  r.onblocked=()=>fail(Error('Close other Shop Phi tabs and retry.'));
 });
}
async function transaction(mode,make){
 const db=await dbOpen();
 try{return await new Promise((ok,fail)=>{
  const tx=db.transaction(STORE,mode),r=make(tx.objectStore(STORE));let result;
  r.onsuccess=()=>{result=r.result};
  r.onerror=()=>fail(r.error||Error('Media storage request failed.'));
  tx.oncomplete=()=>ok(result);
  tx.onerror=()=>fail(tx.error||Error('Media storage transaction failed.'));
  tx.onabort=()=>fail(tx.error||Error('Media storage aborted.'));
 })}finally{db.close()}
}
async function get(id){return validId(id)?transaction('readonly',store=>store.get(id)):null}
async function save(file,kind){
 const id='shopmedia-'+(root.crypto?.randomUUID?.()||String(Date.now())+Math.random().toString(36).slice(2));
 const record={id,kind,name:String(file.name||kind).slice(0,160),type:file.type,blob:file,createdAt:new Date().toISOString()};
 await transaction('readwrite',s=>s.put(record));
 return{id,kind,name:record.name}
}
function duration(file){
 return new Promise((resolve,reject)=>{
  const v=document.createElement('video'),url=URL.createObjectURL(file);
  const done=(error,value)=>{v.removeAttribute('src');v.load();URL.revokeObjectURL(url);error?reject(error):resolve(value)};
  v.preload='metadata';v.onloadedmetadata=()=>done(null,v.duration);
  v.onerror=()=>done(Error('This video format cannot be checked. Choose a supported short clip.'));
  v.src=url;
 });
}
async function validate(file){
 if(PHOTO.has(file.type)){if(!file.size||file.size>LIM_PHOTO)throw Error('Photos must be 12 MB or smaller.');return'image'}
 if(VIDEO.has(file.type)){
  if(!file.size||file.size>LIM_VIDEO)throw Error('Videos must be 50 MB or smaller.');
  const seconds=await duration(file);
  if(!Number.isFinite(seconds)||seconds>45||seconds<=0)throw Error('Video clips must have a verified duration of 45 seconds or less.');
  return'video';
 }
 throw Error('Choose a JPEG, PNG, WebP, AVIF image or MP4, WebM, MOV video.');
}
function mount(form,fields,status,config={}){
 const area=el('section',undefined,'sap-seller-studio'),h=el('h3','Photograph your item'),description=el('p','Take the front, back and details. Photos stay original for verification; previews fit automatically into listing tiles.','sap-small');
 const controls=el('div',undefined,'sap-actions'),tile=el('div',undefined,'sap-media-tile'),gallery=el('div',undefined,'sap-media-grid');
 area.append(h,description,controls,tile,gallery);
 const cameraButton=el('button','📷 Open camera'),cameraInput=el('input'),picker=el('input'),clipInput=el('input'),nativeCamera=el('button','Camera app'),upload=el('button','＋ Add photos'),clip=el('button','＋ Add short video');
 for(const x of [cameraButton,nativeCamera,upload,clip])x.type='button';
 cameraInput.type='file';cameraInput.accept='image/*';cameraInput.capture='environment';cameraInput.hidden=true;
 picker.type='file';picker.accept='image/*';picker.multiple=true;picker.hidden=true;
 clipInput.type='file';clipInput.accept='video/mp4,video/webm,video/quicktime';clipInput.multiple=true;clipInput.hidden=true;
 controls.append(cameraButton,nativeCamera,upload,clip,cameraInput,picker,clipInput);
 const cameraPanel=el('div',undefined,'sap-camera-panel'),live=el('video'),cameraActions=el('div',undefined,'sap-actions'),snap=el('button','Snap photo'),close=el('button','Close camera');
 snap.type=close.type='button';live.autoplay=true;live.muted=true;live.playsInline=true;
 cameraActions.append(snap,close);cameraPanel.append(live,cameraActions);cameraPanel.hidden=true;area.append(cameraPanel);
 const check=el('button','Analyze photos with my robot');check.type='button';check.className='sap-review-btn';
 const note=el('p','AI identification, authentication, comparable prices and approval are not connected yet. Images cannot prove authenticity by themselves.','sap-small');
 const reviewLabel=el('p','Review status: unverified draft','sap-review-status');
 area.append(check,note,reviewLabel);
 if(typeof form.insertBefore==='function')form.insertBefore(area,form.firstChild);else form.append(area);
 let ids=[],previews=[],stream=null,previewEpoch=0;
 const revoke=()=>{previews.forEach(URL.revokeObjectURL);previews=[]};
 async function render(){
  const epoch=++previewEpoch;revoke();gallery.replaceChildren();
  for(const ref of ids){
   const file=await get(ref).catch(()=>null);
   if(epoch!==previewEpoch)return;
   if(!file)continue;
   const tile=el('div',undefined,'sap-media-thumb'),u=URL.createObjectURL(file.blob);previews.push(u);
   const display=el(file.kind==='video'?'video':'img');display.src=u;
   if(file.kind==='video'){display.controls=true;display.preload='metadata'}
   display.alt=file.name;tile.append(display,el('small',file.kind==='video'?'Video clip':file.name));
   const remove=el('button','Remove');remove.type='button';remove.addEventListener('click',()=>{ids=ids.filter(x=>x!==ref);render()});tile.append(remove);gallery.append(tile);
  }
  tile.textContent=ids.length+' item media file'+(ids.length===1?'':'s')+' attached';
 }
 async function addFiles(files){
  let added=0,errors=[];
  for(const file of Array.from(files||[])){
   try{
    const kind=await validate(file);
    if(ids.length>=10||(kind==='video'&&ids.length&&await Promise.all(ids.map(get)).then(a=>a.filter(x=>x?.kind==='video').length)>=2))throw Error('Limit: 10 media files total and 2 videos per listing.');
    const record=await save(file,kind);ids.push(record.id);added++;
   }catch(e){errors.push(e.message||'File rejected.')}
  }
  await render();
  status.textContent=added+' media file'+(added===1?'':'s')+' saved on this device.'+(errors.length?' '+errors.join(' '):'');
 }
 for(const [input,button] of [[cameraInput,nativeCamera],[picker,upload],[clipInput,clip]]){
  button.addEventListener('click',()=>input.click());
  input.addEventListener('change',()=>{const selected=Array.from(input.files||[]);input.value='';void addFiles(selected)});
 }
 async function stop(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}live.srcObject=null;cameraPanel.hidden=true}
 cameraButton.addEventListener('click',async()=>{
  if(stream){await stop();return}
  if(!navigator.mediaDevices?.getUserMedia){status.textContent='In-page camera unavailable. Use Camera app instead.';return}
  try{stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'}}});live.srcObject=stream;cameraPanel.hidden=false;await live.play()}
  catch{await stop();status.textContent='Camera permission denied or unavailable. Use Camera app to take a picture.'}
 });
 close.addEventListener('click',stop);
 snap.addEventListener('click',async()=>{
  if(!stream||!live.videoWidth){status.textContent='Camera is not ready.';return}
  const canvas=document.createElement('canvas'),w=live.videoWidth,h=live.videoHeight,scale=Math.min(1,1800/Math.max(w,h));
  canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));
  canvas.getContext('2d').drawImage(live,0,0,canvas.width,canvas.height);
  const blob=await new Promise(ok=>canvas.toBlob(ok,'image/jpeg',.92));
  if(!blob){status.textContent='Camera capture failed.';return}
  await addFiles([new File([blob],'Shop-Phi-'+Date.now()+'.jpg',{type:'image/jpeg'})]);
 });
 check.addEventListener('click',async()=>{
  if(!ids.length){status.textContent='Add actual item photos before requesting analysis.';return}
  const endpoint=config.reviewEndpoint;
  if(typeof endpoint!=='string'||!/^\/[A-Za-z0-9/_-]+$/.test(endpoint)||endpoint.startsWith('//')){
   reviewLabel.textContent='Review status: awaiting robot-review service connection.';
   status.textContent='Your media is saved locally. The seller-analysis robot is not connected yet; no authentication or pricing claims were generated.';return
  }
  check.disabled=true;reviewLabel.textContent='Review status: awaiting server response';
  try{
   const fd=new FormData();for(const ref of ids){const entry=await get(ref);if(entry)fd.append('media',entry.blob,entry.name)}
   fd.append('title',fields.title.value||'');fd.append('description',fields.description.value||'');
   const result=await fetch(endpoint,{method:'POST',body:fd,credentials:'same-origin'});
   if(!result.ok)throw Error('Seller review service unavailable.');
   const json=await result.json(),state=['blocked','needs_review','draft_assisted'].includes(json.status)?json.status:'needs_review';
   if(state!=='blocked'){
    if(typeof json.title==='string'&&json.title.trim())fields.title.value=json.title.trim().slice(0,130);
    if(typeof json.description==='string'&&json.description.trim())fields.description.value=json.description.trim().slice(0,20000);
    if(typeof json.priceSuggestion==='string'&&Array.isArray(json.comparables)&&json.comparables.length&&fields.priceLabel)fields.priceLabel.value=json.priceSuggestion.slice(0,55);
   }
   reviewLabel.textContent='Robot assessment: '+state.replace('_',' ')+'. '+(String(json.reason||'').slice(0,260));
   status.textContent='Robot assistance received. This is not proof of authenticity or permission to publish; publication requires server verification.';
  }catch(e){reviewLabel.textContent='Review status: pending';status.textContent=String(e.message||'Review unavailable.')}
  finally{check.disabled=false}
 });
 return Object.freeze({
  ids:()=>ids.slice(),
  hasMedia:()=>ids.length>0,
  clear:()=>{ids=[];void render()},
  async previewIn(item,target){
   if(!Array.isArray(item?.mediaIds)||!item.mediaIds.length)return;
   const deck=el('div',undefined,'sap-media-grid');target.append(deck);
   for(const ref of item.mediaIds.slice(0,10)){
    const file=await get(ref).catch(()=>null);
    if(!file||!deck.isConnected)continue;
    const url=URL.createObjectURL(file.blob),tile=el('div',undefined,'sap-media-thumb');
    const display=el(file.kind==='video'?'video':'img');display.src=url;
    if(file.kind==='video'){display.controls=true;display.preload='metadata'}
    display.alt=file.name;tile.append(display);deck.append(tile);
    display.addEventListener('error',()=>URL.revokeObjectURL(url),{once:true});
    // Revoke URLs when the listing tile is replaced by another item.
    const observer=new MutationObserver(()=>{if(!deck.isConnected){URL.revokeObjectURL(url);observer.disconnect()}});
    observer.observe(target,{childList:true});
   }
  }
 });
}
root.ShopPhiSeller=Object.freeze({mount});
})(window);
