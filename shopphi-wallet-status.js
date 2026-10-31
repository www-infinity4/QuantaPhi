(function(){
'use strict';
function ready(){
 const status=document.getElementById('shopphiWalletStatus'),button=document.getElementById('shopphiConnectWallet');
 if(!status||!button)return;
 function paint(){
  const bridge=window.QuantaCloudConnection;
  if(bridge?.hasCredential?.()){
   status.textContent='Your existing Unified Wallet is connected on this device. ShopPhi can save cloud drafts and publish your goods when you confirm ownership.';
   button.textContent='Check wallet connection';
  }else{
   status.textContent='Connect your existing Unified Wallet to save or publish your own goods. No separate ShopPhi account or API key is required.';
   button.textContent='Connect my Unified Wallet';
  }
 }
 button.addEventListener('click',()=>{
  const bridge=window.QuantaCloudConnection;
  if(bridge?.hasCredential?.()){paint();return}
  if(typeof bridge?.recoverWallet==='function')bridge.recoverWallet(true);
  else status.textContent='Wallet connection script unavailable. Return to the QuantaPhi homepage and sign in to Unified Wallet.';
 });
 paint();
 window.QuantaCloudConnection?.ready?.then?.(paint).catch?.(()=>{});
 window.addEventListener('focus',paint);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();