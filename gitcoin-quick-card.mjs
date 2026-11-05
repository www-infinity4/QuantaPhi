/* One copyable GIT setup card on QuantaPhi and on the GIT guide page.
 * Browser-only clipboard helpers. No collection, wallet writes or hidden network requests.
 */
import {makeTermuxSetup,makeAiInstructions} from './gitcoin/setup-snippets.mjs';

function mount(root){
 const repo=root.querySelector('[data-gitcoin-repo]');
 const output=root.querySelector('[data-gitcoin-preview]');
 const status=root.querySelector('[data-gitcoin-status]');
 if(!repo||!status)return;
 function instructions(kind){return kind==='ai'?makeAiInstructions(repo.value):makeTermuxSetup(repo.value)}
 function update(){
  try{
   const preview=instructions('termux');
   if(output)output.textContent=preview;
   status.textContent='Ready to copy commands for your own GitHub repository. Pending local receipts only.';
  }catch{
   if(output)output.textContent='Enter YOUR_GITHUB/your-repo above to generate your own Termux commands.';
   status.textContent='Enter your GitHub repository as owner/repo to prepare the commands.';
  }
 }
 repo.addEventListener('input',update);
 for(const button of root.querySelectorAll('[data-gitcoin-copy]')){
  button.addEventListener('click',async()=>{
   let payload;
   try{payload=instructions(button.dataset.gitcoinCopy)}
   catch{status.textContent='Enter a valid GitHub owner/repo first.';repo.focus();return}
   try{
    if(!navigator.clipboard?.writeText)throw Error('clipboard_unavailable');
    await navigator.clipboard.writeText(payload);
    status.textContent=button.dataset.gitcoinCopy==='ai'?'AI instructions copied. Paste into your chosen AI.':'Termux commands copied. Paste into Termux.';
   }catch{
    if(output)output.textContent=payload;
    status.textContent='Clipboard unavailable. Select the displayed text and copy it manually.';
   }
  });
 }
 update();
}
if(typeof document!=='undefined'){
 const ready=()=>document.querySelectorAll('[data-gitcoin-root]').forEach(mount);
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});
 else ready();
}
