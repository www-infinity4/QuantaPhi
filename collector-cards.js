/* Infinity 2026® collector-card checkout. No client-side coin deductions.
 * Gold numbering is applied ONLY after the server returns a settled receipt. */
(function(root){
'use strict';
const API='https://quanta-phi-ledger.marvaseater.workers.dev/v1/collector';
const host=document.getElementById('phiImageBuilder');
if(!host)return;
const make=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el};
const panel=make('section','ic-collector oracle-surface');
panel.id='collectorCheckout';panel.hidden=true;
panel.append(make('h3','','Infinity 2026® Collector Edition'),
 make('p','ic-explainer','Publish one finished design. Each buyer pays 1 StarCoin and receives the next permanent gold edition number: 1/1, 1/2, 1/3…'));
const seriesLabel=make('label','ic-series-label','Choose collector series');
const seriesSelect=make('select','ic-series');seriesSelect.setAttribute('aria-label','Card series');
for(const name of ['StarQuest','Chiller','ShopLC','Infinity Radio']){
 const opt=make('option','',name);opt.value=name;seriesSelect.append(opt);
}
seriesLabel.append(seriesSelect);panel.append(seriesLabel);
const actions=make('div','ic-actions');
const publish=make('button','ic-primary','Publish this card design');publish.type='button';
const buy=make('button','','Buy a numbered copy · 1 StarCoin');buy.type='button';buy.disabled=true;
actions.append(publish,buy);
const status=make('p','ic-status','');status.setAttribute('role','status');
const outcome=make('div','ic-outcome');outcome.hidden=true;
const cardImg=make('img','ic-numbered-image');cardImg.alt='Collector image with gold serial number';
const receiptBox=make('div','ic-receipt');
const download=make('a','ic-download','Save gold-numbered card');download.hidden=true;download.download='Infinity-2026-collector.png';
outcome.append(cardImg,receiptBox,download);
panel.append(actions,status,outcome);
const shelf=make('section','ic-shelf');
shelf.id='collectorShelf';shelf.append(make('h3','','My Collector Cards'));
const shelfButton=make('button','','View my purchased cards');shelfButton.type='button';
const shelfStatus=make('p','ic-status','Your verified receipts appear here.');
const shelfRows=make('div','ic-shelf-rows');
shelf.append(shelfButton,shelfStatus,shelfRows);
host.insertAdjacentElement('afterend',shelf);
let activeArtifactId='',activeArtwork='',design=null,working=false,numberedURL='';
function message(s){status.textContent=s}
function reset(){
 design=null;activeArtwork='';activeArtifactId='';buy.disabled=true;publish.disabled=false;publish.textContent='Publish this card design';outcome.hidden=true;
 if(numberedURL)URL.revokeObjectURL(numberedURL);numberedURL='';cardImg.removeAttribute('src');download.hidden=true;
}
function refresh(){
 const item=root.PhiImageBuilder?.get?.(),art=item?.artifact;
 if(!art||!item.result||art.mode!=='Trading Card'||host.dataset.stage!=='finished'){panel.hidden=true;return;}
 if(activeArtifactId!==art.id||activeArtwork!==item.result){reset();activeArtifactId=art.id;activeArtwork=item.result;message('Design not published yet. No StarCoins will be charged to publish artwork.');}
 panel.hidden=false;
 host.querySelector('.pi-finished')?.append(panel);
}
async function request(path,method,body){
 if(!root.QuantaCloudConnection?.authenticatedFetch)throw Error('Connect the authenticated unified wallet to continue.');
 const response=await root.QuantaCloudConnection.authenticatedFetch(API+path,{method,...(body?{body}:{})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||!data.ok)throw Error(data.error||'Collector service unavailable');
 return data;
}
async function asDataURL(src){
 const response=await fetch(src);if(!response.ok)throw Error('Finished image could not be read');
 const blob=await response.blob();if(blob.size>8000000)throw Error('This image exceeds the 8 MB collector storage limit');
 if(!['image/png','image/jpeg','image/webp'].includes(blob.type))throw Error('Save the finished image as PNG, JPEG, or WebP first');
 return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read image'));reader.readAsDataURL(blob)});
}
async function publishDesign(){
 const at=root.PhiImageBuilder?.get?.();if(working||!at?.artifact||at.artifact.id!==activeArtifactId||!activeArtwork)return;
 working=true;publish.disabled=true;message('Saving the exact finished artwork for collector issuance…');
 try{
  const imageDataUrl=await asDataURL(activeArtwork);
  const title=String(at.artifact.prompt||'Infinity 2026 Original Card').trim().slice(0,140);
  const response=await request('/designs','POST',{title,renderId:activeArtifactId,prompt:String(at.artifact.prompt||''),series:seriesSelect.value,imageDataUrl});
  if(root.PhiImageBuilder?.get?.()?.artifact?.id!==activeArtifactId){message('A newer image replaced this design. Its published copy remains unchanged.');return;}
  design=response;buy.disabled=false;publish.textContent='Design published';message('Design is saved. Gold serial numbers are assigned upon successful 1 StarCoin purchases.');
 }catch(error){publish.disabled=false;message(String(error?.message||error)+'. No purchase was made.')}
 finally{working=false;}
}
function safeStorageRead(key){try{return localStorage.getItem(key)}catch{return null}}
function safeStorageSet(key,value){try{localStorage.setItem(key,value)}catch{}}
function safeStorageDelete(key){try{localStorage.removeItem(key)}catch{}}
async function goldImage(src,edition){
 const image=new Image();image.crossOrigin='anonymous';image.decoding='async';
 await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Artwork unavailable for numbered download'));image.src=src});
 const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
 const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
 const size=Math.max(24,Math.round(canvas.width*.06));
 ctx.font='900 '+size+'px Georgia,serif';const pad=size*.38,text='1/'+edition;
 const x=canvas.width-pad,y=canvas.height-pad;
 ctx.textAlign='right';ctx.textBaseline='bottom';ctx.lineJoin='round';ctx.lineWidth=Math.max(3,size*.09);
 ctx.strokeStyle='#292014';ctx.shadowColor='#1d0f00';ctx.shadowBlur=size*.12;ctx.strokeText(text,x,y);ctx.fillStyle='#f7d36e';ctx.fillText(text,x,y);
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(URL.createObjectURL(blob)):reject(Error('Could not save the gold-numbered image')),'image/png'));
}
function receiptView(receipt,synced){
 receiptBox.replaceChildren();
 const lines=[['Edition',receipt.goldEdition],['Asset token',receipt.assetTokenId],['Receipt',receipt.receiptId],['Paid',String(receipt.purchasePriceStarCoins)+' StarCoin'],['Quant data',synced?'Recorded':'Sync pending; receipt remains valid'],['Resale value','Not determined by purchase price']];
 for(const [key,value] of lines){const div=make('div','','');div.append(make('strong','',key+': '),document.createTextNode(String(value)));receiptBox.append(div)}
}
async function buyCopy(){
 if(!design||working)return;
 const key='quantaphi:collector:pending:'+design.designId;
 let requestId=safeStorageRead(key);
 if(!requestId){requestId='card-buy:'+crypto.randomUUID();safeStorageSet(key,requestId);}
 working=true;buy.disabled=true;message('Confirming the 1 StarCoin purchase with your StarQuest wallet…');
 try{
  const response=await request('/purchase','POST',{designId:design.designId,requestId});
  receiptView(response.receipt,response.quantDataSynced);
  outcome.hidden=false;
  if(numberedURL)URL.revokeObjectURL(numberedURL);
  numberedURL=await goldImage(activeArtwork,response.receipt.serialNumber).catch(()=>null);
  if(numberedURL){cardImg.src=numberedURL;download.href=numberedURL;download.hidden=false;download.download='Infinity-2026-'+response.receipt.goldEdition.replace('/','-')+'.png';}
  else{cardImg.removeAttribute('src');download.hidden=true;}
  safeStorageDelete(key); // Cleared only after a confirmed server receipt.
  message('Purchased edition '+response.receipt.goldEdition+'. Its serial and receipt are permanent.'+(response.quantDataSynced?'':' Quant mirror will retry.'));
  buy.textContent='Buy another copy · 1 StarCoin';
  root.ControlPhi?.refreshCloudWallet?.();
 }catch(error){message(String(error?.message||error)+'. If this timed out, retry uses the SAME purchase ID; no extra charge.')}
 finally{working=false;buy.disabled=false;}
}
const artObjects=new Set();
async function ownedArt(designId){
 const resp=await root.QuantaCloudConnection.authenticatedFetch(API+'/preview/'+encodeURIComponent(designId),{method:'GET'});
 if(!resp.ok)throw Error('Collector artwork unavailable ('+resp.status+')');
 const file=await resp.blob();
 if(!/^image\/(png|jpeg|webp)$/.test(file.type))throw Error('Invalid collector artwork');
 const url=URL.createObjectURL(file);artObjects.add(url);return url;
}
root.addEventListener('pagehide',()=>{for(const u of artObjects)URL.revokeObjectURL(u);artObjects.clear()});
async function myCards(){
 shelfButton.disabled=true;shelfStatus.textContent='Loading your settled collector receipts…';
 try{
  const response=await request('/copies','GET');
  shelfRows.replaceChildren();
  if(!response.copies.length){shelfStatus.textContent='No purchased collector cards yet.';return;}
  shelfStatus.textContent=response.copies.length+' recent owned cards';
  for(const item of response.copies){
   const r=item.receipt;const card=make('article','ic-owned');
   const frame=make('div','ic-owned-art');const img=make('img');img.loading='lazy';img.alt=r.title;
   const loadOwned=async()=>{try{img.src=await ownedArt(r.designId)}catch{img.alt='Collector artwork temporarily unavailable'}};
   if('IntersectionObserver' in root){
    const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();void loadOwned()}});
    observer.observe(frame);
   }else void loadOwned();
   frame.append(img,make('span','ic-gold-number',r.goldEdition));
   const details=make('div');details.append(make('strong','',r.title),make('p','','Gold edition '+r.goldEdition+' · '+r.purchasePriceStarCoins+' StarCoin'));
   const token=make('small','',r.assetTokenId+' · '+(item.quantDataSynced?'Quant data saved':'Quant data pending'));
   const save=make('button','ic-save-owned','Save numbered image');save.type='button';
   save.addEventListener('click',async()=>{save.disabled=true;try{const privateUrl=img.src.startsWith('blob:')?img.src:await ownedArt(r.designId);const u=await goldImage(privateUrl,r.serialNumber);const link=document.createElement('a');link.href=u;link.download='Infinity-2026-'+r.goldEdition.replace('/','-')+'.png';link.click();setTimeout(()=>URL.revokeObjectURL(u),20000);}catch(error){shelfStatus.textContent='Numbered download unavailable: '+String(error?.message||error)}finally{save.disabled=false;}});
   details.append(token,save);card.append(frame,details);shelfRows.append(card);
  }
 }catch(error){shelfStatus.textContent=String(error?.message||error);}
 finally{shelfButton.disabled=false;}
}
publish.addEventListener('click',publishDesign);
buy.addEventListener('click',buyCopy);
shelfButton.addEventListener('click',myCards);
root.addEventListener('phi:image:build:done',()=>queueMicrotask(refresh));
root.addEventListener('phi:image:build:cleared',()=>{reset();panel.hidden=true});
root.addEventListener('phi:image:build:lettering',()=>queueMicrotask(refresh));
root.addEventListener('hashchange',()=>{if(location.hash==='#collectorShelf')void myCards()});
refresh();
})(window);
