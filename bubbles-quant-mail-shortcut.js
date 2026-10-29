/* Make Quant Mail accessible from the actual Bubbles chat, including
 * its retained Android WebView UI. A link opens a separate viewer/tab and
 * never submits messages, replaces drafts or changes the wallet.
 */
(function(){
 'use strict';
 const add=(parent,label,placeBeforeClose=false)=>{
  if(!parent||parent.querySelector('[data-quant-mail-entry]'))return false;
  const link=document.createElement('a');
  link.href='/quant-mail.html';link.target='_blank';link.rel='noopener';
  link.dataset.quantMailEntry='true';
  link.textContent=label;
  link.setAttribute('aria-label','Open Quant Mail sign-in');
  link.style.cssText=placeBeforeClose?
   'display:inline-flex;align-items:center;justify-content:center;margin-left:auto;margin-right:10px;padding:7px 10px;min-height:36px;border-radius:9px;background:#eaf3fb;color:#135383;font:700 13px system-ui;text-decoration:none;':
   'display:flex;align-items:center;justify-content:center;padding:11px 13px;min-height:44px;margin:10px 6px;border:1px solid #9ebacc;border-radius:10px;color:#145484;background:#f5faff;font:700 14px system-ui;text-decoration:none;';
  if(placeBeforeClose&&parent.querySelector('.ba-close'))parent.insertBefore(link,parent.querySelector('.ba-close'));
  else parent.appendChild(link);
  return true;
 };
 const mount=()=>{
  const header=document.querySelector('.ba-panel .ba-header');
  const tools=document.querySelector('.ba-panel .ba-tools');
  if(header)add(header,'Mail',true);
  if(tools)add(tools,'Quant Mail · Email sign-in');
  return Boolean(header&&tools);
 };
 if(!mount()&&typeof MutationObserver==='function'){
  const observer=new MutationObserver(()=>{if(mount())observer.disconnect();});
  observer.observe(document.documentElement,{childList:true,subtree:true});
 }
 if(typeof addEventListener==='function')addEventListener('pageshow',mount);
})();
