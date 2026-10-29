/* UI-only Quant Mail discovery link. No identity, wallet, email, or auth operations. */
(function(){
 'use strict';
 // Embedded website chat also gets the same safe Mail setup link.
 const mount=()=>{
  const header=document.querySelector('.ba-panel .ba-header');
  const tools=document.querySelector('.ba-panel .ba-tools');
  for(const item of [[header,'Mail'],[tools,'Quant Mail · Setup status']]){
   const [parent,label]=item;
   if(!parent||parent.querySelector('[data-quant-mail-preview]'))continue;
   const link=document.createElement('a');
   link.dataset.quantMailPreview='true';
   link.href='/quant-mail.html';link.target='_blank';link.rel='noopener';
   link.textContent=label;
   link.setAttribute('aria-label','Open Quant Mail setup information');
   link.style.cssText=parent===header?
    'display:inline-flex;align-items:center;justify-content:center;margin-left:auto;margin-right:9px;padding:6px 10px;min-height:40px;border-radius:9px;background:#e8f3fb;color:#174d77;font:700 13px system-ui;text-decoration:none':
    'display:block;margin:9px;padding:10px;border-radius:10px;background:#eff6fb;color:#174d77;font:700 14px system-ui;text-align:center;text-decoration:none';
   const close=parent.querySelector('.ba-close');
   if(close)parent.insertBefore(link,close);else parent.appendChild(link);
  }
  return Boolean(header&&tools);
 };
 if(mount())return;
 if(typeof MutationObserver!=='function')return;
 const observer=new MutationObserver(()=>{if(mount())observer.disconnect();});
 observer.observe(document.documentElement,{subtree:true,childList:true});
})();
