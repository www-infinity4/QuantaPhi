import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const ui=readFileSync('bubbles-ai.js','utf8');
const native=readFileSync('android/bubbles-overlay/app/src/main/java/org/quantaphi/bubbles/FloatingOracleWindow.java','utf8');
const THREAD_KEY='quantaphi:bubbles:threads:v2';
const SHARED='bubbles_shared_main_v1';
function startup({local=new Map(),session=new Map(),embedded=false}={}){
 const ctx={
  bubbleId:'',embedded,HISTORY:'old-history',keepChat:true,
  crypto:{randomUUID:()=> '00000000-0000-4000-8000-'+Math.floor(Math.random()*1e12).toString().padStart(12,'0')},
  data:(key,fallback)=>local.has(key)?JSON.parse(local.get(key)):fallback,
  save:(key,value)=>{local.set(key,JSON.stringify(value));return true},
  sessionStorage:{
   getItem:key=>session.get(key)||null,
   setItem:(key,value)=>session.set(key,String(value)),
   removeItem:key=>session.delete(key)
  },
  _local:local,_session:session
 };
 const start=ui.indexOf("const THREAD_INDEX=");
 const end=ui.indexOf("let greeted=messages.length>0",start);
 assert.ok(start>0&&end>start);
 const result=vm.runInNewContext(ui.slice(start,end)+
  '\n({activeThread,threadIndex,messages,SHARED_MAIN_THREAD,TAB_THREAD,UPDATE_RELOAD_THREAD})',ctx);
 return {...result,local,session};
}
test('new website/app visit always starts a unique blank chat, even with an explicit old tab',()=>{
 const local=new Map(),session=new Map();
 const legacyMessages=[{id:'previous_00001',role:'user',text:'old saved work',at:12222}];
 local.set(THREAD_KEY,JSON.stringify([{id:SHARED,title:'Bubbles shared chat',updated:1234}]));
 local.set(THREAD_KEY+':'+SHARED,JSON.stringify(legacyMessages));
 session.set(THREAD_KEY+':tab',SHARED);
 session.set(THREAD_KEY+':tab:explicit','1');
 const one=startup({local,session});
 assert.match(one.activeThread,/^chat_[a-f0-9]{32}$/);
 assert.notEqual(one.activeThread,SHARED);
 assert.equal(one.messages.length,0);
 assert.ok(one.threadIndex.some(x=>x.id===SHARED));
 assert.equal(JSON.parse(local.get(THREAD_KEY+':'+SHARED))[0].text,'old saved work');
 const two=startup({local,session});
 assert.notEqual(two.activeThread,one.activeThread);
 assert.equal(two.messages.length,0);
 assert.ok(two.threadIndex.some(x=>x.id===one.activeThread));
});
test('trusted site-update marker permits one exact-session reload, not the next app opening',()=>{
 const local=new Map(),session=new Map();
 const first=startup({local,session});
 session.set(first.UPDATE_RELOAD_THREAD,'1');
 const refreshed=startup({local,session});
 assert.equal(refreshed.activeThread,first.activeThread);
 assert.equal(session.has(first.UPDATE_RELOAD_THREAD),false);
 assert.notEqual(startup({local,session}).activeThread,first.activeThread);
});
test('old shared session without index entry is kept in History, never opened by default',()=>{
 const local=new Map(),session=new Map();
 local.set(THREAD_KEY+':'+SHARED,JSON.stringify([{id:'oldturn_0001',role:'user',text:'saved older conversation',at:10}]));
 const result=startup({local,session});
 assert.equal(result.messages.length,0);
 assert.ok(result.threadIndex.some(x=>x.id===SHARED));
 assert.notEqual(result.activeThread,SHARED);
});
test('automatic reopened chat preserves old turns but does not create empty cloud folders',async()=>{
 const a=ui.indexOf('async function startConversation(');
 const b=ui.indexOf("newConversation.addEventListener('click'",a);
 assert.ok(a>0&&b>a);
 const saved=[],cloud=[],storage=new Map(),ctx={
  busy:false,nativeBridgeBusy:false,nativeSpeechPending:false,voicePending:[],
  chatsMessage:{textContent:''},keepChat:true,
  pendingImage:null,pendingImages:[],photoInput:{value:'',files:[]},photoPreview:{hidden:true},
  messages:[{id:'message_0001',role:'user',text:'earlier turn'}],
  threadIndex:[{id:'chat_previous',title:'Previous chat',updated:100}],
  activeThread:'chat_previous',
  saveThread:()=>{saved.push('chat_previous');return true},
  readThread:()=>[],freshThreadId:()=> 'chat_fresh_00001',
  sessionStorage:{setItem:(key,val)=>storage.set(key,val)},
  TAB_THREAD:'tab',EXPLICIT_THREAD:'tab:explicit',
  THREAD_INDEX:'threads',save:()=>true,
  memoryContext:[1],memoryInstructions:['old'],greeted:true,activeCardEvidence:{id:1},
  cardWorkspaceInstance:null,
  conversation:{replaceChildren:()=>{ctx.cleared=true}},
  input:{value:'',focus:()=>{}},ownerReady:true,
  conversationApi:async(...args)=>cloud.push(args),renderConversationFolders:()=>{},
  chatsPanel:{open:true},status:{textContent:''},nativeOverlay:true,
  cleared:false
 };
 const start=vm.runInNewContext(ui.slice(a,b)+'; startConversation',ctx);
 const result=await start({automatic:true});
 assert.equal(result,true);
 assert.deepEqual(saved,['chat_previous']);
 assert.equal(ctx.activeThread,'chat_fresh_00001');
 assert.equal(ctx.pendingImage,null);
 assert.equal(ctx.pendingImages.length,0);
 assert.equal(ctx.photoPreview.hidden,true);
 assert.equal(ctx.input.value,'');
 assert.equal(ctx.messages.length,0);
 assert.equal(ctx.memoryContext.length,0);
 assert.equal(ctx.memoryInstructions.length,0);
 assert.equal(ctx.cleared,true);
 assert.equal(cloud.length,0,'no empty cloud folders on every reopen');
 assert.match(ctx.status.textContent,/Earlier conversations are available/);
});
test('reopening or starting a chat preserves an unsent owner draft',async()=>{
 const a=ui.indexOf('async function startConversation(');
 const b=ui.indexOf("newConversation.addEventListener('click'",a);
 const ctx={busy:false,nativeBridgeBusy:false,nativeSpeechPending:false,voicePending:[],
  chatsMessage:{textContent:''},input:{value:'Unsent owner instructions'},
  pendingImage:null,pendingImages:[],photoInput:{files:[]},
  keepChat:true,saveThread:()=>{throw Error('must not save or switch a draft')},
  activeThread:'original_thread'};
 const start=vm.runInNewContext(ui.slice(a,b)+';startConversation',ctx);
 assert.equal(await start({automatic:true}),false);
 assert.equal(ctx.activeThread,'original_thread');
 assert.equal(ctx.input.value,'Unsent owner instructions');
 assert.match(ctx.chatsMessage.textContent,/unsent/);
});
test('switching history refuses an image still preparing before its preview appears',async()=>{
 const a=ui.indexOf('async function openConversation(');
 const b=ui.indexOf('async function startConversation(',a);
 const ctx={busy:false,chatsMessage:{textContent:''},input:{value:''},
  pendingImage:null,pendingImages:[],photoInput:{files:[{name:'photo.png'}]},
  threadIndex:[{id:'target_thread'}],activeThread:'original_thread',
  saveThread:()=>{throw Error('must not switch a pending image')}};
 const open=vm.runInNewContext(ui.slice(a,b)+';openConversation',ctx);
 await open('target_thread');
 assert.equal(ctx.activeThread,'original_thread');
 assert.match(ctx.chatsMessage.textContent,/unsent/);
});
test('active requests do not reset the chat when a panel is reopened',async()=>{
 const a=ui.indexOf('async function startConversation(');
 const b=ui.indexOf("newConversation.addEventListener('click'",a);
 const state={busy:true,nativeBridgeBusy:false,nativeSpeechPending:false,voicePending:[],
  chatsMessage:{textContent:''},messages:['existing'],keepChat:true,
  saveThread:()=>{throw Error('must not save while busy')}};
 const f=vm.runInNewContext(ui.slice(a,b)+';startConversation',state);
 assert.equal(await f({automatic:true}),false);
 assert.deepEqual(state.messages,['existing']);
 assert.match(state.chatsMessage.textContent,/must finish/);
});
test('standalone website and Android reopen fresh chats while embedded cards retain their thread',()=>{
 assert.match(ui,/if\(reopening&&!nativeOverlay&&!embedded\)void startConversation\(\{automatic:true\}\)/);
 assert.match(ui,/startFreshOnReopen:\(\)=>\{/);
 assert.match(ui,/if\(busy\|\|nativeBridgeBusy\|\|nativeSpeechPending\|\|voicePending\.length\)return false/);
 assert.match(ui,/sessionStorage\.setItem\(UPDATE_RELOAD_THREAD,'1'\)/);
 assert.match(ui,/restoreNativeHistory:\(backup\)=>\{/);
 assert.match(native,/final boolean reopened = root\.getVisibility\(\) != View\.VISIBLE/);
 assert.match(native,/if \(reopened && websiteReady && trustedChat\(website\)/);
 assert.match(native,/startFreshOnReopen\(\)/);
 assert.match(native,/void hide\(\) \{/);
 assert.match(native,/historyJournal\.read\(\)/);
});


test('PWA update preparation checkpoints the active chat and rejects active work or unsafe storage',()=>{
 const a=ui.indexOf('prepareSiteUpdateReload:()=>{');
 const b=ui.indexOf('\n },',a);
 assert.ok(a>0&&b>a,'first-party updater must expose a bounded checkpoint method');
 const stored=[],ctx={busy:false,nativeBridgeBusy:false,nativeSpeechPending:false,
  voicePending:[],input:{value:''},pendingImage:null,pendingImages:[],photoInput:{files:[]},
  keepChat:true,messages:[{role:'user',text:'Earlier owner work'}],
  saveThread:()=>true,UPDATE_RELOAD_THREAD:'site-update-reload',
  sessionStorage:{setItem:(key,value)=>stored.push([key,value])}};
 const prepare=vm.runInNewContext('({'+ui.slice(a,b+4)+'}).prepareSiteUpdateReload',ctx);
 ctx.busy=true;assert.equal(prepare(),false);ctx.busy=false;
 ctx.nativeSpeechPending=true;assert.equal(prepare(),false);ctx.nativeSpeechPending=false;
 ctx.input.value='Owner unsent draft';assert.equal(prepare(),false);ctx.input.value='';
 ctx.photoInput.files=[{name:'preparing.png'}];assert.equal(prepare(),false);ctx.photoInput.files=[];
 ctx.keepChat=false;assert.equal(prepare(),false);ctx.keepChat=true;
 ctx.saveThread=()=>false;assert.equal(prepare(),false);
 assert.equal(stored.length,0,'unsafe paths must not arm the resume marker');
 let saves=0;ctx.saveThread=()=>{saves++;return true};
 assert.equal(prepare(),true);
 assert.equal(saves,1);
 assert.equal(JSON.stringify(stored),JSON.stringify([['site-update-reload','1']]));
 ctx.sessionStorage.setItem=()=>{throw Error('storage disabled')};
 assert.equal(prepare(),false,'no resume marker means no reload');
});
