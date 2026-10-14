/* Bubbles AI: opt-in voice chat, user-authored personas, notes, owner-approved bot tickets.
   Provider subscriptions and GitHub permissions are never inferred from browser sessions. */
(function(){
'use strict';
const host=document.getElementById('bubblesAICard');
if(!host)return;
// The tool gateway delegates ordinary chat to Oracle /v1/chat.
const AI='https://bubbles-tools.marvaseater.workers.dev/v1/assist';
const STREAM_VOICE_URL=(document.currentScript?.src||location.origin+'/bubbles-ai.js').replace(/[^/]*$/,'bubbles-stream-voice.js?v=20261013-stream1');
let streamVoice=null,voiceGeneration=0;
const brainTools=window.BubblesBrainActions||null;
const TICKETS='https://infinity-brain-clock.marvaseater.workers.dev';
const BRAIN='https://infinity-brain-clock.marvaseater.workers.dev';
const params=new URLSearchParams(location.search);
const embedded=params.get('embed')==='1'&&window.parent!==window;
const nativeOverlay=!embedded&&params.get('nativeOverlay')==='1';
// Native Android uses the identical QuantaPhi website assistant and owner-wallet
// gates. It must not copy Chrome cookies or obtain owner rights from a query string.
let nativeSpeechReply='',nativeSpeechPending=false,noteTaking=false;
if(nativeOverlay)document.documentElement.classList.add('bubbles-native-overlay');
const bubbleId=embedded?(String(params.get('id')||'embedded').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48)||'embedded'):'';
const NOTES='quantaphi:bubbles:notes:v1'+(bubbleId?':'+bubbleId:'');
const CONFIG='quantaphi:bubbles:config:v1'+(bubbleId?':'+bubbleId:'');
const HISTORY='quantaphi:bubbles:history:v1'+(bubbleId?':'+bubbleId:'');
const KEEP_HISTORY='quantaphi:bubbles:keep-history:v1'+(bubbleId?':'+bubbleId:'');
const ROLES={
 assistant:{name:'Assistant',prompt:'Help with research, planning and everyday work. Be precise about what you have and have not done.'},
 builder:{name:'Infinity Builder',prompt:'Act as the QuantaPhi/Infinity build architect. Turn an idea into practical steps, suitable repository work, tests, receipts and tool boundaries. Maintain a clear builder atmosphere, but never claim edits, deployments or wallet payments without confirmed tools.'},
 singer:{name:'Singer & songwriter',prompt:'Help compose original songs, melodies described in words, verses and vocal practice. Speaking aloud is not singing an actual musical performance. Do not imitate a specific real artist voice.'},
 listener:{name:'Supportive listener',prompt:'Listen compassionately, reflect feelings and offer practical support without pretending to be a licensed therapist or providing diagnosis. Suggest professional help for urgent needs.'},
 specialist:{name:'Specialist',prompt:'Use the user-customized expertise. State uncertainty and verification needs for consequential work.'},
 github:{name:'GitHub helper',prompt:'Plan repository improvements, checks, issue drafts and pull requests. Never say a GitHub action occurred unless an authorized tool returned confirmation.'}
};
const create=(tag,cls,content)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(content!==undefined)el.textContent=content;return el};
const data=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||'null')??fallback}catch{return fallback}};
const save=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
const previousConfig=data(CONFIG,null);
let config=previousConfig&&typeof previousConfig==='object'?previousConfig:{role:'assistant',alias:'Bubbles',instructions:'',voice:true};
if(!ROLES[config.role])config.role='assistant';
if(embedded&&!previousConfig){
 const requested=String(params.get('role')||'').toLowerCase();
 if(ROLES[requested])config.role=requested;
 const name=String(params.get('name')||'').trim().slice(0,38);
 if(name)config.alias=name;
 const instruction=String(params.get('instructions')||'').trim().slice(0,800);
 if(instruction)config.instructions=instruction;
}
let notes=data(NOTES,[]);if(!Array.isArray(notes))notes=[];
let keepChat=data(KEEP_HISTORY,false)===true;
let messages=keepChat?data(HISTORY,[]):[];
if(!Array.isArray(messages))messages=[];
messages=messages.filter(item=>item&&['user','assistant'].includes(item.role)&&typeof item.text==='string').slice(-12).map(item=>({role:item.role,text:item.text.slice(0,1800)}));
let greeted=messages.length>0,busy=false,listening=null,ownerToken='',ownerHeaders=null,ownerReady=false,showing=false;
let voiceResumeWanted=false,voiceStarting=false,heardUntil=0;
let voiceEnabled=false,recognition=null,voicePending='',speaking=false,voiceRetry=null,tries=0;
let meterStream=null,audioContext=null,meterAnalyser=null,meterFrame=0,orbDragging=false,dragSuppressed=false;
const voiceGate=window.BubblesVoiceGate?.create({followupMs:30000,name:config.alias,requireWakeName:false})||null;

function persistChat(){
 if(!keepChat)return false;
 return save(HISTORY,messages.slice(-12).map(item=>({role:item.role,text:item.text.slice(0,1800)})));
}
const card=create('section','ba-card ba-studio-card');
card.append(create('div','ba-eyebrow','ORACLE OCTAVES · VOICE COMPANION'),create('h2','','Bubbles AI'),create('p','ba-copy','Tap Bubbles once to enable continuous listening. It glows when it hears sound. Just speak naturally—no wake name needed. Speech clips go to Cloudflare for transcription; silence stays on your device. Mute releases the microphone.'));
const studioToggle=create('button','ba-control ba-studio-toggle','Customize Bubbles');studioToggle.type='button';studioToggle.setAttribute('aria-expanded','false');
studioToggle.addEventListener('click',()=>{const open=card.dataset.expanded!=='true';card.dataset.expanded=String(open);studioToggle.setAttribute('aria-expanded',String(open));studioToggle.textContent=open?'Hide customization':'Customize Bubbles'});card.append(studioToggle);
const edit=create('div','ba-settings');
const persona=create('select','ba-field');persona.id='ba-role';persona.setAttribute('aria-label','Bubbles job');
for(const [id,value] of Object.entries(ROLES)){const op=create('option','',value.name);op.value=id;persona.append(op)}
persona.value=config.role;
const alias=create('input','ba-field');alias.id='ba-alias';alias.maxLength=38;alias.placeholder='Bubble name';alias.value=config.alias||'Bubbles';alias.setAttribute('aria-label','Bubbles name');
const instructions=create('textarea','ba-field');instructions.id='ba-instructions';instructions.rows=2;instructions.maxLength=1200;instructions.placeholder='Special instructions: what should this bubble specialize in?';instructions.value=config.instructions||'';
const saveRole=create('button','ba-control','Save bubble role');saveRole.type='button';
const launchCard=create('button','ba-primary','Connect Bubbles voice');launchCard.type='button';
edit.append(create('label','','Job / specialty'),persona,create('label','','Bubble name'),alias,create('label','','Give this bubble its instructions'),instructions,saveRole,launchCard);
const voiceChoice=create('select','ba-field');voiceChoice.setAttribute('aria-label','Speaking voice');
const voiceHint=create('p','ba-muted','Choose a voice installed on your device. British English is preferred automatically.');
function loadVoices(){
 const voices=typeof speechSynthesis==='undefined'?[]:speechSynthesis.getVoices();
 voiceChoice.replaceChildren();const auto=create('option','','Automatic · British English preferred');auto.value='';voiceChoice.append(auto);
 for(const voice of voices.filter(v=>/^en[-_]/i.test(v.lang))){const option=create('option','',voice.name+' · '+voice.lang);option.value=voice.voiceURI;voiceChoice.append(option)}
 voiceChoice.value=config.voiceURI||'';
 voiceHint.textContent=voices.some(v=>/^en[-_]GB/i.test(v.lang))?'British English is available. Preview voices to choose your favourite.':'No British English voice is available yet on this device. Your device speech settings control available voices.';
}
voiceChoice.addEventListener('change',()=>{config.voiceURI=voiceChoice.value;save(CONFIG,config)});
const previewVoice=create('button','ba-control','Preview voice');previewVoice.type='button';previewVoice.addEventListener('click',()=>speakText('Hello, I am '+config.alias+'. What shall we work on today?'));
edit.append(create('label','','Speaking voice'),voiceChoice,previewVoice,voiceHint);
if(typeof speechSynthesis!=='undefined')speechSynthesis.addEventListener?.('voiceschanged',loadVoices);
loadVoices();
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
const fullPage=create('a','ba-link','Open the Bubbles studio ↗');fullPage.href='/bubbles.html';fullPage.target='_blank';fullPage.rel='noopener noreferrer';
publishing.append(publishHint,publish,snippet,publishStatus,fullPage);
card.append(publishing);
host.append(card);
const launcher=create('button','ba-launcher','');launcher.type='button';launcher.setAttribute('aria-label','Connect Bubbles AI voice or open conversation');
launcher.append(create('span','ba-orb-shine'),create('span','ba-orb-center'));launcher.dataset.state='idle';
const panel=create('section','ba-panel');panel.hidden=true;panel.setAttribute('aria-label','Bubbles AI messenger');
const header=create('header','ba-header');const name=create('strong','',config.alias||'Bubbles');const close=create('button','ba-close','×');close.type='button';close.setAttribute('aria-label','Close Bubbles');
header.append(name,close);
const status=create('p','ba-status','Microphone off. Touch the bubble to connect, then speak naturally.');
status.setAttribute('role','status');
const conversation=create('div','ba-messages');conversation.setAttribute('role','log');conversation.setAttribute('aria-live','polite');
const composer=create('form','ba-composer');
const input=create('textarea','ba-field');input.rows=2;input.maxLength=2500;input.placeholder='Say something, ask a question, or describe a task…';input.setAttribute('aria-label','Message Bubbles');
const actions=create('div','ba-actions');
const mic=create('button','ba-mic','🎙 Enable listening');mic.type='button';mic.setAttribute('aria-pressed','false');
const speak=create('button','ba-speak','🔇 Voice off');speak.type='button';speak.setAttribute('aria-pressed','false');
const send=create('button','ba-send','Send');send.type='submit';
actions.append(mic,speak,send);composer.append(input,actions);
const privateLabel=create('label','ba-muted'),privateContext=create('input');privateContext.type='checkbox';privateContext.checked=config.privateContext===true;privateLabel.append(privateContext,create('span','',' Use my private Quant-AI selling defaults'));privateContext.addEventListener('change',()=>{config.privateContext=privateContext.checked;save(CONFIG,config)});composer.append(privateLabel);
const tools=create('details','ba-tools');const summary=create('summary','','Notes & authorized work');tools.append(summary);
const privacy=create('div','ba-privacy');
const privacyLabel=create('label','ba-privacy-label');
const historyToggle=create('input','');historyToggle.type='checkbox';historyToggle.checked=keepChat;
privacyLabel.append(historyToggle,create('span','','Keep recent chat on this device (optional)'));
const clearChat=create('button','ba-control','Clear chat');clearChat.type='button';
privacy.append(privacyLabel,clearChat);
const noteText=create('textarea','ba-field');noteText.rows=2;noteText.maxLength=3000;noteText.placeholder='Write a note you choose to keep on this device…';noteText.setAttribute('aria-label','Bubbles private note');
const saveNote=create('button','ba-control','Save note');saveNote.type='button';
if(nativeOverlay){noteText.hidden=true;saveNote.hidden=true;} // Voice/text 'take notes' is the main input.
const noteList=create('div','ba-notes');
const workText=create('textarea','ba-field');workText.rows=2;workText.maxLength=4000;workText.placeholder='Say fix a card, queue a bot job, or report the top ten tasks. Verified owners may also submit a draft here.';workText.setAttribute('aria-label','Work request for Robot Brain');
const workButton=create('button','ba-control','Send approved request to Robot Brain');workButton.type='button';workButton.hidden=true;
const siteDraftButton=create('button','ba-control','Share draft with this website');siteDraftButton.type='button';siteDraftButton.hidden=!embedded;
siteDraftButton.addEventListener('click',()=>{
 const request=workText.value.trim().slice(0,2000);
 if(!request){workStatus.textContent='Describe a website task first.';return;}
 // Explicit user gesture only. The host can listen for bubbles:work-draft,
 // but no job is executed and no owner token is present in this message.
 window.parent.postMessage({type:'quantaphi:bubbles:site-draft',id:bubbleId,request},'*');
 workStatus.textContent='Draft offered to this website. No bot job or wallet transaction was executed.';
});
const workStatus=create('p','ba-muted',embedded?'This is your website’s independent work draft. It has no access to QuantaPhi owner jobs. Your own verified site adapter must run any requested work.':'Bubbles queues real bot jobs from spoken instructions after owner-wallet verification. Only actual Brain receipts count.');
workStatus.setAttribute('role','status');
const toolRail=create('nav','ba-tool-rail');toolRail.setAttribute('aria-label','Infinity builder workspaces');
for(const [label,path] of [['Research · QuantaPhi','/'],['Build · Infinity Phi','/infinity-phi/'],['Code · Omni Phi','/omni-phi/']]){
 const link=create('a','ba-tool-link',label);link.href=path;link.rel='noopener';toolRail.append(link);
}
tools.append(toolRail,privacy,create('label','','Private notes'),noteText,saveNote,noteList,create('label','',embedded?'Website work draft':'Approved work request'),workText,workButton,siteDraftButton,workStatus);
panel.append(header,status,conversation,composer,tools);
if(embedded){
 const program=create('details','ba-program');program.append(create('summary','','Program this bubble'),edit);
 panel.insertBefore(program,composer);
}
document.body.append(launcher,panel);
function updateRole(){
 config={...config,role:persona.value,alias:alias.value.trim().slice(0,38)||'Bubbles',instructions:instructions.value.trim().slice(0,1200),voice:Boolean(config.voice),voiceURI:config.voiceURI||''};
 save(CONFIG,config);name.textContent=config.alias;status.textContent=ROLES[config.role].name+' · Oracle Cloudflare AI · account access not implied';
 voiceGate?.setName(config.alias);
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

function noteCommand(spoken){
 const text=String(spoken||'').trim();
 if(/^(?:please\s+)?(?:stop|finish|end)\s+(?:taking|writing|recording)\s+notes?[.!?]*$/i.test(text)){
  noteTaking=false;return 'Note-taking stopped. Your saved notes remain on this device.';
 }
 const start=text.match(/^(?:(?:please\s+)?(?:start|begin)\s+)?(?:taking|take|write|make|record)\s+notes?(?:\s+now)?[.!?]*$/i);
 if(start){noteTaking=true;return 'I am taking notes. Tell me what to write down. Say stop taking notes when finished.';}
 const dictated=text.match(/^(?:(?:please\s+)?(?:take|make|save|write|record)\s+(?:a\s+)?note(?:\s+that|\s+of)?|(?:please\s+)?write\s+down|remember\s+that)\s*[:,-]?\s+(.+)$/i);
 const content=dictated?dictated[1]:(noteTaking?text:'');
 if(!content)return '';
 if(!addNote(content))return 'I could not save that note. Check device storage.';
 renderNotes();
 return 'Saved note: '+content.slice(0,150)+(content.length>150?'…':'');
}
function addNote(value){
 const text=String(value||'').trim().slice(0,3000);
 if(!text)return false;
 const next=[{id:crypto.randomUUID?.()||String(Date.now()),text},...notes].slice(0,30);
 if(!save(NOTES,next))return false;
 notes=next;renderNotes();return true;
}
function speakText(value){
 if(typeof speechSynthesis==='undefined'||typeof SpeechSynthesisUtterance==='undefined'){
  status.textContent='Speech playback is not supported on this browser.';return;
 }
 try{speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(String(value).slice(0,2800));utterance.lang='en-GB';utterance.rate=1;
   const voices=speechSynthesis.getVoices?.()||[];
   utterance.voice=voices.find(v=>v.voiceURI===config.voiceURI)||voices.find(v=>/^en[-_]GB$/i.test(v.lang))||voices.find(v=>/^en[-_]GB/i.test(v.lang))||null;
   utterance.onstart=()=>{speaking=true;setOrbState('speaking')};
   const finished=()=>{speaking=false;if(voiceEnabled){setOrbState('listening');void streamVoice?.resume()}else setOrbState('idle')};
   utterance.onend=finished;utterance.onerror=finished;speechSynthesis.speak(utterance)
  }
 catch(error){status.textContent='Speech playback could not start: '+String(error?.message||error).slice(0,120)}
}
function display(text,who,greeting=false){
 const line=create('div','ba-line '+(who==='you'?'ba-line-you':'ba-line-ai'));
 const bubble=create('p','ba-message '+(who==='you'?'ba-you':'ba-assistant'),text);
 // Render only explicit HTTP(S) URLs as links; all other content stays text.
 if(who!=='you'){
  bubble.textContent='';let cursor=0;const value=String(text);
  for(const match of value.matchAll(/https?:\/\/[^\s<>"']+/g)){
   const url=match[0].replace(/[),.;!?]+$/,'');
   bubble.append(value.slice(cursor,match.index));
   const link=create('a','ba-reply-link',url);link.href=url;link.target='_blank';link.rel='noopener noreferrer';bubble.append(link);cursor=match.index+url.length;
  }
  bubble.append(value.slice(cursor));
 }
 line.append(bubble);
 if(who!=='you'&&!greeting){
  const row=create('div','ba-message-actions');
  const remember=create('button','ba-miniaction','Save note');remember.type='button';
  remember.addEventListener('click',()=>{
   if(addNote(text)){tools.open=true;status.textContent='Reply saved as a private note on this device.'}
   else status.textContent='Could not save note. Browser storage is unavailable.';
  });
  const task=create('button','ba-miniaction','Make work draft');task.type='button';
  task.addEventListener('click',()=>{
   workText.value=String(text).slice(0,4000);
   tools.open=true;workText.focus();
   workStatus.textContent=ownerReady?'Task draft prepared. Review it and press the approved Robot Brain button to send.':'Task draft prepared locally. Robot Brain submission requires a verified owner session; no work was sent.';
  });
  const say=create('button','ba-miniaction','Read aloud');say.type='button';
  say.addEventListener('click',()=>speakText(text));
  row.append(remember,task,say);line.append(row);
 }
 conversation.append(line);conversation.scrollTop=conversation.scrollHeight;
}
for(const item of messages)display(item.text,item.role==='user'?'you':'ai');
historyToggle.addEventListener('change',()=>{
 keepChat=historyToggle.checked;
 save(KEEP_HISTORY,keepChat);
 if(keepChat){
  status.textContent=persistChat()?'Recent conversation saved locally on this device.':'Could not save chat history to this browser.';
 }else{
  try{localStorage.removeItem(HISTORY)}catch{}
  status.textContent='Chat history will not be saved to device storage. Current messages remain until cleared or reloaded.';
 }
});
clearChat.addEventListener('click',()=>{
 messages=[];conversation.replaceChildren();greeted=false;
 try{localStorage.removeItem(HISTORY)}catch{}
 status.textContent='Local chat cleared. Private notes remain until you delete them separately.';
});
function toggle(open){
 showing=Boolean(open);panel.hidden=!showing;launcher.setAttribute('aria-expanded',String(showing));
 if(embedded)window.parent.postMessage({type:'quantaphi:bubbles:size',open:showing},'*');
 if(showing){
  if(!greeted&&!messages.length){display('Hello! I am '+config.alias+'. Once connected, just speak naturally. Say stop listening to mute.','ai',true);greeted=true}
  input.focus();
 }
 else{ /* Closing the panel does not disconnect the voice session. */ }
}
launcher.addEventListener('click',()=>{if(dragSuppressed){dragSuppressed=false;return}if(!voiceEnabled){toggle(true);void startVoice()}else toggle(!showing)});
launchCard.addEventListener('click',()=>{toggle(true);if(!voiceEnabled)void startVoice()});
close.addEventListener('click',()=>toggle(false));
function extract(reply){
 let value=reply?.reply??reply?.output_text??reply?.output??reply?.response??reply?.answer??reply?.content??reply?.message??'';
 if(Array.isArray(value))value=value.map(x=>x?.text||'').join('\n');
 if(value&&typeof value==='object')value=value.text||value.content||'';
 return String(value||'').trim();
}
function isOwnerWorkRequest(text){
 if(brainTools?.classify(text)==='queue')return true;
 const request=String(text||'').trim();
 if(!request||request.length>4000)return false;
 const verb=/\b(?:fix|repair|restore|debug|update|upgrade|build|create|wire|connect|replace|correct)\b/i;
 const target=/\b(?:quantaphi|website|site|page|card|widget|bubbles|bot|robot|brain|studio|image|video|player|upload|wallet|search|gallery|repository|github|store|radio|microphone)\b/i;
 const direct=/^(?:(?:please|hey bubbles|bubbles)\s+)*(?:fix|repair|restore|debug|update|upgrade|build|create|wire|connect|replace|correct)\b/i;
 const directive=/^(?:please\s+)?(?:i\s+(?:need|want)\s+(?:you\s+)?to|you\s+(?:need|have)\s+to|can\s+you|could\s+you|would\s+you|please|we\s+need\s+to)\b/i;
 const followup=/(?:^|[.!?]\s+)(?:please\s+)?(?:fix|repair|restore|update|upgrade|wire|connect)\b/i;
 return verb.test(request)&&target.test(request)&&(direct.test(request)||directive.test(request)||followup.test(request));
}
async function sendMessage(text){
 const spoken=String(text||'').trim();if(busy||!spoken)return;
 const noteResult=noteCommand(spoken);
 if(noteResult){
  display(spoken,'you');display(noteResult,'ai');status.textContent=noteResult;
  if(nativeOverlay&&nativeSpeechPending)nativeSpeechReply=noteResult;
  else if(config.voice&&!nativeOverlay)speakText(noteResult);
  nativeSpeechPending=false;
  return;
 }
 // An explicit "continue" resumes only the most recent OWNER work request;
 // model-written suggestions and unrelated old chat cannot trigger bot jobs.
 const continued=!embedded?brainTools?.resolveFollowupRequest?.(spoken,messages):'';
 const contextualRepair=!embedded?brainTools?.resolveRepairRequest?.(spoken,messages):'';
 const request=continued||contextualRepair||spoken;
 busy=true;send.disabled=true;display(spoken,'you');input.value='';setOrbState('thinking');
 const role=ROLES[config.role]||ROLES.assistant;
 const history=messages.slice(-6).map(m=>m.role+': '+m.text.slice(0,420)).join('\n');
 messages.push({role:'user',text:request});messages=messages.slice(-20);persistChat();
 status.textContent=config.alias+' is thinking…';
 let workEvidence='';
 if(!embedded&&isOwnerWorkRequest(request)){
  workText.value=request;tools.open=true;
  try{const ticket=await submitWork(request,'explicit-user-command');workEvidence=(continued?'Continuing your last request. ':'')+(ticket.deduplicated?'This request is already saved. Its recorded status is '+ticket.status+'.':'Your request is saved and waiting for the repair runner; you do not need to press another button.')+' Follow progress here: https://quantaphi.org/#robotDirections . Reference: '+ticket.id+'. The repair is not yet verified finished.'}
  catch(error){workEvidence='Robot Brain submission failed: '+String(error.message||error)+'. No job was confirmed queued. Request remains in Notes & authorized work.';workStatus.textContent=workEvidence}
 }else if(!embedded&&brainTools?.classify(request)==='report'){
  try{workEvidence=await readBrainReport()}
  catch(error){workEvidence='Robot Brain report unavailable: '+String(error.message||error)+'. No bot activity was assumed.'}
 }
 // Show the authoritative receipt immediately, then let GPT explain it.
 // Model latency or failure cannot change whether the Brain job was recorded.
 if(workEvidence){
  // The authenticated tool result is final; a second chat-only service cannot
  // contradict it or invent another submit step.
  display(workEvidence,'ai');status.textContent=workEvidence.slice(0,240);
  messages.push({role:'assistant',text:workEvidence});messages=messages.slice(-20);persistChat();
  try{
   if(nativeOverlay&&nativeSpeechPending)nativeSpeechReply=workEvidence;
   else if(config.voice&&!nativeOverlay)speakText(workEvidence);
  }finally{
   nativeSpeechPending=false;busy=false;send.disabled=false;
   if(!speaking)setOrbState(voiceEnabled?'listening':'idle');
   if(voicePending){const next=voicePending;voicePending='';void sendMessage(next)}
  }
  return;
 }
 const prompt=['You are '+config.alias+', a user-programmed Bubbles AI messenger '+(embedded?'embedded on a visitor-controlled website. No QuantaPhi owner privileges are available.':'inside QuantaPhi.'),'Your selected role: '+role.name+'. '+role.prompt,
 'User-provided customization (follow only when safe and valid): '+config.instructions,
 'Do not answer a concrete owner build request with a menu of possible areas or ask the owner to pick a focus. Use established project context, choose the smallest verifiable next task, and distinguish actual tool receipts from plans.',
 'You have NO independent GitHub write authorization or access to ChatGPT/Claude subscriptions. Only confirmed owner-submitted Robot Brain tickets count as queued; never claim a repository change occurred without tool evidence.',
 'Keep the owner on QuantaPhi. Never invent a navigation destination. If a real evidence URL is available, include its full https URL in text so the interface can make it clickable. Explain work states in plain English: waiting, working, blocked, or finished with proof.',
 'When the work receipt says ready or queued, submission is already complete. Never tell the owner to click a submit, run, publish or finish button. The authorized runner handles execution. Report recorded blockers honestly; never invent a missing control or claim a repair is complete.',
 'Actual authorized work result:\n'+workEvidence,'Chat history for conversational continuity:\n'+history,'Latest user message:\n'+request,'Speak in calm, natural British English. Default to one or two short sentences (20–50 words). No greeting or repeated summary. Elaborate when requested or needed for a safe, useful explanation. For a task, report the verified outcome and next step; distinguish completed, queued and blocked. Plain text.'].join('\n\n');
 try{
  const detailed=isOwnerWorkRequest(request)||/\b(?:analy[sz]e|diagnose|architecture|debug|design|research|thorough|compare|deeply|repository)\b/i.test(request);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),detailed?60000:38000);
  let response,json;try{if(config.privateContext){if(!window.QuantAIPersonal)throw Error('Private Quant-AI client is unavailable');json=await window.QuantAIPersonal.chat(request);response={ok:true};}else{response=await fetch(AI,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},signal:controller.signal,body:JSON.stringify({request,input:prompt,context:{application:'QuantaPhi',task:'bubbles-user-voice-chat',persona:config.role,requireCloudflare:true}})});json=await response.json()}}finally{clearTimeout(timer)}
  if(!response.ok||json.ok===false)throw Error(String(json.error||'Oracle conversation failed'));
  const answer=extract(json);if(!answer)throw Error('The AI returned no spoken or written reply');
  messages.push({role:'assistant',text:answer});messages=messages.slice(-20);persistChat();
  display(answer,'ai');status.textContent=config.alias+' · response received';
  if(json.receipt?.tool?.startsWith('resonance.')&&json.url==='https://quantaphi.org/resonance.html'){
   const row=create('div','ba-message-actions');
   const link=create('a','ba-link','Open Resonance Calculator ↗');
   link.href=json.url;link.target='_blank';link.rel='noopener noreferrer';
   row.append(link);conversation.append(row);
  }
  if(Array.isArray(json.sources)){
   const row=create('div','ba-message-actions');
   for(const source of json.sources.slice(0,5)){
    try{const url=new URL(source.url);if(url.protocol!=='https:')continue;
     const link=create('a','ba-link',String(source.title||'News source').slice(0,320));link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';row.append(link);
    }catch{}
   }
   conversation.append(row);
  }
  if(json.receipt)status.textContent=json.receipt.tool?.startsWith('resonance.')?'Resonance Engine · '+json.receipt.status+' · no robot job created':json.receipt.repositoryActionsVerified===false?config.alias+' · AI answer only · no bot work verified':config.alias+' · '+json.receipt.tool+' · '+json.receipt.status;
  if(nativeOverlay){
    // The Android foreground service handles speech output; typed messages
    // deliberately stay silent when the user is listening to another app.
    if(nativeSpeechPending)nativeSpeechReply=answer;
    nativeSpeechPending=false;
   }else if(config.voice)speakText(answer);
 }catch(error){const message=workEvidence||('I could not complete the response: '+String(error?.message||error).slice(0,150));display(message,'ai');status.textContent=message}
 finally{if(nativeOverlay&&nativeSpeechPending){
     nativeSpeechReply=workEvidence||'The assistant could not complete that request.';
     nativeSpeechPending=false;
   }
   busy=false;send.disabled=false;if(!speaking)setOrbState(voiceEnabled?'listening':'idle');
    if(voicePending){const next=voicePending;voicePending='';void sendMessage(next)}
  }
}
composer.addEventListener('submit',event=>{event.preventDefault();void sendMessage(input.value)});
input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();void sendMessage(input.value)}});
speak.addEventListener('click',()=>{config.voice=!config.voice;save(CONFIG,config);speak.textContent=config.voice?'🔊 Voice on':'🔇 Voice off';speak.setAttribute('aria-pressed',String(config.voice));if(!config.voice)try{speechSynthesis.cancel()}catch{}});
speak.textContent=config.voice?'🔊 Voice on':'🔇 Voice off';speak.setAttribute('aria-pressed',String(Boolean(config.voice)));
// Bubbles is already in-session when the microphone has been allowed. There is
// no call-start button, recording upload, or auto-open session without consent.
function setOrbState(state){
 launcher.dataset.state=state;
 launcher.setAttribute('aria-label',voiceEnabled?'Bubbles AI · '+state+' · tap to view conversation':'Bubbles AI · touch to enable the microphone');
}
function pauseRecognition(){
 if(!recognition)return;
 const old=recognition;recognition=null;
 old.onend=null;try{old.abort()}catch{try{old.stop()}catch{}}
}
function stopMeter(){
 if(meterFrame&&window.cancelAnimationFrame)window.cancelAnimationFrame(meterFrame);
 meterFrame=0;try{meterStream?.getTracks().forEach(track=>track.stop())}catch{}
 meterStream=null;meterAnalyser=null;
 try{audioContext?.close()}catch{}audioContext=null;
 launcher.style.setProperty('--ba-energy','0');
}
function stopVoice(message){
 voiceGeneration++;streamVoice?.stop();streamVoice=null;
 voiceResumeWanted=false;voiceEnabled=false;voicePending='';
 if(voiceRetry)clearTimeout(voiceRetry);voiceRetry=null;
 pauseRecognition();stopMeter();
 try{speechSynthesis.cancel()}catch{}
 speaking=false;setOrbState('idle');mic.textContent='🎙 Enable listening';
 mic.setAttribute('aria-pressed','false');
 status.textContent=message||'Microphone muted. Touch Bubbles to reconnect.';
}
function showLevel(){
 if(!voiceEnabled||!meterAnalyser)return;
 const samples=new Uint8Array(meterAnalyser.fftSize);
 meterAnalyser.getByteTimeDomainData(samples);
 let power=0;for(let i=0;i<samples.length;i++){const v=(samples[i]-128)/128;power+=v*v}
 const level=Math.min(1,Math.sqrt(power/samples.length)*12);
 if(level>.06)heardUntil=Date.now()+350;
 const hearing=Date.now()<heardUntil;
 launcher.style.setProperty('--ba-energy',String(Math.max(level,hearing?.65:0).toFixed(3)));
 if(!busy&&!speaking)setOrbState(hearing?'hearing':'listening');
 meterFrame=window.requestAnimationFrame?.(showLevel)||0;
}
function heardTranscript(transcript){
 if(!voiceEnabled||speaking||!voiceGate)return;
 heardUntil=Date.now()+750;setOrbState('hearing');launcher.style.setProperty('--ba-energy','1');
 status.textContent='Heard: '+transcript;launcher.dataset.words=String(transcript.split(/\s+/).length);
 const turn=voiceGate.accept(transcript,Date.now());
 if(turn.type==='mute'){stopVoice('Bubbles muted by your voice command.');return}
 if(turn.type==='wake'){status.textContent='I’m listening. Go ahead.';return}
 if(turn.type==='message'){if(busy)voicePending=turn.text;else void sendMessage(turn.text)}
}
async function startVoice(){
 if(voiceEnabled||voiceStarting)return;
 voiceStarting=true;const generation=++voiceGeneration;
 toggle(true);
 if(!voiceGate){voiceStarting=false;status.textContent='Voice command rules did not load. Reload this page.';return}
 if(!navigator.mediaDevices?.getUserMedia){voiceStarting=false;status.textContent='This browser cannot request a microphone. Open QuantaPhi in Chrome.';return}
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  if(generation!==voiceGeneration){stream.getTracks().forEach(t=>t.stop());return}
  meterStream=stream;voiceEnabled=true;voiceResumeWanted=true;voiceGate.reset();
  const module=window.BubblesContinuousVoice||await import(STREAM_VOICE_URL);
  const capture=await module.startContinuousVoice({
   stream,url:AI.replace('/v1/assist','/v1/transcribe'),isSpeaking:()=>speaking,
   onTranscript:heardTranscript,
   onStatus:message=>{if(voiceEnabled&&!busy&&!speaking)status.textContent=message},
   onLevel:level=>{
    if(!voiceEnabled)return;
    if(level>.015)heardUntil=Date.now()+350;
    launcher.style.setProperty('--ba-energy',String(Math.min(1,level*18)));
    if(!busy&&!speaking)setOrbState(Date.now()<heardUntil?'hearing':'listening');
   }
  });
  if(generation!==voiceGeneration){capture.stop();stream.getTracks().forEach(t=>t.stop());return}
  streamVoice=capture;mic.textContent='🔇 Mute Bubbles';mic.setAttribute('aria-pressed','true');
  setOrbState('listening');status.textContent='Microphone on continuously · speak naturally, no wake name needed.';
  if(config.voice)speakText('I am listening. Just speak naturally.');
 }catch(error){stopVoice('Microphone could not start: '+String(error?.message||error?.name||error).slice(0,130))}
 finally{voiceStarting=false}
}
mic.addEventListener('click',()=>{if(voiceEnabled)stopVoice();else void startVoice()});
document.addEventListener?.('visibilitychange',()=>{
 // Preserve the granted stream when switching tabs. Android may suspend web
 // recognition itself; reconnect the recognizer without cycling microphone permission.
 if(document.visibilityState!=='hidden'&&voiceEnabled){
  void streamVoice?.resume().catch(()=>{});
 }
});
window.addEventListener?.('pagehide',()=>{if(voiceEnabled)stopVoice()});
// Drag the literal bubble across the viewport; distinguish tap from movement.
launcher.addEventListener?.('pointerdown',event=>{
 if(event.button!==undefined&&event.button!==0)return;
 const rect=launcher.getBoundingClientRect?.();if(!rect)return;
 orbDragging={x:event.clientX,y:event.clientY,lastX:event.clientX,lastY:event.clientY,left:rect.left,top:rect.top,moved:false};
 launcher.setPointerCapture?.(event.pointerId);
});
launcher.addEventListener?.('pointermove',event=>{
 if(!orbDragging)return;
 const dx=event.clientX-orbDragging.x,dy=event.clientY-orbDragging.y;
 if(Math.hypot(dx,dy)<9&&!orbDragging.moved)return;
 orbDragging.moved=true;
 const width=launcher.offsetWidth||57,height=launcher.offsetHeight||57;
 const left=Math.max(4,Math.min(window.innerWidth-width-4,orbDragging.left+dx));
 const top=Math.max(4,Math.min(window.innerHeight-height-4,orbDragging.top+dy));
 if(embedded){
  window.parent.postMessage({type:'quantaphi:bubbles:move',dx:event.clientX-orbDragging.lastX,dy:event.clientY-orbDragging.lastY},'*');
  orbDragging.lastX=event.clientX;orbDragging.lastY=event.clientY;
 }else{
  launcher.style.left=left+'px';launcher.style.top=top+'px';
  launcher.style.right='auto';launcher.style.bottom='auto';
 }
});
launcher.addEventListener?.('pointerup',()=>{if(orbDragging?.moved)dragSuppressed=true;orbDragging=false});
function renderNotes(){
 noteList.replaceChildren();
 for(const note of notes.slice(0,8)){const box=create('div','ba-note');box.append(create('p','',note.text));const remove=create('button','ba-remove','Delete');remove.type='button';remove.addEventListener('click',()=>{notes=notes.filter(n=>n.id!==note.id);save(NOTES,notes);renderNotes()});box.append(remove);noteList.append(box)}
}
saveNote.addEventListener('click',()=>{
 if(addNote(noteText.value)){noteText.value='';workStatus.textContent='Note saved locally on this device. Not sent to AI or GitHub.'}
 else workStatus.textContent='Could not save note: check the text and browser storage.';
});
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
async function verifiedOwnerHeaders(){
 if(embedded)throw Error('Guest embed bubbles cannot access the owner Robot Brain.');
 if(ownerReady&&ownerHeaders)return ownerHeaders;
 if(!window.QuantaBrainOwner?.ready)throw Error('Robot Brain owner verification is unavailable on this page.');
 const headers=await Promise.race([window.QuantaBrainOwner.ready,new Promise(resolve=>setTimeout(()=>resolve(null),10000))]);
 if(!headers?.Authorization)throw Error('Verify your owner Unified Wallet on QuantaPhi. No job was submitted.');
 ownerHeaders=headers;ownerReady=true;workButton.hidden=false;
 workStatus.textContent='Robot Brain verified. Spoken job commands are ready.';
 return headers;
}
async function connectOwner(){
 if(embedded)return;
 // Late wallet verification must unlock Bubbles without any manual Brain button.
 const headers=window.QuantaBrainOwner?await window.QuantaBrainOwner.ready:null;
 if(!headers?.Authorization)return;
 ownerHeaders=headers;ownerReady=true;workButton.hidden=false;
 workStatus.textContent='Robot Brain connected. Say “Bubbles, fix the video generator” or “Report the top ten bot jobs.”';
}
async function readBrainReport(){
 const headers=await verifiedOwnerHeaders();
 const response=await fetch(BRAIN+'/work/tickets/list',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{}',cache:'no-store',signal:AbortSignal.timeout(20000)});
 const result=await response.json().catch(()=>({}));
 if(!response.ok||!result.ok||!Array.isArray(result.tickets))throw Error(String(result.error||'Owner ticket list unavailable'));
 return brainTools?.describeTickets(result.tickets,10)||'Robot Brain reporting helpers are unavailable.';
}
void connectOwner();
// Home loads the owner helper after this script. Deferred scripts finish before
// DOMContentLoaded; attach to its real verification promise after load order settles.
document.addEventListener?.('DOMContentLoaded',()=>void connectOwner(),{once:true});
async function submitWork(request,approval='explicit-click'){
 const headers=await verifiedOwnerHeaders();
 if(!brainTools)throw Error('Bubbles Brain tool helpers are not loaded.');
 if(workButton.disabled)throw Error('A work request is already being submitted.');
 if(!request)throw Error('Describe the repository work first.');
 workButton.disabled=true;workStatus.textContent='Sending your approved task to the owner inbox…';
 try{
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(new Date().toISOString().slice(0,10)+'|'+request.toLowerCase().replace(/\s+/g,' ').trim()));
  const submission=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
  const response=await fetch(TICKETS+'/work/tickets/create',{method:'POST',headers:{...headers,'Content-Type':'application/json'},signal:AbortSignal.timeout(30000),body:JSON.stringify({source_app:'QuantaPhi Bubbles AI',source_url:location.origin+location.pathname,title:request.slice(0,120),request,context:{kind:'robot-directions',submission_id:submission,requested_role:config.role,approval,repository_writes:'require-github-authorization'}})});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||!result.ok||!result.ticket?.id)throw Error(String(result.error||result.message||'No confirmed ticket'));
  const existingJobs=result.ticket.context?.color_jobs;
  if(result.deduplicated&&Array.isArray(existingJobs)&&existingJobs.length){
   workText.value='';
   workStatus.textContent='Robot Brain ticket '+result.ticket.id+' already exists ('+result.ticket.status+'). No duplicate jobs created.';
   return {id:result.ticket.id,status:result.ticket.status,deduplicated:true};
  }
  if(!['draft','ready','blocked'].includes(result.ticket.status))throw Error('Existing ticket '+result.ticket.id+' is '+result.ticket.status+'; inspect progress in Robot Brain.');
  const jobs=brainTools.makeJobs(request);
  const updated=await fetch(TICKETS+'/work/tickets/update',{method:'POST',headers:{...headers,'Content-Type':'application/json'},signal:AbortSignal.timeout(20000),body:JSON.stringify({id:result.ticket.id,status:'ready',storyboard:JSON.stringify(jobs),context:{...result.ticket.context,color_jobs:jobs}})});
  const ready=await updated.json().catch(()=>({}));if(!updated.ok||!ready.ok)throw Error(ready.error||'Ticket saved as a draft but not ready; check Robot Brain.');
  workText.value='';window.dispatchEvent(new CustomEvent('quantaphi:robot-directions',{detail:{ticketId:result.ticket.id,jobs}}));
  workStatus.textContent='Robot Brain ticket '+result.ticket.id+' confirmed ready with '+jobs.length+' queued jobs. No execution is claimed yet.';return {id:result.ticket.id,status:'ready',deduplicated:false};
 }catch(error){workStatus.textContent='Ticket could not be confirmed: '+String(error?.message||error).slice(0,145);throw error}
 finally{workButton.disabled=false}
}
workButton.addEventListener('click',()=>{void submitWork(workText.value.trim()).catch(()=>{})});
// Android hands off text only. Owner credentials remain in the verified website;
// an explicit owner button press is required before saving any ticket.
const incomingWork=params.get('workRequest');
if(!embedded&&incomingWork&&incomingWork.length<=1800){
 workText.value=incomingWork;tools.open=true;toggle(true);
 workStatus.textContent='Android work draft received. Verify your owner wallet and press Send approved request to Robot Brain. No ticket has been submitted.';
 history.replaceState(null,'',location.pathname);
}
window.QuantaBubbles={
 open:()=>toggle(true),close:()=>toggle(false),
 isNativeOverlay:nativeOverlay,
 // Called only by Bubbles' Android WebView after verifying the first-party
 // HTTPS URL. Reuse real site chat, real owner verification and job receipts.
 sendNativeSpeech:(message)=>{
  if(!nativeOverlay||busy)return false;
  const value=String(message||'').slice(0,1800).trim();
  if(!value)return false;
  nativeSpeechReply='';nativeSpeechPending=true;
  void sendMessage(value);
  return true;
 },
 drainNativeReply:()=>{
  if(!nativeOverlay)return '';
  const value=nativeSpeechReply;nativeSpeechReply='';return value;
 }
};
if(nativeOverlay){
 // Same composer, source links, notes, bot status and instructions as QuantaPhi.
 // The native service owns the microphone and spoken audio to prevent echoes.
 toggle(true);
 mic.hidden=true;
 speak.hidden=true;
 launchCard.hidden=true;
 launcher.hidden=true;
 status.textContent='Bubbles website assistant · native microphone · owner wallet verification required for Brain jobs';
}
if(embedded){launcher.style.bottom='3px';launcher.style.right='3px'};
// An embed opens inside a sandboxed iframe; only window dimensions are messaged.

})();


