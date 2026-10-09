/* Connect locally generated Phi artwork to its originating Infinite Book story.
   Image blobs remain on this device until a public asset service is wired up. */
(function(){
'use strict';
const book=document.getElementById('infiniteBook');
const builder=document.getElementById('phiImageBuilder');
if(!book||!builder)return;
const databaseName='phi_book_illustrations_v1';
const storeName='stories';
let currentObjectUrl='',renderTicket=0;
let selectedStory=null,buildStory=null,finishedStory=null,visibleIllustration=null,attaching=false;
const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const storyCard=()=>book.querySelector('.ib-story');
const storyId=()=>storyCard()?.dataset.storyId||'';
const storyTitle=()=>book.querySelector('.ib-title')?.textContent||'';
const notify=(message)=>{const area=builder.dataset.stage==='finished'?builder.querySelector('.pi-finished .pi-notice'):builder.querySelector('.pi-composer .pi-notice');if(area)area.textContent=message};
function openDatabase(){
 return new Promise((resolve,reject)=>{
  if(!window.indexedDB){reject(Error('Image storage is unavailable on this device'));return}
  const request=indexedDB.open(databaseName,1);
  request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(storeName))request.result.createObjectStore(storeName,{keyPath:'storyId'})};
  request.onerror=()=>reject(request.error||Error('Cannot open image storage'));
  request.onsuccess=()=>resolve(request.result);
 });
}
async function stored(story){
 const db=await openDatabase();
 try{return await new Promise((resolve,reject)=>{
  const tx=db.transaction(storeName,'readonly'),request=tx.objectStore(storeName).get(story);
  request.onsuccess=()=>resolve(request.result||null);request.onerror=()=>reject(request.error);
 })}finally{db.close()}
}
async function write(record){
 const db=await openDatabase();
 try{await new Promise((resolve,reject)=>{
  const tx=db.transaction(storeName,'readwrite');
  tx.objectStore(storeName).put(record);
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('Cannot save story image'));
 })}finally{db.close()}
}
async function erase(story){
 const db=await openDatabase();
 try{await new Promise((resolve,reject)=>{
  const tx=db.transaction(storeName,'readwrite');
  tx.objectStore(storeName).delete(story);
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('Cannot remove story image'));
 })}finally{db.close()}
}
const panel=make('figure','ib-illustration');
panel.hidden=true;
const picture=make('img','ib-illustration-image');picture.alt='Illustration made for this book story';picture.loading='lazy';
const description=make('figcaption','ib-illustration-caption','Your story illustration · saved on this device');
const panelActions=make('div','ib-illustration-actions');
for(const [action,label] of [['view','View clear image'],['remove','Remove image']]){
 const button=make('button','ib-action',label);button.type='button';button.dataset.ibImage=action;panelActions.append(button)
}
panel.append(picture,description,panelActions);
function placePanel(){
 const card=storyCard(),details=card?.querySelector('.ib-details');
 if(card&&details&&panel.parentElement!==card)card.insertBefore(panel,details)
}
async function refresh(){
 const ticket=++renderTicket,id=storyId();
 placePanel();
 visibleIllustration=null;
 panel.hidden=true;
 picture.removeAttribute('src');
 if(currentObjectUrl){URL.revokeObjectURL(currentObjectUrl);currentObjectUrl=''}
 if(!id)return;
 try{
  const record=await stored(id);
  if(ticket!==renderTicket||storyId()!==id)return;
  if(!record?.blob)return;
  currentObjectUrl=URL.createObjectURL(record.blob);
  picture.src=currentObjectUrl;
  picture.alt='Created illustration for '+(record.storyTitle||storyTitle());
  description.textContent='Your story illustration · saved on this device';
  panel.hidden=false;
  visibleIllustration={storyId:id,artifactId:record.artifactId,createdAt:record.createdAt};
 }catch(error){console.warn('Phi story image unavailable',error)}
}
const modal=make('dialog','pi-clean-dialog');
const fullImage=make('img','pi-clean-image');
fullImage.alt='Full-size finished artwork';
const close=make('button','pi-clean-close','Close image');
close.type='button';
close.addEventListener('click',()=>hidePreview());
modal.addEventListener('click',event=>{if(event.target===modal)hidePreview()});
modal.append(close,fullImage);
document.body.append(modal);
function showPreview(src){
 if(!src)return;
 fullImage.src=src;
 if(typeof modal.showModal==='function'&&!modal.open)modal.showModal();
 else{modal.setAttribute('open','');modal.classList.add('pi-dialog-fallback')}
}
function hidePreview(){
 if(typeof modal.close==='function'&&modal.open)modal.close();
 modal.removeAttribute('open');modal.classList.remove('pi-dialog-fallback');
 fullImage.removeAttribute('src');
}
const actionArea=builder.querySelector('.pi-finished .pi-actions');
if(actionArea){
 for(const [key,label] of [['preview','View clear image'],['attach','Update story image']]){
  const b=make('button','pi-wide',label);b.type='button';b.dataset.piBook=key;actionArea.append(b)
 }
}
const sourceArea=builder.querySelector('.pi-composer .pi-options');
if(sourceArea){
 const add=make('button','pi-add-story','Add visible story to prompt');add.type='button';add.dataset.piBook='use-story';
 sourceArea.after(add);
}
book.addEventListener('click',event=>{
 const target=event.target.closest('[data-book-action="illustrate"]');
 if(target){
  selectedStory={id:storyId(),title:storyTitle()};
 }
},true);
window.addEventListener('phi:image:build:start',()=>{
 const checked=builder.querySelector('#pi-story')?.checked;
 buildStory=checked?{id:storyId(),title:storyTitle()}:null;
 if(checked&&selectedStory?.id===storyId())buildStory=selectedStory;
});
window.addEventListener('phi:image:build:done',()=>{
 finishedStory=buildStory?.id?buildStory:null;
 // The reviewed finished image is the product. Store it immediately with its
 // original story; the reader must not have to tap another attach button.
 if(finishedStory?.id)void attach(true);
});
window.addEventListener('phi:story:render',()=>{void refresh()});
async function attach(automatic=false){
 if(attaching)return;
 const data=window.PhiImageBuilder?.get?.();
 if(!data?.artifact||!data.result){notify('Finish building an image first.');return}
 const destination=finishedStory?.id?finishedStory:{id:storyId(),title:storyTitle()};
 if(!destination.id){notify('Open a book story before attaching an image.');return}
 attaching=true;
 try{
  const blob=await window.PhiVisualRender.asBlob(data.result);
  if(!blob.type.startsWith('image/'))throw Error('The result is not a supported image');
  await write({storyId:destination.id,storyTitle:destination.title,artifactId:data.artifact.id,
   blob,createdAt:new Date().toISOString()});
  if(storyId()===destination.id)await refresh();
  window.dispatchEvent(new CustomEvent('phi:story:image-attached',{detail:{storyId:destination.id,artifactId:data.artifact.id}}));
  notify((automatic?'Finished illustration automatically included in "':'Updated illustration for "')+destination.title+'". Saved on this device for story viewing and supported sharing.');
 }catch(error){notify('Could not attach image: '+String(error?.message||error))}
 finally{attaching=false}
}
builder.addEventListener('click',event=>{
 const action=event.target.closest('[data-pi-book]')?.dataset.piBook;
 if(action==='preview'){
  const src=window.PhiImageBuilder?.get?.().result;
  if(src)showPreview(src);
 }
 if(action==='attach'){
  const data=window.PhiImageBuilder?.get?.();
  const destination=finishedStory?.id?finishedStory:{id:storyId(),title:storyTitle()};
  if(destination.id&&visibleIllustration?.storyId===destination.id&&visibleIllustration?.artifactId===data?.artifact?.id){
   // Already included. This control should now open an edit, not pointlessly
   // save the same pixels a second time.
   const use=builder.querySelector('#pi-story');if(use)use.checked=true;
   selectedStory=destination;
   builder.querySelector('[data-pi-action="fix"]')?.click();
  }else void attach();
 }
 if(action==='use-story'){
  const title=storyTitle(),summary=book.querySelector('.ib-summary')?.textContent||'';
  if(!title){notify('There is no visible story to add.');return}
  const prompt=builder.querySelector('#pi-prompt');
  if(!prompt)return;
  const text='Story context: '+title+'. '+summary;
  prompt.value=[prompt.value.trim(),text].filter(Boolean).join('\n\n').slice(0,3000);
  const use=builder.querySelector('#pi-story');if(use)use.checked=true;
  selectedStory={id:storyId(),title};
  notify('Added the visible story. You can switch to another story and add more context before building.');
 }
});
book.addEventListener('click',event=>{
 const type=event.target.closest('[data-ib-image]')?.dataset.ibImage;
 if(type==='view'&&currentObjectUrl)showPreview(currentObjectUrl);
 if(type==='remove'&&storyId()){
  const id=storyId();
  void erase(id).then(()=>refresh()).catch(error=>{const p=book.querySelector('.ib-status');if(p)p.textContent='Could not remove image: '+error.message});
 }
});
picture.addEventListener('click',()=>{if(currentObjectUrl)showPreview(currentObjectUrl)});
async function shareStory(story,url){
 let record=null;
 try{record=await stored(story.id)}catch(error){console.warn('Story image read failed',error);return{handled:false,imageMissing:true}}
 if(!record?.blob)return{handled:false};
 if(typeof navigator.share!=='function'||typeof navigator.canShare!=='function')
  return{handled:false,imageMissing:true};
 const extension=record.blob.type==='image/jpeg'?'jpg':record.blob.type==='image/webp'?'webp':'png';
 const file=new File([record.blob],'infinite-book-story-'+String(story.id).replace(/[^a-z0-9-]/gi,'-')+'.'+extension,{type:record.blob.type||'image/png'});
 if(!navigator.canShare({files:[file]}))return{handled:false,imageMissing:true};
 const body=[story.title,story.full||story.summary,'Original source: '+story.sourceUrl,'Open the story: '+url].filter(Boolean).join('\n\n').slice(0,4200);
 try{
  await navigator.share({title:story.title,text:body,url,files:[file]});
  return{handled:true,success:true}
 }catch(error){
  return{handled:true,success:false,message:error?.name==='AbortError'?'Share cancelled. No credit issued.':'Could not share story and picture: '+String(error?.message||error)}
 }
}
window.PhiBookImageBridge={shareStory,refresh,attached:()=>visibleIllustration};
void refresh();
})();
