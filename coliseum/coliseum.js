import {MODEL_CARDS,SECTORS,MAX_MEMBERS_PER_MODEL,createProposal,castDeviceVote,forkProposal,reviewIdeaSignals,modelById} from './coliseum-core.mjs';
const KEY='infinity:coliseum-prototype:v1';
const el=id=>document.getElementById(id);
const node=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const safeRead=()=>{try{const d=JSON.parse(localStorage.getItem(KEY)||'null');if(d&&Array.isArray(d.ideas)&&Array.isArray(d.notes)&&d.ideas.length<=100&&d.notes.length<=200)return d}catch{}return {ideas:[],notes:[],votes:{}}};
let store=safeRead(),selectedModel='zeus',selectedSector='Technology';
const notify=text=>{el('roomStatus').textContent=text};
const write=()=>{try{localStorage.setItem(KEY,JSON.stringify(store));return true}catch{notify('Browser could not save this draft. Keep a separate copy.');return false}};
const safeId=()=>crypto.randomUUID();
const formatDate=s=>{const d=new Date(s);return Number.isFinite(d.valueOf())?d.toLocaleDateString():''};
const modelOptions=m=>m.name+' '+m.version;
function renderModels(){
 const root=el('modelCards');root.replaceChildren();
 for(const m of MODEL_CARDS){
  const b=node('button','god-card'+(m.id===selectedModel?' selected':''));b.type='button';
  b.setAttribute('aria-pressed',String(m.id===selectedModel));
  b.append(node('span','glyph',m.icon),node('span','edition','INFINITY EXPERIENCE '+m.version),
   node('strong','',m.name),node('span','domain',m.title),node('span','description',m.description),
   node('span','pricing',(m.price?'Proposed $'+m.price+'/month':'Proposed free')+' · '+MAX_MEMBERS_PER_MODEL+' seats planned'),
   node('span','click',m.id===selectedModel?'Selected':'Explore this card →'));
  b.addEventListener('click',()=>selectModel(m.id,true));root.append(b);
 }
}
function renderRooms(){
 const root=el('roomList');root.replaceChildren();
 for(const m of MODEL_CARDS){
  const b=node('button','room-btn'+(m.id===selectedModel?' active':''),modelOptions(m));
  b.type='button';b.append(node('span','',m.domain));b.setAttribute('aria-pressed',String(m.id===selectedModel));
  b.addEventListener('click',()=>selectModel(m.id));root.append(b);
 }
}
function renderSectors(){
 const root=el('sectors');root.replaceChildren();
 for(const sector of SECTORS){
  const b=node('button','sector-btn'+(selectedSector===sector?' active':''),sector);
  b.type='button';b.setAttribute('aria-pressed',String(selectedSector===sector));
  b.addEventListener('click',()=>{selectedSector=sector;renderSectors();renderIdeas();renderChat();notify('Viewing '+sector+' drafts in '+modelById(selectedModel).name+'. These are not public rooms.')});
  root.append(b);
 }
}
function selectModel(id,scroll=false){
 const m=modelById(id);if(!m)return;
 selectedModel=id;renderModels();renderRooms();renderIdeas();renderChat();
 el('currentRoom').textContent=modelOptions(m);
 el('roomHeadline').textContent=m.id==='zeus'?'The Thunder Arena':m.name+' · '+m.domain;
 notify(m.price?'Concept edition. Payment and real group access are not connected; preview only.':'Free-edition concept. No real account, AI conversation or group access is implied.');
 if(scroll)el('arena').scrollIntoView({behavior:'smooth',block:'start'});
}
function roomIdeas(){return store.ideas.filter(i=>i.modelId===selectedModel&&i.sector===selectedSector).slice().reverse()}
function renderIdeas(){
 const root=el('ideaList');root.replaceChildren();
 const current=roomIdeas();el('ideaCount').textContent=current.length+' local '+(current.length===1?'idea':'ideas');
 if(!current.length){root.append(node('p','blank','No ideas saved here yet. Be the first to draft one on this device.'));return}
 for(const idea of current){
  const wrap=node('article','idea-card'),head=node('header'),text=node('div');
  text.append(node('h5','',idea.title),node('span','idea-date',formatDate(idea.createdAt)+' · '+idea.sector+(idea.parentId?' · Branch from '+idea.parentId.slice(0,8):'')));
  head.append(text,node('span','idea-date','LOCAL DRAFT'));wrap.append(head,node('p','',idea.description));
  const signals=reviewIdeaSignals(idea);
  wrap.append(node('p','idea-stats',signals.support+' support · '+signals.questions+' questions (device-only, not member votes)'));
  const actions=node('div','idea-actions');
  const voted=Boolean(store.votes?.[idea.id]);
  for(const [type,label] of [['support','Support this idea'],['question','Ask for changes']]){
   const b=node('button','',label);b.type='button';b.disabled=voted;
   b.addEventListener('click',()=>{
    const index=store.ideas.findIndex(i=>i.id===idea.id);if(index<0)return;
    const tally=castDeviceVote(store.ideas[index],type,store.votes);
    if(tally.alreadyVoted)return;
    store.ideas[index]=tally.idea;store.votes=tally.deviceVotes;write();renderIdeas();
    notify('Your local '+(type==='support'?'support':'question')+' was saved. No other builders were notified.');
   });
   actions.append(b);
  }
  const fork=node('button','','Branch project');fork.type='button';fork.addEventListener('click',()=>{
   if(store.ideas.length>=80){notify('Local draft limit reached; clear old drafts to continue.');return}
   const next=forkProposal(idea,safeId());store.ideas.push(next);write();renderIdeas();
   notify('A separate project draft was created, preserving the original. Nobody was removed from a real room.');
  });actions.append(fork);
  const blueprint=node('button','','View build outline');blueprint.type='button';blueprint.addEventListener('click',()=>{
   notify('Build outline for '+idea.title+': define the problem → collect evidence → prototype → review risks → test with collaborators. This is a template, not an AI-generated build.');
  });actions.append(blueprint);wrap.append(actions);root.append(wrap);
 }
}
function renderChat(){
 const root=el('chatLog');root.replaceChildren();
 const notes=store.notes.filter(n=>n.modelId===selectedModel&&n.sector===selectedSector).slice(-30);
 if(!notes.length){root.append(node('p','blank','No notes in this device-only conversation yet.'));return}
 for(const note of notes){
  const div=node('div','chat-note');div.append(node('small','You · '+formatDate(note.createdAt)),node('p','',note.text));root.append(div);
 }
}
// Open the existing Bubbles chat once, inside Zeus' actual Chat tab.
// The iframe never receives wallet credentials, owner powers or fake replies.
let zeusAssistantStarted=false,zeusAssistantReady=false,questPending=null,questLastAttempt=null;
function mountZeusAssistant(){
 if(zeusAssistantStarted)return;
 const iframe=el('zeusAssistantFrame'),status=el('zeusAssistantStatus');
 if(!iframe||!status)return;
 zeusAssistantStarted=true;
 const id='coliseum-zeus-assistant';
 const query=new URLSearchParams({embed:'1',id,role:'builder',name:'Zeus AI',
  instructions:'You are Zeus AI, the Infinity Coliseum builder, using the existing Bubbles assistant service. Give useful answers, identify tool limitations honestly, and ask before publishing, charging or running owner jobs.'});
 iframe.addEventListener('load',()=>{
  zeusAssistantReady=true;
  iframe.contentWindow?.postMessage({type:'quantaphi:bubbles:open',id},window.location.origin);
  status.textContent='Bubbles conversation is open. Send a question to test the connected AI service.';
  deliverQuest();
 });
 iframe.addEventListener('error',()=>{
  zeusAssistantReady=false;
  status.textContent='Bubbles chat could not load. Use the full Bubbles chat link below.';
  el('zeusQuestStatus').textContent='Chat unavailable. Your question is still in the textbox.';
  el('zeusQuestSend').disabled=false;
  questPending=null;
 });
 iframe.src='/bubbles.html?'+query.toString();
}
// The top-page Send is a user-initiated handoff to the SAME Bubbles AI conversation.
 // A request ID prevents lost-ack retries from duplicating a question.
function deliverQuest(){
 if(!zeusAssistantReady||!questPending||questPending.dispatched)return;
 const iframe=el('zeusAssistantFrame');
 questPending.dispatched=true;
 iframe.contentWindow?.postMessage({
  type:'quantaphi:bubbles:quest',id:'coliseum-zeus-assistant',
  requestId:questPending.requestId,prompt:questPending.text
 },window.location.origin);
}
const questForm=el('zeusQuestForm'),questInput=el('zeusQuestInput'),
 questSend=el('zeusQuestSend'),questStatus=el('zeusQuestStatus');
questInput.addEventListener('keydown',event=>{
 if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){
  event.preventDefault();questForm.requestSubmit();
 }
});
questForm.addEventListener('submit',event=>{
 event.preventDefault();
 const text=questInput.value.trim();
 if(!text||text.length>1800||questPending)return;
 setMode('chat');
 const requestId=questLastAttempt?.text===text?questLastAttempt.requestId:
  'quest_'+crypto.randomUUID();
 const pending={requestId,text,dispatched:false};
 questPending=pending;questLastAttempt={requestId,text};
 questSend.disabled=true;
 questStatus.textContent=zeusAssistantReady?
  'Sending your question into the Bubbles conversation…':
  'Connecting to Bubbles. Your question stays here until accepted.';
 deliverQuest();
 // No automatic repeat: a missing acknowledgement leaves the user's text intact.
 setTimeout(()=>{
  if(questPending!==pending)return;
  questPending=null;questSend.disabled=false;
  questStatus.textContent='No acknowledgment from Bubbles. Your question is still here; press Send to retry.';
 },12000);
});
window.addEventListener('message',event=>{
 const iframe=el('zeusAssistantFrame'),data=event.data;
 if(event.origin!==window.location.origin||event.source!==iframe?.contentWindow||
  !questPending||data?.type!=='quantaphi:bubbles:quest-ack'||
  data.id!=='coliseum-zeus-assistant'||data.requestId!==questPending.requestId)return;
 const accepted=data.status==='accepted';
 if(accepted){
  // User might have started typing a second message after pressing Send.
  if(questInput.value.trim()===questPending.text)questInput.value='';
  questLastAttempt=null;
  questStatus.textContent='Question accepted by Bubbles. The AI reply appears in the conversation below.';
  el('zeusAssistantMount')?.scrollIntoView?.({block:'start',behavior:'smooth'});
 }else{
  if(data.status==='busy')questLastAttempt=null;
  questStatus.textContent=data.status==='busy'?
   'Bubbles is working on another reply. Your text is saved here; send it again when ready.':
   'Bubbles did not accept this question. Your text remains here to retry.';
 }
 questPending=null;questSend.disabled=false;
});
function setMode(next){
 el('chatPane').hidden=next!=='chat';el('buildPane').hidden=next!=='build';
 if(next==='chat')mountZeusAssistant();
 el('chatTab').setAttribute('aria-pressed',String(next==='chat'));
 el('buildTab').setAttribute('aria-pressed',String(next==='build'));
 notify(next==='chat'?'Zeus chat uses Bubbles AI. Send a message to check live responses.':'Build mode keeps project drafts on your device; shared rooms are still a prototype.');
}
el('pitchForm').addEventListener('submit',event=>{
 event.preventDefault();
 if(store.ideas.length>=80){notify('Local demo is full; clear drafts to continue.');return}
 try{
  const idea=createProposal({title:el('ideaTitle').value,description:el('ideaDescription').value,sector:selectedSector,modelId:selectedModel},Date.now(),safeId());
  store.ideas.push(idea);if(!write())return;event.currentTarget.reset();renderIdeas();
  notify('Your '+selectedSector+' idea is saved locally under '+modelById(selectedModel).name+'. No real group was notified.');
 }catch(error){notify('Please add a descriptive title and explain the idea. '+String(error?.message||''))}
});
el('chatForm').addEventListener('submit',event=>{
 event.preventDefault();
 const note=el('chatMessage').value.trim().replace(/[\u0000-\u001f]/g,' ').slice(0,1000);
 if(note.length<2)return;
 if(store.notes.length>=150){notify('Local note limit reached; clear demo to continue.');return}
 store.notes.push({id:safeId(),text:note,sector:selectedSector,modelId:selectedModel,createdAt:new Date().toISOString()});
 if(!write())return;el('chatMessage').value='';renderChat();notify('Your note was saved on this device only.');
});
el('chatTab').addEventListener('click',()=>setMode('chat'));
el('buildTab').addEventListener('click',()=>setMode('build'));
el('switchRoom').addEventListener('click',()=>{
 const next=MODEL_CARDS[(MODEL_CARDS.findIndex(x=>x.id===selectedModel)+1)%MODEL_CARDS.length];
 selectModel(next.id);notify('Moved to '+next.name+' preview. Previous drafts and branches remain saved locally.');
});
el('resetDemo').addEventListener('click',()=>{
 if(!confirm('Clear local Coliseum ideas, votes and notes from this browser?'))return;
 store={ideas:[],notes:[],votes:{}};write();renderIdeas();renderChat();notify('Local demo cleared. No wallet or cloud account was changed.');
});
renderModels();renderRooms();renderSectors();renderIdeas();renderChat();setMode('chat');
