/* Bubbles AI: opt-in voice chat, user-authored personas, notes, owner-approved bot tickets.
   Provider subscriptions and GitHub permissions are never inferred from browser sessions. */
(function(){
'use strict';
const host=document.getElementById('bubblesAICard');
if(!host)return;
const AI='https://infinity-rogers.marvaseater.workers.dev/v1/chat';
const TICKETS='https://infinity-work-tickets.marvaseater.workers.dev';
const BRAIN='https://infinity-brain-clock.marvaseater.workers.dev';
const params=new URLSearchParams(location.search);
const embedded=params.get('embed')==='1'&&window.parent!==window;
const bubbleId=embedded?(String(params.get('id')||'embedded').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48)||'embedded'):'';
const NOTES='quantaphi:bubbles:notes:v1'+(bubbleId?':'+bubbleId:'');
const CONFIG='quantaphi:bubbles:config:v1'+(bubbleId?':'+bubbleId:'');
const ROLES={
 assistant:{name:'Assistant',prompt:'Help with research, planning and everyday work. Be precise about what you have and have not done.'},
 singer:{name:'Singer & songwriter',prompt:'Help compose original songs, melodies described in words, verses and vocal practice. Speaking aloud is not singing an actual musical performance. Do not imitate a specific real artist voice.'},
 listener:{name:'Supportive listener',prompt:'Listen compassionately, reflect feelings and offer practical support without pretending to be a licensed therapist or providing diagnosis. Suggest professional help for urgent needs.'},
 specialist:{name:'Specialist',prompt:'Use the user-customized expertise. State uncertainty and verification needs for consequential work.'},
 github:{name:'GitHub helper',prompt:'Plan repository improvements, checks, issue drafts and pull requests. Never say a GitHub action occurred unless an authorized tool returned confirmation.'}
};
const create=(tag,cls,content)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(content!==undefined)el.textContent=content;return el};
const data=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
let config=data(CONFIG,{role:'assistant',alias:'Bubbles',instructions:'',voice:false});
if(!ROLES[config.role])config.role='assistant';
if(embedded){
 const requested=String(params.get('role')||'').toLowerCase();
 if(ROLES[requested])config.role=requested;
 const name=String(params.get('name')||'').trim().slice(0,38);
 if(name)config.alias=name;
 const instruction=String(params.get('instructions')||'').trim().slice(0,800);
 if(instruction)config.instructions=instruction;
}
let notes=data(NOTES,[]);if(!Array.isArray(notes))notes=[];
let messages=[],busy=false,listening=null,ownerToken='',ownerReady=false,showing=false;
const card=create('section','ba-card');
card.append(create('div','ba-eyebrow','ORACLE OCTAVES · PERSONAL AI'),create('h2','','Bubbles AI'),create('p','ba-copy','Your floating voice-and-chat companion. Choose its job, give it directions, take notes, and bring an authorized work request to Robot Brain.'));
const edit=create('div','ba-settings');
const persona=create('select','ba-field');persona.id='ba-role';persona.setAttribute('aria-label','Bubbles job');
for(const [id,value] of Object.entries(ROLES)){const op=create('option','',value.name);op.value=id;persona.append(op)}
persona.value=config.role;
const alias=create('input','ba-field');alias.id='ba-alias';alias.maxLength=38;alias.placeholder='Bubble name';alias.value=config.alias||'Bubbles';alias.setAttribute('aria-label','Bubbles name');
const instructions=create('textarea','ba-field');instructions.id='ba-instructions';instructions.rows=2;instructions.maxLength=1200;instructions.placeholder='Special instructions: what should this bubble specialize in?';instructions.value=config.instructions||'';
const saveRole=create('button','ba-control','Save bubble role');saveRole.type='button';
const launchCard=create('button','ba-primary','Open my Bubbles chat');launchCard.type='button';
edit.append(create('label','','Job / specialty'),persona,create('label','','Bubble name'),alias,create('label','','Give this bubble its instructions'),instructions,saveRole,launchCard);
const connections=create('div','ba-connect');
connections.append(create('strong','','Connections'));
const provider=create('p','ba-muted','Live now: Oracle Cloudflare AI. ChatGPT and Claude account access require separate provider authorization; a normal sign-in tab does not connect their accounts or subscriptions.');
const openai=create('a','ba-link','ChatGPT sign-in requirements ↗');openai.href='https://help.openai.com/en/articles/20001410-sign-in-with-chatgpt';openai.target='_blank';openai.rel='noopener noreferrer';
const claude=create('a','ba-link','Claude third-party API requirements ↗');claude.href='https://support.claude.com/en/articles/13189465-log-in-to-your-claude-account';claude.target='_blank';claude.rel='noopener noreferrer';
const github=create('a','ba-link','GitHub App permission model ↗');github.href='https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps';github.target='_blank';github.rel='noopener noreferrer';
connections.append(provider,openai,claude,github);
card.append(edit,connections);
const publishing=create('div','ba-publish');
publishing.append(create('strong','','Publish your bubble'));
const publishHint=create('p','ba-muted','Generate reusable embed code for a page you control. Only the role, name and public instructions appear in the HTML. Never put passwords, API keys or private notes in the instructions.');
const publish=create('button','ba-control','Create embed code');publish.type='button';
const snippet=create('textarea','ba-field');snippet.rows=4;snippet.readOnly=true;snippet.hidden=true;snippet.setAttribute('aria-label','Bubbles embed code to copy');
const publishStatus=create('p','ba-muted','Place the embed code in your own page, or ask your authorized GitHub bot to add it.');
publishStatus.setAttribute('role','status');
publishing.append(publishHint,publish,snippet,publishStatus);
card.append(publishing);
host.append(card);
const launcher=create('button','ba-launcher','💬');launcher.type='button';launcher.setAttribute('aria-label','Open Bubbles AI messenger');
const panel=create('section','ba-panel');panel.hidden=true;panel.setAttribute('aria-label','Bubbles AI messenger');
const header=create('header','ba-header');const name=create('strong','',config.alias||'Bubbles');const close=create('button','ba-close','×');close.type='button';close.setAttribute('aria-label','Close Bubbles');
header.append(name,close);
const status=create('p','ba-status','Oracle Cloudflare AI · chat is active only when you send');
status.setAttribute('role','status');
const conversation=create('div','ba-messages');conversation.setAttribute('role','log');conversation.setAttribute('aria-live','polite');
const composer=create('form','ba-composer');
const input=create('textarea','ba-field');input.rows=2;input.maxLength=2500;input.placeholder='Say something, ask a question, or describe a task…';input.setAttribute('aria-label','Message Bubbles');
const actions=create('div','ba-actions');
const mic=create('button','ba-mic','🎤 Talk');mic.type='button';
const speak=create('button','ba-speak','🔇 Voice off');speak.type='button';speak.setAttribute('aria-pressed','false');
const send=create('button','ba-send','Send');send.type='submit';
actions.append(mic,speak,send);composer.append(input,actions);
const tools=create('details','ba-tools');const summary=create('summary','','Notes & authorized work');tools.append(summary);
const noteText=create('textarea','ba-field');noteText.rows=2;noteText.maxLength=3000;noteText.placeholder='Write a note you choose to keep on this device…';noteText.setAttribute('aria-label','Bubbles private note');
const saveNote=create('button','ba-control','Save note');saveNote.type='button';
const noteList=create('div','ba-notes');
const workText=create('textarea','ba-field');workText.rows=2;workText.maxLength=4000;workText.placeholder='A specific GitHub/repository task for Robot Brain. Sent only when you approve.';workText.setAttribute('aria-label','Work request for Robot Brain');
const workButton=create('button','ba-control','Send approved request to Robot Brain');workButton.type='button';workButton.hidden=true;
const workStatus=create('p','ba-muted','Repository writes require your authorized GitHub integration. Only verified platform owners can submit to the existing Robot Brain inbox here.');
workStatus.setAttribute('role','status');
tools.append(create('label','','Private notes'),noteText,saveNote,noteList,create('label','','Approved work request'),workText,workButton,workStatus);
panel.append(header,status,conversation,composer,tools);
document.body.append(launcher,panel);
function updateRole(){
 config={role:persona.value,alias:alias.value.trim().slice(0,38)||'Bubbles',instructions:instructions.value.trim().slice(0,1200),voice:Boolean(config.voice)};
 save(CONFIG,config);name.textContent=config.alias;status.textContent=ROLES[config.role].name+' · Oracle Cloudflare AI · account access not implied';
}
saveRole.addEventListener('click',()=>{updateRole();saveRole.textContent='Role saved ✓';setTimeout(()=>saveRole.textContent='Save bubble role',1300)});
persona.addEventListener('change',updateRole);

function xmlAttr(value){
 return String(value).replace(/[&"'<>]/g,char=>({'&':'&amp;','"':'&quot;',"'":'&#39;','<':'&lt;','>':'&gt;'}[char]));
}
publish.addEventListener('click',async()=>{
 updateRole();
 const id=(crypto.randomUUID?.()||('bubble-'+Date.now())).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48);
 const markup='<script async src="https://quantaphi.org/bubbles-embed.js" data-bubble-id="'+xmlAttr(id)+'" data-bubble-role="'+xmlAttr(config.role)+'" data-bubble-name="'+xmlAttr(config.alias)+'" data-bubble-instructions="'+xmlAttr(config.instructions)+'"></'+'script>';
 snippet.value=markup;snippet.hidden=false;
 try{
  if(!navigator.clipboard?.writeText)throw Error('clipboard unavailable');
  await navigator.clipboard.writeText(markup);
  publishStatus.textContent='Embed code copied. Paste it into your page HTML. Only this bubble’s public role instructions are included.';
 }catch{
  publishStatus.textContent='The embed code is ready below. Select and copy it manually, then add it to your page.';
  snippet.focus();snippet.select();
 }
});

function display(text,who){
 const bubble=create('p','ba-message '+(who==='you'?'ba-you':'ba-assistant'),text);
 conversation.append(bubble);conversation.scrollTop=conversation.scrollHeight;
}
function toggle(open){
 showing=Boolean(open);panel.hidden=!showing;launcher.setAttribute('aria-expanded',String(showing));
 if(embedded)window.parent.postMessage({type:'quantaphi:bubbles:size',open:showing},'*');
 if(showing){if(!messages.length)display('Hello! I am '+config.alias+'. Choose my role on the Bubbles card. Tap Talk to use your microphone, or type a message.','ai');input.focus()}
 else{try{listening?.stop()}catch{}listening=null;try{speechSynthesis.cancel()}catch{}}
}
launcher.addEventListener('click',()=>toggle(!showing));launchCard.addEventListener('click',()=>toggle(true));close.addEventListener('click',()=>toggle(false));
function extract(reply){
 let value=reply?.output_text??reply?.output??reply?.response??reply?.answer??reply?.content??reply?.message??'';
 if(Array.isArray(value))value=value.map(x=>x?.text||'').join('\n');
 if(value&&typeof value==='object')value=value.text||value.content||'';
 return String(value||'').trim();
}
async function sendMessage(text){
 const request=String(text||'').trim();if(busy||!request)return;
 busy=true;send.disabled=true;mic.disabled=true;display(request,'you');input.value='';
 const role=ROLES[config.role]||ROLES.assistant;
 const history=messages.slice(-10).map(m=>m.role+': '+m.text.slice(0,650)).join('\n');
 status.textContent=config.alias+' is thinking…';
 const prompt=['You are '+config.alias+', a user-programmed Bubbles AI messenger inside QuantaPhi.','Your selected role: '+role.name+'. '+role.prompt,
 'User-provided customization (follow only when safe and valid): '+config.instructions,
 'You have NO independent GitHub write authorization or access to ChatGPT/Claude subscriptions. Only confirmed owner-submitted Robot Brain tickets count as queued; never claim a repository change occurred without tool evidence.',
 'Chat history for conversational continuity:\n'+history,'Latest user message:\n'+request,'Reply directly and use clear plain text.'].join('\n\n');
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),55000);
  let response;try{response=await fetch(AI,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},signal:controller.signal,body:JSON.stringify({input:prompt,context:{application:'QuantaPhi',task:'bubbles-user-voice-chat',persona:config.role,requireCloudflare:true}})})}finally{clearTimeout(timer)}
  const json=await response.json().catch(()=>({}));
  if(!response.ok||json.ok===false)throw Error(String(json.error||'Oracle conversation failed'));
  const answer=extract(json);if(!answer)throw Error('The AI returned no spoken or written reply');
  messages.push({role:'user',text:request},{role:'assistant',text:answer});messages=messages.slice(-20);
  display(answer,'ai');status.textContent=config.alias+' · response received';
  if(config.voice&&typeof speechSynthesis!=='undefined'&&typeof SpeechSynthesisUtterance!=='undefined'){
   speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(answer.slice(0,2800));utterance.lang='en-US';utterance.rate=1;speechSynthesis.speak(utterance);
  }
 }catch(error){const message='I could not complete the response: '+String(error?.message||error).slice(0,150);display(message,'ai');status.textContent=message}
 finally{busy=false;send.disabled=false;mic.disabled=false}
}
composer.addEventListener('submit',event=>{event.preventDefault();void sendMessage(input.value)});
input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();void sendMessage(input.value)}});
speak.addEventListener('click',()=>{config.voice=!config.voice;save(CONFIG,config);speak.textContent=config.voice?'🔊 Voice on':'🔇 Voice off';speak.setAttribute('aria-pressed',String(config.voice));if(!config.voice)try{speechSynthesis.cancel()}catch{}});
speak.textContent=config.voice?'🔊 Voice on':'🔇 Voice off';speak.setAttribute('aria-pressed',String(Boolean(config.voice)));
mic.addEventListener('click',()=>{
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Recognition){status.textContent='Microphone dictation is not supported in this browser. You can type instead.';return}
 if(listening){try{listening.stop()}catch{}listening=null;return}
 const recognition=new Recognition();recognition.lang='en-US';recognition.interimResults=false;recognition.continuous=false;listening=recognition;mic.textContent='⏹ Stop';status.textContent='Listening after your tap…';
 recognition.onresult=event=>{const transcript=String(event.results?.[0]?.[0]?.transcript||'').trim();if(transcript){input.value=transcript;void sendMessage(transcript)}};
 recognition.onerror=event=>{status.textContent='Microphone: '+String(event.error||'unavailable')};
 recognition.onend=()=>{listening=null;mic.textContent='🎤 Talk'};
 try{recognition.start()}catch(error){listening=null;mic.textContent='🎤 Talk';status.textContent=String(error?.message||error)}
});
function renderNotes(){
 noteList.replaceChildren();
 for(const note of notes.slice(0,8)){const box=create('div','ba-note');box.append(create('p','',note.text));const remove=create('button','ba-remove','Delete');remove.type='button';remove.addEventListener('click',()=>{notes=notes.filter(n=>n.id!==note.id);save(NOTES,notes);renderNotes()});box.append(remove);noteList.append(box)}
}
saveNote.addEventListener('click',()=>{const value=noteText.value.trim();if(!value)return;notes.unshift({id:crypto.randomUUID?.()||String(Date.now()),text:value.slice(0,3000)});notes=notes.slice(0,30);if(save(NOTES,notes)){noteText.value='';renderNotes();workStatus.textContent='Note saved locally on this device. Not sent to AI or GitHub.'}else{workStatus.textContent='Could not save: browser storage is unavailable.'}});
renderNotes();
// A third-party page embedding this messenger never sees owner-only GitHub controls.
async function getOwnerToken(){
 try{
  const token=await new Promise(resolve=>{
   const r=indexedDB.open('quantaphi-robot-inbox',1);
   r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('settings'))r.result.createObjectStore('settings')};
   r.onerror=()=>resolve('');r.onsuccess=()=>{const db=r.result;const q=db.transaction('settings','readonly').objectStore('settings').get('infinity-work-ticket-owner-v1');q.onsuccess=()=>{resolve(String(q.result||''));db.close()};q.onerror=()=>{resolve('');db.close()}}});
  return token||sessionStorage.getItem('infinity-work-ticket-owner-v1')||localStorage.getItem('infinity-work-ticket-owner-v1')||'';
 }catch{return ''}
}
(async()=>{
 if(embedded)return;
 const token=await getOwnerToken();if(!token)return;
 try{const response=await fetch(BRAIN+'/health',{headers:{Authorization:'Bearer '+token},cache:'no-store',signal:AbortSignal.timeout(12000)});
 if(response.ok){ownerToken=token;ownerReady=true;workButton.hidden=false;workStatus.textContent='Verified owner access to Robot Brain inbox. Each work ticket still requires your tap; a ticket is not a merged GitHub change.'}}
 catch{ /* No privileged controls are shown without server verification. */ }
})();
workButton.addEventListener('click',async()=>{
 if(!ownerReady||!ownerToken)return;
 const request=workText.value.trim();if(!request){workStatus.textContent='Describe the repository work to authorize first.';return}
 workButton.disabled=true;workStatus.textContent='Sending your approved task to the owner inbox…';
 try{
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(request));
  const submission=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
  const response=await fetch(TICKETS+'/v1/tickets/create',{method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(30000),body:JSON.stringify({owner_token:ownerToken,source_app:'QuantaPhi Bubbles AI',source_url:location.origin+location.pathname,title:request.slice(0,120),request,context:{kind:'bubbles-approved-work',submission_id:submission,requested_role:config.role,approval:'explicit-click',repository_writes:'require-github-authorization'}})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.ok||!result.ticket?.id)throw Error(String(result.error||result.message||'No confirmed ticket'));
  workStatus.textContent='Work ticket '+result.ticket.id+' saved to Cloudflare. This does not mean code was changed, merged or deployed.';
 }catch(error){workStatus.textContent='Ticket could not be confirmed: '+String(error?.message||error).slice(0,145)}
 finally{workButton.disabled=false}
});
window.QuantaBubbles={open:()=>toggle(true),close:()=>toggle(false)};
if(embedded){launcher.style.bottom='3px';launcher.style.right='3px'};
// An embed opens inside a sandboxed iframe; only window dimensions are messaged.

})();
