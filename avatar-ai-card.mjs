/* A portable, owner-neutral suggestion card inside the existing Oracle Quick Card.
 * Explicit copy / drag-and-drop handoff only; no ChatGPT account scraping.
 */
import {buildAvatarPrompt} from './avatar-ai-core.mjs';
const make=(tag,klass,text)=>{const element=document.createElement(tag);if(klass)element.className=klass;if(text!==undefined)element.textContent=text;return element};

export function mountAvatarAiCard(parent){
 if(!parent||typeof document==='undefined')return;
 const box=parent.appendChild(make('section','avatar-ai-suggestion'));
 box.setAttribute('aria-label','Avatar AI starter prompt');
 const hero=box.appendChild(make('div','avatar-ai-hero'));
 const image=hero.appendChild(make('img','avatar-ai-art'));
 image.src='/assets/phi-data-analyst.webp';image.alt='QuantaPhi original AI studio artwork';image.loading='lazy';image.decoding='async';
 image.addEventListener('error',()=>image.remove(),{once:true});
 const heading=hero.appendChild(make('div','avatar-ai-headline'));
 heading.append(make('small','','INFINITY® · SUGGESTED AI EXPERIENCE'),make('h3','','Avatar AI'));
 heading.append(make('p','avatar-ai-tagline','Your ideas don’t expire when the conversation ends.'));
 box.append(make('p','avatar-ai-intro','Give ChatGPT a starting role: use your own authorized personal context to rediscover older ideas, identify unfinished work, and suggest the next useful improvement.'));
 const phases=box.appendChild(make('div','avatar-ai-phases'));
 phases.append(make('strong','','AVAILABLE NOW · PROMPT HANDOFF'),make('span','','Future service · connected scans and ongoing agent-to-agent updates are not active here.'));
 box.appendChild(make('p','avatar-ai-steps','Drag this prompt into an open ChatGPT chat on desktop. On Android, copy it, open ChatGPT, then paste and send.'));
 const label=box.appendChild(make('label','avatar-ai-focus-label','Optional: what should your avatar work on first?'));
 const focus=label.appendChild(make('input','avatar-ai-focus'));
 focus.type='text';focus.maxLength=180;focus.placeholder='e.g. My unfinished software project';focus.autocomplete='off';
 const drag=box.appendChild(make('div','avatar-ai-drag'));
 drag.draggable=true;drag.tabIndex=0;drag.setAttribute('role','group');drag.setAttribute('aria-label','Avatar AI prompt. Drag to ChatGPT, or copy and paste.');
 drag.append(make('strong','','✦ AVATAR AI STARTER PROMPT'));
 const prompt=drag.appendChild(make('textarea','avatar-ai-prompt'));
 prompt.readOnly=true;prompt.rows=8;prompt.setAttribute('aria-label','Avatar AI starter prompt text');
 drag.appendChild(make('span','avatar-ai-drag-hint','Drag on desktop · select or copy on mobile'));
 const status=box.appendChild(make('p','avatar-ai-status','Prompt ready. Nothing has been sent.'));
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const refresh=()=>{prompt.value=buildAvatarPrompt(focus.value);};
 focus.addEventListener('input',refresh);refresh();
 drag.addEventListener('dragstart',event=>{
  if(!event.dataTransfer)return;
  const value=buildAvatarPrompt(focus.value);
  event.dataTransfer.setData('text/plain',value);
  event.dataTransfer.effectAllowed='copy';
  status.textContent='Drag the prompt onto the ChatGPT message box to paste it; sending remains your choice.';
 });
 const controls=box.appendChild(make('div','avatar-ai-controls'));
 const copy=controls.appendChild(make('button','avatar-ai-copy','Copy Avatar AI prompt'));
 copy.type='button';
 copy.addEventListener('click',async()=>{
  const value=buildAvatarPrompt(focus.value);
  try{
   if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
   await navigator.clipboard.writeText(value);
   status.textContent='Prompt copied. Open ChatGPT, paste, and send when ready.';
  }catch{
   prompt.focus();prompt.select();
   status.textContent='Select the highlighted prompt and use your device’s Copy action, then paste into ChatGPT.';
  }
 });
 const open=controls.appendChild(make('a','avatar-ai-open','Open ChatGPT'));
 open.href='https://chatgpt.com/';open.target='_blank';open.rel='noopener noreferrer';
 box.appendChild(make('p','avatar-ai-note','This public card never reads your ChatGPT history, stores your prompt, logs in for you, or runs background agents. ChatGPT can only use context available to your signed-in account and permitted tools.'));
 return box;
}
