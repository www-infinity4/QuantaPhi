/* First-party sponsor prototype interaction events. No coins, payments, users or attribution claims. */
(function(){
 'use strict';
 const ALLOWED=new Set(['lazercat-2026','illicit-smokos-bruce-banner-2026']);
 const SEEN=new WeakSet();
 function send(element,event){
  const campaign=element.dataset.adCampaign,placement=element.dataset.adPlacement;
  if(!ALLOWED.has(campaign)||!['green-left-arm','green-right-arm','infinity-viewer'].includes(placement))return;
  if(typeof crypto.randomUUID!=='function')return;
  const payload={id:crypto.randomUUID(),campaign,event,placement};
  const body=JSON.stringify(payload);
  // GA4 is client-side directional analytics, never purchase or financial proof.
  try{if(typeof window.gtag==='function')window.gtag('event','sponsor_'+event,{campaign_id:campaign,placement,non_interaction:event==='view'});}catch(_){}
  // A beacon being queued never means that a payable/verified click occurred.
  try{if(navigator.sendBeacon){
    if(navigator.sendBeacon('/api/sponsor-event',new Blob([body],{type:'application/json'})))return;
   }}catch(_){}
  try{fetch('/api/sponsor-event',{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:true,credentials:'omit'}).catch(()=>{});}catch(_){}
 }
 document.addEventListener('click',event=>{
  const link=event.target.closest?.('[data-ad-campaign][data-ad-placement][data-ad-click]');
  if(link)send(link,'click');
 },true);
 function observe(){
  if(!('IntersectionObserver' in window))return;
  const observer=new IntersectionObserver(entries=>{
   for(const entry of entries){
    const el=entry.target;
    clearTimeout(el.__sponsorTimer);
    if(entry.isIntersecting&&entry.intersectionRatio>=0.5){
      el.__sponsorTimer=setTimeout(()=>{
        if(!SEEN.has(el)){SEEN.add(el);send(el,'view');observer.unobserve(el)}
      },1000);
    }
   }
  },{threshold:[0,0.5,1]});
  document.querySelectorAll('[data-ad-view][data-ad-campaign][data-ad-placement]').forEach(el=>observer.observe(el));
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});else observe();
})();
