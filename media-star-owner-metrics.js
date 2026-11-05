/* Authenticated publisher metrics for reviewed Media Star cards.
 * No customer identity, recipient wallet, or payout is derived from clicks.
 */
(()=>{
 'use strict';
 const host=document.getElementById('mediaStarCreator');
 if(!host)return;
 const panel=document.createElement('section');
 panel.className='ms-owner-metrics';
 panel.style.cssText='border:1px solid #cbbeb2;border-radius:14px;background:#f8f5ef;color:#453948;padding:14px;margin:14px 0;line-height:1.65;letter-spacing:.015em';
 const title=document.createElement('h3');title.textContent='My Media Star performance';
 const text=document.createElement('p');text.textContent='Read recorded activity for your reviewed public cards. This is not a payment ledger.';
 const button=document.createElement('button');button.type='button';button.textContent='Check my Media Star clicks';button.style.cssText='background:#fdfaf4;color:#413448;border:1px solid #bbafbb;padding:10px 14px;min-height:44px;border-radius:12px;cursor:pointer;font-weight:700';
 const status=document.createElement('p');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 status.textContent='Tracking not connected. No recorded click total is available.';
 const results=document.createElement('div');
 panel.append(title,text,button,status,results);host.append(panel);
 const format=n=>Number.isFinite(Number(n))&&Number(n)>=0?Number(n).toLocaleString(undefined,{maximumFractionDigits:1}):'unavailable';
 function entry(label,value){const p=document.createElement('p');p.textContent=label+': '+value;results.append(p)}
 async function refresh(){
  const endpoint=String(window.PhiMediaStarGalleryEndpoint||'').replace(/\/$/,'');
  if(!/^https:\/\/[A-Za-z0-9.-]+$/.test(endpoint)){
   status.textContent='Tracking not connected. No recorded click total is available.';results.replaceChildren();return;
  }
  button.disabled=true;status.textContent='Checking signed-in creator performance…';results.replaceChildren();
  try{
   const token=await window.QuantaCloudConnection?.resolveDeviceToken?.();
   if(!/^sq_[A-Za-z0-9_-]{32,}$/.test(token||''))throw Error('wallet_login_required');
   const ctrl=new AbortController();const timeout=setTimeout(()=>ctrl.abort(),12000);
   let response;
   try{
    response=await fetch(endpoint+'/v1/my/metrics',{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:ctrl.signal});
   }finally{clearTimeout(timeout)}
   const data=await response.json().catch(()=>({}));
   if(!response.ok||!data.ok||data.browserObservedOnly!==true||!Array.isArray(data.metrics))throw Error('unavailable');
   status.textContent='Browser-observed metrics for your account, last '+format(data.periodDays)+' days.';
   if(!data.metrics.length)entry('Approved-card activity','No events returned by the connected collector for this reporting window.');
   for(const card of data.metrics.slice(0,50)){
    entry(String(card.title||'Untitled media')+' · '+String(card.id||''),
     format(card.impressions)+' observed session impressions · '+format(card.uniqueClicks)+' clicked sessions · '+format(card.clickEvents)+' clicks · '+format(card.playIntents)+' play attempts · CTR '+(card.ctrPercent===null?'not measurable':format(card.ctrPercent)+'%'));
   }
   entry('Payout status','No server-confirmed payout total is supplied. Clicks, attempts and impressions are not paid StarCoins.');
  }catch{
   status.textContent='Authenticated Media Star statistics are unavailable; missing data is not a zero-click claim.';
   results.replaceChildren();
  }finally{button.disabled=false}
 }
 button.addEventListener('click',()=>void refresh());
 document.addEventListener('starquest:auth-changed',()=>{status.textContent='Account changed. Check your own metrics again.';results.replaceChildren()});
})();
