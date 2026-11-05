/* Read original QuantaPhi StarCoin rewards beside the Bubbles wallet.
 * Uses the EXISTING authenticated Quanta ledger's GET and reconcile route.
 * Never creates arbitrary credits or treats page clicks as reward payments.
 */
(()=>{
 'use strict';
 const wallet=document.getElementById('bubblesWalletBalances');
 if(!wallet)return;
 const API='https://quanta-phi-ledger.marvaseater.workers.dev/v1/quants/star-coins';
 const box=document.createElement('section');box.className='bubbles-wallet-original-rewards';
 box.style.cssText='border:1px solid #e0d5c9;border-radius:12px;margin:14px 0;padding:12px;background:#f8f4ee;color:#423747;letter-spacing:.01em';
 const h=document.createElement('h3');h.textContent='Original card StarCoin rewards';
 const desc=document.createElement('p');desc.textContent='Share, Collect and eligible sourced research rewards use the existing StarQuest/Quanta ledger. Clicks alone are not paid credits.';
 const note=document.createElement('p');note.setAttribute('role','status');note.setAttribute('aria-live','polite');
 note.textContent='Checking your original StarCoin receipts…';
 const button=document.createElement('button');button.type='button';button.textContent='Reconcile original StarCoin rewards';
 button.style.cssText='min-height:44px;border:1px solid #bdb0be;background:#faf8f5;color:#45334a;border-radius:11px;padding:10px 12px;font:700 14px system-ui;cursor:pointer';
 const detail=document.createElement('p');detail.style.cssText='font-size:13px;line-height:1.65;overflow-wrap:anywhere';
 box.append(h,desc,button,note,detail);wallet.insertAdjacentElement('afterend',box);
 const num=x=>Number.isSafeInteger(Number(x))&&Number(x)>=0?Number(x).toLocaleString():null;
 let running=false;
 async function audit(reconcile=false){
  if(running)return;
  running=true;button.disabled=true;
  const bridge=window.QuantaCloudConnection;
  if(typeof bridge?.authenticatedFetch!=='function'){
   note.textContent='Original wallet connection unavailable. No reward total can be verified here.';
   button.disabled=false;running=false;return;
  }
  try{
   let report=null;
   if(reconcile){
    note.textContent='Requesting server reconciliation of original reward receipts…';
    const r=await bridge.authenticatedFetch(API+'/reconcile',{method:'POST',body:{}});
    const data=await r.json().catch(()=>({}));
    if(!r.ok||!data.ok)throw Error('reconciliation_not_confirmed');
    report=data;
   }
   const response=await bridge.authenticatedFetch(API,{method:'GET',cache:'no-store'});
   const state=await response.json().catch(()=>({}));
   if(!response.ok||!state||typeof state!=='object')throw Error('original_receipt_state_unavailable');
   note.textContent='Original StarCoin ledger responded for your authenticated wallet.';
   const tenths=num(state.credits_tenths);
   const settleCount=Array.isArray(state.settled)?state.settled.length:null;
   detail.textContent=[
    tenths!==null?'Quanta reward ledger units: '+(Number(state.credits_tenths)/10).toLocaleString(undefined,{maximumFractionDigits:1})+' StarCoins (ledger history figure, not necessarily current spendable balance).':'Historical Quanta reward unit total not supplied.',
    settleCount!==null?'Server-returned settled actions in this response: '+settleCount+'.':'Full settled-action count not supplied.',
    report?'Reconciliation checked '+(num(report.checked)??'unknown')+' original records; '+(num(report.credited)??'unknown')+' newly credited; '+(num(report.alreadyPaid)??'unknown')+' already paid.':'Select Reconcile to check any existing verified, unpaid original reward receipts.',
    'A Media Star click or replay intent is not evidence of a StarCoin payout.'
   ].join(' ');
   if(report)window.dispatchEvent(new Event('starquest:ledger-connected'));
  }catch{
   note.textContent='Original reward history or reconciliation is unavailable; no unpaid amount has been established.';
   detail.textContent='No wallet or StarCoin balance was changed by this display.';
  }finally{running=false;button.disabled=false}
 }
 button.addEventListener('click',()=>void audit(true));
 document.addEventListener('starquest:auth-changed',()=>void audit(false));
 void audit(false);
})();
