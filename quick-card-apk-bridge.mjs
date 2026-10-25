/* Shared, fail-closed Bubbles launch/install control for first-party Quick Cards.
 * One verified APK powers all cards. A website cannot silently install an APK.
 * This module adds no generic search bar and does not impersonate third-party apps.
 */
const CARD_SELECTOR='.iqc-card[data-source-id], .iqc-card[data-card-id], .premium-card[data-source-id], [data-quick-card-id]';
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
async function lookupApk(){
 try{
  const response=await fetch('/api/apk-releases',{cache:'no-store',credentials:'same-origin'});
  if(!response.ok)throw Error('Unverified');
  return verifiedApkUrl(await response.json());
 }catch{return null;}
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
 wrapper.append(open,install);
 const toolbar=root.querySelector('.qca-controls, .iqc-actions, .premium-actions');
 if(toolbar)toolbar.append(wrapper);
 else root.append(wrapper);
 Promise.resolve(apkPromise).then(href=>{
  if(!root.isConnected)return;
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