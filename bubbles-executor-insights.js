/* Read-only executor attribution and Media Star insights beside Bubbles wallet.
 * No balance is minted or changed by this display.
 */
(()=>{
 'use strict';
 const wallet=document.getElementById('bubblesWalletBalances');
 const refresh=document.getElementById('bubblesWalletRefresh');
 if(!wallet||!refresh)return;
 const endpoint=String(window.PhiExecutorInsightsEndpoint||'').replace(/\/$/,'');
 const panel=document.createElement('section');
 panel.className='bubbles-wallet-executor';panel.setAttribute('aria-label','Executor earnings and Media Star engagement');
 panel.style.cssText='border-top:1px solid #ded4e8;padding:13px 0;margin-top:14px;line-height:1.65;letter-spacing:.015em';
 const title=document.createElement('h3');title.textContent='Bubbles executor · receipts & Media Star';
 const status=document.createElement('p');status.setAttribute('role','status');status.textContent='Executor telemetry has not been connected to the production wallet.';
 const detail=document.createElement('div');
 panel.append(title,status,detail);wallet.insertAdjacentElement('afterend',panel);
 const number=value=>Number(value).toLocaleString(undefined,{maximumFractionDigits:1});
 const row=text=>{const p=document.createElement('p');p.textContent=text;detail.append(p)};
 let requestVersion=0;
 async function load(){
  const version=++requestVersion;detail.replaceChildren();
  if(!/^https:\/\/[A-Za-z0-9.-]+$/.test(endpoint)){
   status.textContent='Executor receipts and Media Star clicks are not yet connected. Existing wallet balances remain unchanged.';
   return;
  }
  status.textContent='Checking executor receipts against the signed-in wallet…';
  try{
   const token=await window.QuantaCloudConnection?.resolveDeviceToken?.();
   if(!/^sq_[A-Za-z0-9_-]{32,}$/.test(token||''))throw Error('Wallet sign-in required');
   const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
   let response;
   try{response=await fetch(endpoint+'/v1/executor/summary',{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:controller.signal})}
   finally{clearTimeout(timeout)}
   const data=await response.json();
   if(!response.ok||!data.ok||data.scope!=='wallet_authenticated')throw Error('No verified executor report returned');
   if(version!==requestVersion)return;
   status.textContent='Verified account · executor evidence receipts (not cash income)';
   const assets=[['BUBBLE_BIT','Bubble Bits'],['GIT','GITs'],['GPT_BIT','GPT Bits'],['QUANT','Executor-attributed Quants']];
   for(const [key,label] of assets){
    const asset=data.earnings?.[key];
    if(!asset)throw Error('Incomplete executor report');
    row(label+': '+number(asset.pending)+' pending · '+number(asset.settled)+' wallet-linked receipt units');
   }
   row('These are attribution records, not an additional spendable balance. Existing Quants and StarCoins are unchanged.');
   if(data.mediaStar){
    for(const [id,label] of [['fred-spaces','Fred Media Star'],['following-spaces','Following Media Star'],['media-star-creator','Media Star Creator'],['media-star','Media Star']]){
     const m=data.mediaStar[id];if(!m)continue;
     row(label+' (last '+number(data.periodDays||30)+' days): '+number(m.impressions)+' observed sessions shown · '+number(m.uniqueClicks)+' sessions clicked · '+number(m.clickEvents)+' clicks · '+number(m.playIntents)+' replay attempts · CTR '+(m.ctrPercent===null?'not measurable':number(m.ctrPercent)+'%'));
    }
    row('Browser-reported clicks are not proof of a human, a completed playback, a sale or a payout.');
   }else row('Media Star owner-specific click reporting is not available for this verified account.');
  }catch(error){
   if(version!==requestVersion)return;
   status.textContent='Executor report unavailable or not yet deployed. No missing values are being shown as zero.';
   detail.replaceChildren();
  }
 }
 refresh.addEventListener('click',()=>void load());
 document.addEventListener('starquest:ledger-connected',()=>void load());
 document.addEventListener('starquest:auth-changed',()=>void load());
 void load();
})();
