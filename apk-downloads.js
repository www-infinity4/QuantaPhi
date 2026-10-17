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
    if(!release?.available){link.removeAttribute('href');link.setAttribute('aria-disabled','true');}
    else link.title=release.name+' · '+release.size+' bytes · published '+release.publishedAt;
   }
  }
 }catch{
  for(const label of document.querySelectorAll('[data-apk-version]'))label.textContent='— version check unavailable';
 }
})();
