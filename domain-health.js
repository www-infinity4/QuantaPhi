(function(global){
 'use strict';
 // One read-only check per load. No polling, minting, or UI-blocking work.
 const production='https://quantaphi.org';
 // Keep connection diagnostics available without a page banner.
 function banner(){document.getElementById('domainHealth')?.remove()}
 async function check(){
  const status=global.QuantaDomainHealth={origin:location.origin,site:'pending',bridge:'pending',ledger:'pending'};
  if(location.origin!==production){status.site='alternate-origin';banner('You are using an alternate address. Open https://quantaphi.org/ for the paired production wallet.');return}
  try{
   const response=await fetch('/health',{cache:'no-store',signal:AbortSignal.timeout(5000)}),data=await response.json();
   if(!response.ok||data.service!=='quantaphi-site'||data.canonicalOrigin!==production||data.appPath!=='/QuantaPhi/index.html'||!response.headers.get('x-quantaphi-edge'))throw Error('site-routing');
   status.site='ok';
  }catch(_){status.site='unavailable';banner('Domain routing could not be verified. Search remains available; check your connection and try reloading.');return}
  const connection=global.QuantaCloudConnection;
  if(!connection){status.bridge='unavailable';banner('The wallet connection script did not load. Reload to reconnect your wallet.');return}
  await connection.ready;
  status.bridge=connection.status.bridge;
  if(!connection.hasCredential()){status.ledger='not-connected';banner(status.bridge==='linked'?'Connect your existing wallet account to verify cloud balances.':'The wallet bridge could not connect. Connect your existing wallet account to verify cloud balances.');return}
  try{
   const response=await connection.authenticatedFetch('https://unified-wallet.marvaseater.workers.dev/v1/wallet/state',{cache:'no-store',signal:AbortSignal.timeout(5000)});
   if(!response.ok)throw Error('wallet-state');
   await response.json();status.ledger='ok';
   if(status.bridge!=='linked')banner('Cloud wallet is connected. The link to your previous browser storage could not be verified.');
  }catch(_){status.ledger='unavailable';banner('Cloud wallet balances could not be verified. Check your connection or reconnect your existing account.');}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',check,{once:true});else check();
})(window);
