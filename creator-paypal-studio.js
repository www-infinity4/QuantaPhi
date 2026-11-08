import {prepareCreatorPayPalManifest} from './creator-paypal-studio-core.mjs';

// Original QuantaPhi, browser-local, data-only merchant drafting.
// No checkout, OAuth, bank/token API, microphone, wallet or network requests.
const id=name=>document.getElementById(name);
const form=id('creatorPayPalBatch');
const creator=id('creatorPayPalSlug'),price=id('creatorPayPalPrice');
const cards=id('creatorPayPalCardIds'),output=id('creatorPayPalOutput');
const exportButton=id('creatorPayPalExport'),copyButton=id('creatorPayPalCopy');
const notice=id('creatorPayPalStatus');
let draft=null;
const content=()=>JSON.stringify(draft,null,2);
const reset=(message='Draft needs review. No PayPal account or live checkout is connected.')=>{
 draft=null;exportButton.disabled=true;copyButton.disabled=true;
 output.textContent='No current reviewed draft. Rebuild the template after making changes.';
 notice.textContent=message;
};
[creator,price,cards].forEach(input=>input.addEventListener('input',()=>{
 if(draft!==null)reset();
}));
form.addEventListener('submit',event=>{
 event.preventDefault();
 try{
  draft=prepareCreatorPayPalManifest({
   creatorSlug:creator.value,cardIds:cards.value,usdPrice:price.value
  });
  exportButton.disabled=false;copyButton.disabled=false;
  output.textContent=JSON.stringify({
   previewOnly:true,creator:draft.creatorSlug,totalCards:draft.cardCount,
   merchantConnection:draft.merchantConnection,
   firstFiveCards:draft.cards.slice(0,5),restCount:Math.max(0,draft.cardCount-5),
   note:draft.note
  },null,2);
  notice.textContent=draft.cardCount+' card pricing drafts prepared locally. No PayPal account was connected, no payment link was generated, and no cards were published.';
 }catch(e){
  reset('Template rejected: '+String(e?.message||e)+'. Check public creator handle, distinct card IDs and USD price.');
 }
});
exportButton.addEventListener('click',()=>{
 if(!draft)return;
 const blob=new Blob([content()],{type:'application/json;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 const a=document.createElement('a');
 a.href=url;a.download='quantaphi-creator-'+draft.creatorSlug+'-'+draft.cardCount+'-card-draft.json';
 document.body.append(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 notice.textContent='Downloaded a local unverified JSON draft. No PayPal payment or card publication occurred.';
});
copyButton.addEventListener('click',async()=>{
 if(!draft)return;
 try{
  if(!navigator.clipboard?.writeText)throw Error('clipboard_unavailable');
  await navigator.clipboard.writeText(content());
  notice.textContent='Copied draft data only. No credentials, bank details or PayPal merchant ID were included.';
 }catch{
  output.focus();
  notice.textContent='Clipboard unavailable. Use Save JSON template instead.';
 }
});
id('creatorPayPalClear').addEventListener('click',()=>{
 form.reset();
 reset('Draft cleared from this page. No payment or account change occurred.');
});
