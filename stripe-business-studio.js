import {buildStripeSellerDraft} from './stripe-business-studio-core.mjs';

// Client-only drafting. No Stripe API, OAuth, identity, banking,
// Cash Wallet operations, network submission or persistent storage.
const el=id=>document.getElementById(id);
const form=el('stripeSellerForm'),status=el('stripeStatus'),preview=el('stripePreview');
const exportButton=el('stripeExport'),copyButton=el('stripeCopy');
const fields=[el('stripeSellerSlug'),el('stripeDisplayName'),el('stripeBusinessType'),el('stripePrice'),el('stripeSellerCards'),el('stripeSellerNotes')];
let draft=null;
const text=()=>JSON.stringify(draft,null,2);
function invalidate(message='Draft changed. Rebuild the plan before copying or saving.'){
 draft=null;copyButton.disabled=true;exportButton.disabled=true;
 preview.textContent='No current validated draft.';
 status.textContent=message;
}
fields.forEach(field=>field.addEventListener('input',()=>{if(draft)invalidate()}));
form.addEventListener('submit',e=>{
 e.preventDefault();
 try{
  draft=buildStripeSellerDraft({
   sellerSlug:el('stripeSellerSlug').value,
   displayName:el('stripeDisplayName').value,
   businessType:el('stripeBusinessType').value,
   cardIds:el('stripeSellerCards').value,
   priceUsd:el('stripePrice').value,
   notes:el('stripeSellerNotes').value
  });
  exportButton.disabled=false;copyButton.disabled=false;
  preview.textContent=JSON.stringify({
   schemaVersion:draft.schemaVersion,displayName:draft.displayName,
   businessType:draft.businessType,sellerSlug:draft.sellerSlug,
   cardCount:draft.cardCount,firstThreeCards:draft.cards.slice(0,3),
   unlistedRemaining:Math.max(0,draft.cards.length-3),accountStatus:draft.accountStatus,
   checkoutEnabled:draft.checkoutEnabled,warnings:draft.warnings
  },null,2);
  status.textContent=draft.cardCount+' Stripe seller Quick Card drafts prepared. Nothing connected, published, charged or deposited.';
 }catch(err){
  invalidate('Plan rejected: '+String(err?.message||err)+'. Use public names, distinct card IDs and a valid USD price.');
 }
});
exportButton.addEventListener('click',()=>{
 if(!draft)return;
 const blob=new Blob([text()],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='quantaphi-stripe-'+draft.sellerSlug+'-draft.json';
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 status.textContent='Local Stripe seller plan exported (unverified draft). No account or payment was created.';
});
copyButton.addEventListener('click',async()=>{
 if(!draft)return;
 try{
  if(!navigator.clipboard?.writeText)throw Error('clipboard_unavailable');
  await navigator.clipboard.writeText(text());
  status.textContent='Public-only plan copied. You choose whether to share it with Bubbles.';
 }catch{preview.focus();status.textContent='Copy unavailable. Save the JSON draft instead.';}
});
el('stripeClear').addEventListener('click',()=>{
 form.reset();invalidate('Local draft cleared. No Stripe account or money was affected.');
});
el('stripeBubblesOpen').addEventListener('click',()=>{
 const button=document.querySelector('.quantaphi-bubbles-embed-launcher');
 if(!button){status.textContent='Bubbles is unavailable. Use the Bubbles Chat navigation link.';return;}
 button.click();status.textContent='Bubbles Stripe Business Helper opened. Share only information you choose.';
});
