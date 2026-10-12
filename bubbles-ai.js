/* Bubbles AI: opt-in voice chat, user-authored personas, notes, owner-approved bot tickets.
   Provider subscriptions and GitHub permissions are never inferred from browser sessions. */
(function(){
'use strict';
const host=document.getElementById('bubblesAICard');
if(!host)return;
// The tool gateway delegates ordinary chat to Oracle /v1/chat.
const AI='https://bubbles-tools.marvaseater.workers.dev/v1/assist';
const TICKETS='https://infinity-work-tickets.marvaseater.workers.dev';
const BRAIN='https://infinity-brain-clock.marvaseater.workers.dev';
const params=new URLSearchParams(location.search);
const embedded=params.get('embed')==='1'&&window.parent!==window;
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
let greeted=messages.length>0,busy=false,listening=null,ownerToken='',ownerReady=false,showing=false;
let voiceEnabled=false,recognition=null,voicePending='',speaking=false,voiceRetry=null,tries=0;
let meterStream=null,audioContext=null,meterAnalyser=null,meterFrame=0,orbDragging=false,dragSuppressed=false;
const voiceGate=window.BubblesVoiceGate?.create({followupMs:30000,name:config.alias})||null;

function persistChat(){
 if(!keepChat)return false;
 return save(HISTORY,messages.slice(-12).map(item=>({role:item.role,text:item.text.slice(0,1800)})));
}
const card=create('section','ba-card ba-studio-card');
card.append(create('div','ba-eyebrow','ORACLE OCTAVES · VOICE COMPANION'),create('h2','','Bubbles AI'),create('p','ba-copy','A living voice bubble. Touch the bubble to allow your microphone, then say “Bubbles” and talk. It lights up when it hears you.'));
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
const status=create('p','ba-status','Microphone off. Touch the bubble to connect, then say “Bubbles”.');
status.setAttribute('role','status');
const conversation=create('div','ba-messages');conversation.setAttribute('role','log');conversation.setAttribute('aria-live','polite');
const composer=create('form','ba-composer');
const input=create('textarea','ba-field');input.rows=2;input.maxLength=2500;input.placeholder='Say something, ask a question, or describe a task…';input.setAttribute('aria-label','Message Bubbles');
const actions=create('div','ba-actions');
const mic=create('button','ba-mic','🎙 Enable listening');mic.type='button';mic.setAttribute('aria-pressed','false');
const speak=create('button','ba-speak','🔇 Voice off');speak.type='button';speak.setAttribute('aria-pressed','false');
const send=create('button','ba-send','Send');send.type='submit';
actions.append(mic,speak,send);composer.append(input,actions);
const tools=create('details','ba-tools');const summary=create('summary','','Notes & authorized work');tools.append(summary);
const privacy=create('div','ba-privacy');
const privacyLabel=create('label','ba-privacy-label');
const historyToggle=create('input','');historyToggle.type='checkbox';historyToggle.checked=keepChat;
privacyLabel.append(historyToggle,create('span','','Keep recent chat on this device (optional)'));
const clearChat=create('button','ba-control','Clear chat');clearChat.type='button';
privacy.append(privacyLabel,clearChat);
const noteText=create('textarea','ba-field');noteText.rows=2;noteText.maxLength=3000;noteText.placeholder='Write a note you choose to keep on this device…';noteText.setAttribute('aria-label','Bubbles private note');
const saveNote=create('button','ba-control','Save note');saveNote.type='button';
const noteList=create('div','ba-notes');
const workText=create('textarea','ba-field');workText.rows=2;workText.maxLength=4000;workText.placeholder='A specific GitHub/repository task for Robot Brain. Sent only when you approve.';workText.setAttribute('aria-label','Work request for Robot Brain');
const workButton=create('button','ba-control','Send approved request to Robot Brain');workButton.type='button';workButton.hidden=true;
const workStatus=create('p','ba-muted','Repository writes require your authorized GitHub integration. Only verified platform owners can submit to the existing Robot Brain inbox here.');
workStatus.setAttribute('role','status');
const toolRail=create('nav','ba-tool-rail');toolRail.setAttribute('aria-label','Infinity builder workspaces');
for(const [label,path] of [['Research · QuantaPhi','/'],['Build · Infinity Phi','/infinity-phi/'],['Code · Omni Phi','/omni-phi/']]){
 const link=create('a','ba-tool-link',label);link.href=path;link.rel='noopener';toolRail.append(link);
}
tools.append(toolRail,privacy,create('label','','Private notes'),noteText,saveNote,noteList,create('label','','Approved work request'),workText,workButton,workStatus);
panel.append(header,status,conversation,composer,tools);
if(embedded){
 const program=create('details','ba-program');program.append(create('summary','','Program this bubble'),edit);
 panel.insertBefore(program,composer);
}
document.body.append(launcher,panel);
function updateRole(){
 config={role:persona.value,alias:alias.value.trim().slice(0,38)||'Bubbles',instructions:instructions.value.trim().slice(0,1200),voice:Boolean(config.voice)};
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
 try{speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(String(value).slice(0,2800));utterance.lang='en-GB';utterance.rate=1.08;
   const voices=speechSynthesis.getVoices?.()||[];
   utterance.voice=voices.find(v=>/^en[-_]GB$/i.test(v.lang))||voices.find(v=>/^en[-_]GB/i.test(v.lang))||null;
   utterance.onstart=()=>{speaking=true;setOrbState('speaking');pauseRecognition()};
   const finished=()=>{speaking=false;if(voiceEnabled)beginRecognition();else setOrbState('idle')};
   utterance.onend=finished;utterance.onerror=finished;speechSynthesis.speak(utterance)
  }
 catch(error){status.textContent='Speech playback could not start: '+String(error?.message||error).slice(0,120)}
}
function display(text,who,greeting=false){
 const line=create('div','ba-line '+(who==='you'?'ba-line-you':'ba-line-ai'));
 const bubble=create('p','ba-message '+(who==='you'?'ba-you':'ba-assistant'),text);
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
  if(!greeted&&!messages.length){display('Hello! I am '+config.alias+'. Once connected, say Bubbles and speak naturally. Say Bubbles go quiet to mute.','ai',true);greeted=true}
  input.focus();
 }
 else{ /* Closing the panel does not disconnect the voice session. */ }
}
launcher.addEventListener('click',()=>{if(dragSuppressed){dragSuppressed=false;return}if(!voiceEnabled){void startVoice();return}toggle(!showing)});
launchCard.addEventListener('click',()=>{toggle(true);if(!voiceEnabled)void startVoice()});
close.addEventListener('click',()=>toggle(false));
function extract(reply){
 let value=reply?.output_text??reply?.output??reply?.response??reply?.answer??reply?.content??reply?.message??'';
 if(Array.isArray(value))value=value.map(x=>x?.text||'').join('\n');
 if(value&&typeof value==='object')value=value.text||value.content||'';
 return String(value||'').trim();
}
async function sendMessage(text){
 const request=String(text||'').trim();if(busy||!request)return;
 busy=true;send.disabled=true;display(request,'you');input.value='';setOrbState('thinking');
 const role=ROLES[config.role]||ROLES.assistant;
 const history=messages.slice(-10).map(m=>m.role+': '+m.text.slice(0,650)).join('\n');
 messages.push({role:'user',text:request});messages=messages.slice(-20);persistChat();
 status.textContent=config.alias+' is thinking…';
 const prompt=['You are '+config.alias+', a user-programmed Bubbles AI messenger inside QuantaPhi.','Your selected role: '+role.name+'. '+role.prompt,
 'User-provided customization (follow only when safe and valid): '+config.instructions,
 'You have NO independent GitHub write authorization or access to ChatGPT/Claude subscriptions. Only confirmed owner-submitted Robot Brain tickets count as queued; never claim a repository change occurred without tool evidence.',
 'Chat history for conversational continuity:\n'+history,'Latest user message:\n'+request,'Reply directly and use clear plain text.'].join('\n\n');
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),22000);
  let response;try{response=await fetch(AI,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},signal:controller.signal,body:JSON.stringify({request,input:prompt,context:{application:'QuantaPhi',task:'bubbles-user-voice-chat',persona:config.role,requireCloudflare:true}})})}finally{clearTimeout(timer)}
  const json=await response.json().catch(()=>({}));
  if(!response.ok||json.ok===false)throw Error(String(json.error||'Oracle conversation failed'));
  const answer=extract(json);if(!answer)throw Error('The AI returned no spoken or written reply');
  messages.push({role:'assistant',text:answer});messages=messages.slice(-20);persistChat();
  display(answer,'ai');status.textContent=config.alias+' · response received';
  if(Array.isArray(json.sources)){
   const row=create('div','ba-message-actions');
   for(const source of json.sources.slice(0,5)){
    try{const url=new URL(source.url);if(url.protocol!=='https:')continue;
     const link=create('a','ba-link',String(source.title||'News source').slice(0,320));link.href=url.href;link.target='_blank';link.rel='noopener noreferrer';row.append(link);
    }catch{}
   }
   conversation.append(row);
  }
  if(json.receipt)status.textContent=config.alias+' · '+json.receipt.tool+' · '+json.receipt.status;
  if(config.voice)speakText(answer);
 }catch(error){const message='I could not complete the response: '+String(error?.message||error).slice(0,150);display(message,'ai');status.textContent=message}
 finally{busy=false;send.disabled=false;if(!speaking)setOrbState(voiceEnabled?'listening':'idle');
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
 voiceEnabled=false;voicePending='';
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
 const level=Math.min(1,Math.sqrt(power/samples.length)*7);
 launcher.style.setProperty('--ba-energy',String(level.toFixed(3)));
 if(!busy&&!speaking)setOrbState(level>.19?'hearing':'listening');
 meterFrame=window.requestAnimationFrame?.(showLevel)||0;
}
function beginRecognition(){
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!voiceEnabled||recognition||speaking||document.visibilityState==='hidden'||!Recognition)return;
 const r=new Recognition();recognition=r;listening=r;
 r.lang='en-GB';r.continuous=true;r.interimResults=true;r.maxAlternatives=1;
 r.onaudiostart=()=>{tries=0;setOrbState('listening')};
 r.onsoundstart=()=>{if(!speaking)setOrbState('hearing')};
 r.onresult=event=>{
  const from=Number(event.resultIndex||0);
  for(let i=from;i<(event.results?.length||0);i++){
   const result=event.results[i],transcript=String(result?.[0]?.transcript||'').trim();
   if(!transcript)continue;
   if(!result.isFinal){if(!speaking){setOrbState('hearing');status.textContent='Hearing your voice · say Bubbles to address me.'}continue}
   // Ignore the assistant's synthesized speech. Only addressed speech becomes a request.
   if(speaking||!voiceGate)continue;
   const turn=voiceGate.accept(transcript,Date.now());
   if(turn.type==='mute'){stopVoice('Bubbles muted by your voice command.');return}
   if(turn.type==='wake'){status.textContent='I’m listening. Go ahead.';setOrbState('listening');continue}
   if(turn.type==='message'){
    status.textContent='Heard you · responding…';
    if(busy)voicePending=turn.text;
    else void sendMessage(turn.text);
   }
  }
 };
 r.onerror=event=>{
  const error=String(event.error||'unknown');
  if(error==='not-allowed'||error==='service-not-allowed'||error==='audio-capture'){
   stopVoice('Microphone unavailable: '+error+'. Use the keyboard or allow microphone access.');return;
  }
  if(error!=='no-speech')status.textContent='Speech recognition: '+error+'. Reconnecting if allowed.';
 };
 r.onend=()=>{
  if(recognition!==r)return;
  recognition=null;listening=null;
  if(!voiceEnabled||speaking||document.visibilityState==='hidden')return;
  if(voiceRetry)clearTimeout(voiceRetry);
  voiceRetry=setTimeout(()=>{voiceRetry=null;beginRecognition()},Math.min(2500,300*Math.pow(1.5,Math.min(tries++,5))));
 };
 try{r.start();setOrbState('listening');status.textContent=config.alias+' is listening. Say “'+config.alias+'” and your request.'}
 catch(error){recognition=null;listening=null;stopVoice('Speech recognition could not start: '+String(error?.message||error).slice(0,110))}
}
async function startVoice(){
 if(voiceEnabled)return;
 // Unlock spoken output in the tap gesture, before microphone permission awaits.
 toggle(true);
 if(config.voice)speakText('Hello, I am '+config.alias+'. Say '+config.alias+' and your request.');
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!Recognition||!voiceGate){toggle(true);status.textContent='Continuous speech recognition is not supported here. You can still type. An Android app is needed for other apps.';return}
 if(!navigator.mediaDevices?.getUserMedia){toggle(true);status.textContent='This browser cannot request a microphone stream. Use the keyboard.';return}
 try{
  const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});
  meterStream=stream;voiceEnabled=true;tries=0;voiceGate.reset();
  const Ctx=window.AudioContext||window.webkitAudioContext;
  if(Ctx&&window.requestAnimationFrame){
   try{audioContext=new Ctx();const source=audioContext.createMediaStreamSource(stream);
    meterAnalyser=audioContext.createAnalyser();meterAnalyser.fftSize=256;
    source.connect(meterAnalyser);showLevel();
   }catch{ /* Browser recognition still works without the amplitude analyser. */ }
  }
  mic.textContent='🔇 Mute Bubbles';mic.setAttribute('aria-pressed','true');
  beginRecognition();
 }catch(error){stopMeter();toggle(true);status.textContent='Microphone was not enabled: '+String(error?.name||error?.message||error).slice(0,130)}
}
mic.addEventListener('click',()=>{if(voiceEnabled)stopVoice();else void startVoice()});
document.addEventListener?.('visibilitychange',()=>{
 if(document.visibilityState==='hidden'&&voiceEnabled)stopVoice('Bubbles paused when this page went into the background. Touch the bubble to reconnect.');
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

