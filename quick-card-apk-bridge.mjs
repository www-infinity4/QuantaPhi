/* Shared, fail-closed Bubbles launch/install control for first-party Quick Cards.
 * One verified APK powers all cards. A website cannot silently install an APK.
 * This module adds no generic search bar and does not impersonate third-party apps.
 */
const CARD_SELECTOR='.iqc-card[data-source-id], .iqc-card[data-card-id], .premium-card[data-source-id], .sqc-card[data-source-id], [data-quick-card-id]';
const RELEASE_PATH=/^\/www-infinity4\/QuantaPhi\/releases\/download\/bubbles-preview-current\/Bubbles-v\d+\.\d+\.\d+-Preview5-Android12\.apk$/;
const clean=(value,max=120)=>String(value||'').trim().slice(0,max);

export function cardIdentity(element){
 const id=clean(element?.dataset?.sourceId||element?.dataset?.cardId||element?.dataset?.quickCardId||'',90);
 if(!/^[a-zA-Z0-9_-]{1,90}$/.test(id))return null;
 const title=clean(element?.dataset?.sourceName||element?.dataset?.cardTitle||
   element?.querySelector?.('h2,h3')?.textContent||id,120);
 return {id,title};
}
export function bubblesCardUrl(id,title){
 if(!/^[a-zA-Z0-9_-]{1,90}$/.test(String(id||'')))return null;
 const search=new URLSearchParams({sourceCard:String(id),sourceTitle:clean(title,120)});
 return '/bubbles.html?'+search+'#bubblesAICard';
}
export function bubblesNativeCardUrl(id){
 if(!/^[a-zA-Z0-9_-]{1,90}$/.test(String(id||'')))return null;
 return 'quantaphi-bubbles://card/'+encodeURIComponent(String(id));
}
export function verifiedApkUrl(releases){
 const release=releases?.bubbles;
 if(!release||release.available!==true||!release.url)return null;
 try {
  const url=new URL(release.url);
  if(url.protocol!=='https:'||url.hostname!=='github.com'||url.port||
     !RELEASE_PATH.test(url.pathname)||url.search||url.hash||url.username||url.password)return null;
  return url.href;
 }catch{return null;}
}
// Android card VIEW links exist only in APK 0.59.0+; older preview APKs
// cannot receive them. Never advertise a broken native button before the
// verified release feed names the same compatible, versioned APK asset.
export function releasedCardLinkReady(releases){
 const href=verifiedApkUrl(releases), version=releases?.bubbles?.version;
 if(!href||typeof version!=='string'||!/^[0-9]+\\.[0-9]+\\.[0-9]+$/.test(version))return false;
 const matched=new URL(href).pathname.match(/Bubbles-v([0-9]+\\.[0-9]+\\.[0-9]+)-Preview5-Android12\\.apk$/);
 if(!matched||matched[1]!==version)return false;
 const [major,minor]=version.split('.').map(Number);
 return major>0 || (major===0 && minor>=59);
}
async function lookupApk(){
 try{
  const response=await fetch('/api/apk-releases',{cache:'no-store',credentials:'same-origin'});
  if(!response.ok)throw Error('Unverified');
  const releases=await response.json();
  return {href:verifiedApkUrl(releases),nativeReady:releasedCardLinkReady(releases)};
 }catch{return {href:null,nativeReady:false};}
}
function makeLink(text,href,styleClass){
 const a=document.createElement('a');a.className=styleClass;a.textContent=text;
 a.href=href;a.rel='noopener noreferrer';a.setAttribute('aria-label',text);return a;
}
export function mountQuickCardApkBridge(root,apkPromise){
 if(!root||root.dataset.bubblesApkBridge==='1')return false;
 const card=cardIdentity(root);
 if(!card)return false;
 root.dataset.bubblesApkBridge='1';
 const wrapper=document.createElement('nav');
 wrapper.className='bubbles-apk-card-actions';
 wrapper.setAttribute('aria-label',card.title+' Bubbles Android app');
 const open=makeLink('Open Bubbles',bubblesCardUrl(card.id,card.title),'bubbles-card-open');
 // Users can leave X/Instagram active while the Android overlay remains available.
 open.target='_blank';
 const install=document.createElement('span');
 install.className='bubbles-card-install-status';
 install.textContent='Checking verified APK…';
 install.setAttribute('role','status');
 // The web chat remains available until a compatible APK is published.
 wrapper.append(open,install);
 const toolbar=root.querySelector('.qca-controls, .iqc-actions, .premium-actions');
 if(toolbar)toolbar.append(wrapper);
 else root.append(wrapper);
 Promise.resolve(apkPromise).then(release=>{
  if(!root.isConnected)return;
  const href=typeof release==='string'?release:release?.href;
  if(release?.nativeReady&&typeof navigator!=='undefined'&&/Android/i.test(navigator.userAgent||'')){
   // Explicit Android VIEW tap only; never a permission or recording command.
   const native=makeLink('Open in Bubbles APK',bubblesNativeCardUrl(card.id),'bubbles-card-native');
   native.title='Requires installed Bubbles APK 0.59.0 or newer, already running.';
   wrapper.prepend(native);
  }
  if(!href){install.textContent='APK unavailable · security check';return;}
  const a=makeLink('Install Bubbles APK',href,'bubbles-card-install');
  a.setAttribute('download','');
  a.title='Android asks you to confirm an APK download and installation.';
  install.replaceWith(a);
 }).catch(()=>{install.textContent='APK unavailable · security check';});
 return true;
}
export function attachQuickCardApkBridge(doc=document){
 if(!doc?.querySelectorAll||!doc?.documentElement)return ()=>{};
 const apkPromise=lookupApk();
 const scan=(node)=>{
  if(node.nodeType!==1)return;
  if(node.matches?.(CARD_SELECTOR))mountQuickCardApkBridge(node,apkPromise);
  node.querySelectorAll?.(CARD_SELECTOR).forEach(card=>mountQuickCardApkBridge(card,apkPromise));
 };
 doc.querySelectorAll(CARD_SELECTOR).forEach(card=>mountQuickCardApkBridge(card,apkPromise));
 if(typeof MutationObserver==='undefined')return ()=>{};
 const observer=new MutationObserver(changes=>{
  for(const change of changes)for(const node of change.addedNodes)scan(node);
 });
 observer.observe(doc.documentElement,{childList:true,subtree:true});
 return ()=>observer.disconnect();
}
if(typeof document!=='undefined'){
 const start=()=>attachQuickCardApkBridge(document);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
 else start();
}