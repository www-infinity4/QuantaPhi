import {assessCashWalletFunding,readCashWalletSnapshot} from './cash-wallet-core.mjs';

/* Owner-accessible preview only. No provider secrets, wallet identifiers, bank
 * credentials, balances, payment requests or checkout actions in the browser. */
export function mountCashWalletPreview(root=document){
 const form=root.getElementById('cashWalletFundingForm');
 const amount=root.getElementById('cashWalletAmount');
 const status=root.getElementById('cw-funding-status');
 const available=root.getElementById('cashWalletAvailable');
 const pending=root.getElementById('cashWalletPending');
 if(!form||!amount||!status||!available||!pending||form.dataset.mounted==='true')return false;
 form.dataset.mounted='true';
 const balance=readCashWalletSnapshot();
 available.textContent=balance.display;
 pending.textContent=balance.pendingCents===null?'—':'Connected';
 form.addEventListener('submit',event=>{
  event.preventDefault();
  const review=assessCashWalletFunding({amount:amount.value});
  status.textContent=review.message;
  status.dataset.fundingStatus=review.status;
 });
 return true;
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mountCashWalletPreview(),{once:true});
 else mountCashWalletPreview();
}
