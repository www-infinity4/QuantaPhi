/* Source-only Power Chain 003 planning UI. Nothing is purchased or profiled. */
import {planShoppingIntent} from './cooperative-power-chain.mjs';
const form=document.getElementById('cooperativeIntentForm'),out=document.getElementById('cooperativePlan');
const status=document.getElementById('cooperativeStatus'),start=document.getElementById('cooperativeResearch');
const field=(name)=>form.elements.namedItem(name);
const e=(tag,cls,text)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;return node;};
let last=null;
function plan(event){
 event?.preventDefault();
 try{
  const interestText=String(field('recipientInterests').value||'');
  const tags=interestText.split(',').map(x=>x.trim()).filter(Boolean);
  last=planShoppingIntent({purpose:field('purpose').value,budget:field('budget').value,
   itemCount:Number(field('itemCount').value),maxMerchants:Number(field('maxMerchants').value),
   region:field('region').value,recipientInterests:tags});
  out.replaceChildren();
  const lead=e('p','co-op-lead','Research plan: '+last.budgetLabel+' for '+last.itemCount+' items across up to '+last.maxMerchants+' different merchants.');
  const list=e('ol','co-op-steps');
  last.phases.forEach(t=>list.append(e('li','',t)));
  const privacy=e('p','co-op-warning','No items, prices, fulfillment hubs, carrier quotes or purchases are confirmed. Interests stay in this page; no private profile is accessed or saved.');
  out.append(lead,list,privacy);
  start.disabled=false;
  status.textContent='Plan prepared locally. Open the existing Shop Power Chain to research source links; verify merchant and delivery quotes before checkout.';
 }catch(error){last=null;out.replaceChildren();start.disabled=true;status.textContent=String(error?.message||'Please check the form.');}
}
form.addEventListener('submit',plan);
start.addEventListener('click',()=>{
 if(!last)return;
 const input=document.getElementById('chainIntent'),auto=document.getElementById('autoWire'),work=document.getElementById('workbench');
 if(!input||!auto||!work)return;
 input.value=('shop '+last.shopResearchPrompt).slice(0,110);
 auto.click();work.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 status.textContent='Shop research intent loaded into the existing Power Chain. Review the source circuit and press Run Power Chain. This does not order anything.';
});
plan();
