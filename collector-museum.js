/* Infinity 2026® Card Museum: four official series; hidden until first sale + one week.
 * These are original Infinity cards, not imported Google widgets or third-party assets. */
(function(root){
'use strict';
const rootEl=document.getElementById('collectorShelf');
if(!rootEl)return;
const API='https://quanta-phi-ledger.marvaseater.workers.dev/v1/collector';
const SERIES=[['StarQuest','star','Stars, research, and the StarQuest universe'],
 ['Chiller','moon','Classic suspense and original spooky artwork'],
 ['ShopLC','gem','Collector-commerce and shopping discoveries'],
 ['Infinity Radio','radio','Radio, music history, and collectible episodes']];
const $=(tag,cl,txt)=>{const el=document.createElement(tag);if(cl)el.className=cl;if(txt!==undefined)el.textContent=txt;return el};
const museum=$('section','ic-museum oracle-surface');museum.id='collectorMuseum';
museum.append($('span','ic-kicker','INFINITY 2026® · DIGITAL COLLECTION'),$('h2','','The Card Museum'),
 $('p','ic-intro','Every Infinity card design has one museum slot. Your wallet owns the individually numbered copies you purchase. New artwork stays concealed in the public museum until seven days after the first sale. Preview any card offered for sale before spending a StarCoin.'));
const toolbar=$('div','ic-museum-tools'),refresh=$('button','','Refresh museum'),owned=$('a','','My owned cards');
refresh.type='button';owned.href='#collectorShelf';toolbar.append(refresh,owned);museum.append(toolbar);
const info=$('p','ic-status','');
const sections=$('div','ic-series-grid');museum.append(info,sections);
rootEl.insertAdjacentElement('afterend',museum);
let loading=false,previewURLs=new Set(),ownedDesigns=new Set(),entries=[];
const textError=(e)=>String(e?.message||e||'Unavailable');
const read=(key)=>{try{return localStorage.getItem(key)}catch{return null}};
const set=(key,val)=>{try{localStorage.setItem(key,val)}catch{}};
const del=(key)=>{try{localStorage.removeItem(key)}catch{}};
const authed=async(path,method,body)=>{
 if(!root.QuantaCloudConnection?.authenticatedFetch)throw Error('Your StarQuest wallet is not connected');
 const response=await root.QuantaCloudConnection.authenticatedFetch(API+path,{method,...(body?{body}:{})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||!data.ok)throw Error(data.error||'Museum checkout unavailable');
 return data;
};
const preview=async(designId)=>{
 if(!root.QuantaCloudConnection?.authenticatedFetch)throw Error('Connect your StarQuest wallet to preview unrevealed cards');
 const response=await root.QuantaCloudConnection.authenticatedFetch(API+'/preview/'+encodeURIComponent(designId),{method:'GET'});
 if(!response.ok)throw Error('Preview unavailable ('+response.status+')');
 const blob=await response.blob();if(!blob.type.startsWith('image/'))throw Error('Image not available');
 const uri=URL.createObjectURL(blob);previewURLs.add(uri);return uri;
};
root.addEventListener('pagehide',()=>{for(const u of previewURLs)URL.revokeObjectURL(u);previewURLs.clear()});
function draw(){
 sections.replaceChildren();
 for(const [name,icon,description] of SERIES){
  const section=$('section','ic-series ic-'+icon);
  section.append($('h3','',name),$('p','',description));
  const list=entries.filter(x=>x.series===name);
  section.append($('small','',list.length?list.length+' original card design'+(list.length===1?'':'s'):'No card designs issued yet'));
  if(!list.length){
   const empty=$('div','ic-empty-slot');
   empty.append($('strong','','Unredeemed slot'),$('span','','Artwork arrives when this collection begins.'));
   section.append(empty);
  }
  for(const card of list){
   const item=$('article','ic-museum-item'),art=$('div','ic-museum-art');
   const owned=ownedDesigns.has(card.designId);
   if(card.revealed&&card.artUrl){
    const pic=$('img');pic.loading='lazy';pic.src=card.artUrl;pic.alt=card.title;art.append(pic);
   }else{
    art.append($('strong','','?'),$('small','','SEALED SLOT'));
   }
   const details=$('div','ic-museum-details');
   details.append($('strong','',card.title),
    $('p','',card.revealed?'Public museum · '+card.sold+' numbered copies issued':'Sealed first-week display · sale preview available'),
    $('small','',owned?'Owned in your StarQuest wallet':(card.revealed?'Unowned · collect an edition':'Unredeemed museum slot')));
   const button=$('button','','Preview card · Free');button.type='button';
   const purchase=$('button','ic-primary','Buy numbered card · 1 StarCoin');purchase.type='button';purchase.disabled=true;
   const status=$('p','ic-status','Select Preview to see the exact artwork before paying.');
   let openedURL='',pending=false;
   button.addEventListener('click',async()=>{
    button.disabled=true;status.textContent='Opening the original artwork…';
    try{
     if(!openedURL)openedURL=await preview(card.designId);
     art.replaceChildren();const img=$('img');img.src=openedURL;img.alt='Preview of '+card.title;art.append(img);
     purchase.disabled=false;status.textContent='Preview only, no charge. Purchase issues the next permanent gold number.';
    }catch(error){status.textContent=textError(error);button.disabled=false;return}
    button.textContent='Card preview opened';
   });
   purchase.addEventListener('click',async()=>{
    if(pending||!openedURL)return;
    const localKey='quantaphi:collector:pending:'+card.designId;
    let requestId=read(localKey);
    if(!requestId){requestId='museum-buy:'+crypto.randomUUID();set(localKey,requestId)}
    pending=true;purchase.disabled=true;status.textContent='Confirming 1 StarCoin with your authenticated wallet…';
    try{
     const result=await authed('/purchase','POST',{designId:card.designId,requestId});
     del(localKey);
     ownedDesigns.add(card.designId);
     status.textContent='Purchased '+result.receipt.goldEdition+' · Receipt '+result.receipt.receiptId+(result.quantDataSynced?' · Quant data saved':' · Quant data pending reconciliation');
     root.ControlPhi?.refreshCloudWallet?.();
     void reload();
    }catch(error){status.textContent=textError(error)+'. Retry preserves the same purchase request, without a second charge.';}
    finally{pending=false;purchase.disabled=false}
   });
   const controls=$('div','ic-museum-controls');controls.append(button,purchase);
   details.append(controls,status);item.append(art,details);section.append(item);
  }
  sections.append(section);
 }
}
async function reload(){
 if(loading)return;
 loading=true;refresh.disabled=true;info.textContent='Reading live museum slots…';
 try{
  const response=await fetch(API+'/museum',{cache:'no-store'});
  const data=await response.json().catch(()=>({}));
  if(!response.ok||!data.ok)throw Error(data.error||'Museum temporarily unavailable');
  entries=data.cards||[];
  info.textContent=entries.length+' published card design'+(entries.length===1?'':'s')+' · Reveals begin seven days after each design’s first sale. Total editions continue counting after reveal.';
  draw();
  // Ownership affects labels, never the museum's public reveal schedule.
  authed('/copies','GET').then(x=>{ownedDesigns=new Set(x.copies.map(item=>item.receipt.designId));draw()}).catch(()=>{});
 }catch(error){info.textContent='Museum catalog not yet online: '+textError(error);draw();}
 finally{loading=false;refresh.disabled=false}
}
refresh.addEventListener('click',reload);
void reload();
})(window);
