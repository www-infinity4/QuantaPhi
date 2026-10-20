(() => {
 'use strict';
 const a=window.INFINITY_SELECTED_APP;if(!a)return;
 const view=document.getElementById('appView');
 const source=document.getElementById('sourceUrl');
 const brand=document.getElementById('appBrand');
 const status=document.getElementById('installStatus');
 const btn=document.getElementById('installApp');
 const website=a.url+(a.focus?'#'+encodeURIComponent(a.focus):'');
 // Registered Bubbles card host renders ONLY the selected card. No unrelated
 // homepage UI, accounts, tickets or other autoplay media are injected.
 const target=a.card?'/bubbles-card-host.html?card='+encodeURIComponent(a.card):
  a.miniUrl||website;
 const compact=Boolean(a.card||a.miniUrl);
 document.body.dataset.mode=compact?'card':'site';
 brand.textContent=a.name;source.href=website;
 view.title=a.name+(compact?' compact card':' live website');
 view.src=target;
 let installEvent=null;
 const standalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
 const help='In Chrome: ⋮ → Install app or Add to Home screen.';
 status.textContent=compact?'Loading the actual '+a.name+' card…':'Opening '+a.name+'…';
 if(standalone()){btn.hidden=true;status.textContent='Installed '+a.name+' app';}
 view.addEventListener('load',()=>{
  // HTTP status of a cross-origin page cannot be inferred from iframe load.
  // For same-origin cards, the existing diagnostics reports actual mount errors.
  if(a.card){
   setTimeout(()=>{
    try{
     const evidence=view.contentWindow?.BubblesCardDiagnostics?.();
     if(!evidence||evidence.loaded!==true){
      status.textContent='The card has not finished loading. '+(evidence?.errors?.[0]||'Open the full page for details.');
      status.dataset.state='unverified';return;
     }
     status.textContent=standalone()?'Card ready':'Card ready · '+help;
     status.dataset.state='ready';
    }catch{status.textContent='Card load could not be verified; '+help;status.dataset.state='unverified'}
   },1500);
  }else if(!standalone()){
   status.textContent=help+' Playback and credits depend on the real source.';
  }
 });
 window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();installEvent=event;btn.hidden=false;
  status.textContent='Chrome can install '+a.name+'.';
 });
 btn.addEventListener('click',async()=>{
  if(!installEvent){status.textContent=help;return}
  const current=installEvent;installEvent=null;btn.disabled=true;
  try{await current.prompt();const result=await current.userChoice;
   status.textContent=result?.outcome==='accepted'?'Chrome accepted the installation.':
    'Installation cancelled. '+help;
  }catch{status.textContent=help}
  finally{btn.disabled=false}
 });
 window.addEventListener('appinstalled',()=>{btn.hidden=true;status.textContent=a.name+' installed.'});
 if(isSecureContext&&'serviceWorker'in navigator)
  window.addEventListener('load',()=>navigator.serviceWorker.register('/apps/sw.js',{scope:'/apps/'}).catch(()=>{}));
})();
