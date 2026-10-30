/* QuantaPhi GitHub Copilot card: a useful on-card draft without spoofing login.
 * Server-side Copilot SDK/OAuth is a separate, gated integration (#1250).
 * Keep prompts on the card unless the user explicitly copies them.
 */
export const COPILOT_URL='https://github.com/copilot';
export function cleanCopilotPrompt(input){
 return String(input??'').trim().slice(0,1800);
}
const node=(tag,className,text)=>{
 const el=document.createElement(tag);if(className)el.className=className;
 if(text!==undefined)el.textContent=text;return el;
};
export function mountCopilotCardTool(root){
 if(!root||root.querySelector('[data-copilot-composer]'))return null;
 const section=node('section','iqc-copilot-composer');
 section.dataset.copilotComposer='true';
 const heading=node('h3','','Ask GitHub Copilot');
 const guidance=node('p','iqc-muted','Write your coding question here. GitHub sign-in stays on GitHub. A live Copilot response inside this card requires a verified server connection that is not active yet.');
 const form=node('form','iqc-ai-form');
 const input=node('textarea','iqc-ai-input');
 input.rows=4;input.maxLength=1800;
 input.placeholder='Describe the repository, change, question or test…';
 input.setAttribute('aria-label','GitHub Copilot question');
 input.setAttribute('autocomplete','off');
 const actions=node('div','iqc-copilot-actions');
 const copy=node('button','iqc-ai-send','Copy question');copy.type='submit';
 const official=node('a','iqc-copilot-open','Open Copilot · Sign in at GitHub');
 official.href=COPILOT_URL;official.target='_blank';official.rel='noopener noreferrer';
 const status=node('p','iqc-copilot-status','No Copilot account connection has been verified on this card.');
 status.setAttribute('role','status');
 actions.append(copy,official);form.append(input,actions);
 form.addEventListener('submit',async event=>{
  event.preventDefault();
  const question=cleanCopilotPrompt(input.value);
  if(question.length<3){status.textContent='Enter a question before copying.';input.focus();return}
  if(!navigator.clipboard?.writeText){
   status.textContent='Automatic copy is unavailable. Select and copy your question, then open Copilot and paste it.';
   input.focus();input.select();return;
  }
  try{
   await navigator.clipboard.writeText(question);
   status.textContent='Question copied. Open Copilot above, sign in at GitHub, and paste your question. QuantaPhi cannot read Copilot replies yet.';
  }catch{
   status.textContent='Your browser blocked copying. Select and copy the question, then use the official GitHub link.';
   input.focus();input.select();
  }
 });
 section.append(heading,guidance,form,status);
 root.append(section);return section;
}
