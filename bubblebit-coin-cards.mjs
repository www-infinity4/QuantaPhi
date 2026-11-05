/* Educational QuantaPhi quick cards. No wallet calls, tool claims or minting. */
export function getExampleBitText(){
 return [
  'ILLUSTRATIVE BUBBLE BIT BLUEPRINT — NOT A REAL TRANSACTION',
  'Purpose: deploy a website and verify the release.',
  'Requested outcome: production website updated with tested source.',
  'Work context: GitHub commit / checks, Cloudflare staging and deployment readback.',
  'Example verified-stage requirement: tests passed for 73 files, deployment version independently confirmed.',
  'Useful to the next customer: a release-checklist template and the evidence requirements to reproduce the work safely in their own project.',
  'A GIT is a single verified code-line contribution; the Bubble Bit holds the surrounding criteria, task meaning, test results and reuse guidance.',
  'Source access is not granted with a Bit. Reuse requires a separate customer permission, lawful licensing, and fresh tests.',
  'No verified owner wallet credit, user credit, trade, settlement or financial value is represented by this illustrative example.'
 ].join('\n');
}
function mount(){
 for(const button of document.querySelectorAll('[data-bubblebit-copy]')){
  button.addEventListener('click',async()=>{
   const panel=button.closest('[data-bubblebit-demo]');
   if(!panel)return;
   const status=panel.querySelector('[data-bubblebit-status]');
   const output=panel.querySelector('[data-bubblebit-output]');
   const content=getExampleBitText();
   try{
    if(!navigator.clipboard?.writeText)throw Error('no_clipboard');
    await navigator.clipboard.writeText(content);
    if(status)status.textContent='Illustrative blueprint copied — no asset or private code transferred.';
   }catch{
    if(output){output.hidden=false;output.textContent=content;}
    if(status)status.textContent='Copy unavailable. Select the illustrative text below instead.';
   }
  });
 }
}
if(typeof document!=='undefined'){
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
 else mount();
}
