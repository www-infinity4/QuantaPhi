/* Only published release metadata may label an APK as the latest version. */
(async function(){
 'use strict';
 // Fail closed even if cached release metadata still advertises Platinum.
 for(const link of document.querySelectorAll('[data-apk-download="site"]')){
  link.removeAttribute('href');link.setAttribute('aria-disabled','true');
  link.textContent='Infinity Platinum APK withdrawn — security review';
 }
 for(const label of document.querySelectorAll('[data-apk-version="site"]'))label.textContent='— SECURITY HOLD';
 try{
  const response=await fetch('/api/apk-releases',{cache:'no-store'});
  if(!response.ok)throw Error('Release lookup failed');
  const data=await response.json();
  for(const kind of ['bubbles']){
   const release=data[kind];
   for(const label of document.querySelectorAll('[data-apk-version="'+kind+'"]')){
    label.textContent=release?.version?'v'+release.version:release?.available?'— published '+release.publishedAt.slice(0,10):'— unavailable';
   }
   for(const link of document.querySelectorAll('[data-apk-download="'+kind+'"]')){
    if(!release?.available){
     link.removeAttribute('href');
     link.setAttribute('aria-disabled','true');
     continue;
    }
    // Link directly to the immutable, version-numbered GitHub APK.
    // The Cloudflare streaming proxy can time out on an 85 MB phone download.
    // Keep the same-origin proxy as a fallback for older verified releases.
    let direct=null;
    try{
     const url=new URL(release.url);
     if(url.origin==='https://github.com' &&
       /^\/www-infinity4\/QuantaPhi\/releases\/download\/bubbles-preview-current\/Bubbles-v\d+\.\d+\.\d+-Preview5-Android12\.apk$/.test(url.pathname))direct=url.href;
    }catch{}
    link.href=direct||'/downloads/bubbles.apk';
    link.removeAttribute('aria-disabled');
    link.title='Download '+(release.version?'Bubbles v'+release.version:'Bubbles')+' · '+release.size+' bytes · published '+release.publishedAt;
   }
  }
 }catch{
  for(const label of document.querySelectorAll('[data-apk-version]'))label.textContent='— version check unavailable';
 }
})();
