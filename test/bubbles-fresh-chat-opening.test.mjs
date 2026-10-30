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
  pendingImage:{data:'old-image'},pendingImages:[{data:'old-image'}],photoInput:{value:'old'},photoPreview:{hidden:false},
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
  input:{value:'old unsent message',focus:()=>{}},noteText:{value:''},workText:{value:''},ownerReady:true,
  conversationApi:async(...args)=>cloud.push(args),renderConversationFolders:()=>{},
  chatsPanel:{open:true},status:{textContent:''},nativeOverlay:true,
  cleared:false
 };
 const start=vm.runInNewContext(ui.slice(a,b)+'; startConversation',ctx);
 const protectedResult=await start({automatic:true});
 assert.equal(protectedResult,false,'automatic reopen must not erase unsent text/photos');
 assert.deepEqual(saved,[]);
 assert.equal(ctx.activeThread,'chat_previous');
 assert.equal(ctx.input.value,'old unsent message');
 assert.equal(ctx.pendingImages.length,1);
 ctx.input.value='';ctx.pendingImage=null;ctx.pendingImages=[];
 const result=await start({automatic:true});
 assert.equal(result,true,'an empty reopened chat may start fresh');
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
 assert.match(ui,/if\(reopening&&!nativeOverlay&&!embedded&&!unsentDraft\)void startConversation\(\{automatic:true\}\)/);
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

test('history storage failure blocks both automatic and confirmed New chat without clearing the active thread',async()=>{
 const a=ui.indexOf('async function startConversation(');
 const b=ui.indexOf("newConversation.addEventListener('click'",a);
 assert.ok(a>0&&b>a);
 let saves=0,clears=0,confirms=0;
 const ctx={
  busy:false,nativeBridgeBusy:false,nativeSpeechPending:false,voicePending:[],
  chatsMessage:{textContent:''},keepChat:true,
  messages:[{id:'old_message',role:'user',text:'important saved conversation'}],
  activeThread:'chat_old',threadIndex:[{id:'chat_old',title:'Existing',updated:1}],
  pendingImage:null,pendingImages:[],input:{value:''},noteText:{value:''},workText:{value:''},
  saveThread:()=>{saves++;return false},
  confirm:()=>{confirms++;return true},
  conversation:{replaceChildren:()=>{clears++}},
  freshThreadId:()=>{throw Error('must not create a thread when saving fails')}
 };
 const start=vm.runInNewContext(ui.slice(a,b)+';startConversation',ctx);
 assert.equal(await start({automatic:true}),false);
 assert.equal(saves,1);
 assert.equal(confirms,0);
 assert.equal(ctx.activeThread,'chat_old');
 assert.equal(ctx.messages.length,1);
 assert.equal(clears,0);
 ctx.input.value='unfinished text';ctx.pendingImage={data:'photo'};ctx.pendingImages=[{data:'photo'}];
 assert.equal(await start({automatic:false}),false);
 assert.equal(saves,2);
 assert.equal(confirms,1);
 assert.equal(ctx.input.value,'unfinished text');
 assert.equal(ctx.pendingImages.length,1);
 assert.equal(ctx.activeThread,'chat_old');
 assert.equal(ctx.messages[0].text,'important saved conversation');
 assert.equal(clears,0);
 assert.match(ctx.chatsMessage.textContent,/could not be saved/);
});

test('conversation index storage failure blocks History saves even when the thread payload was written',()=>{
 const a=ui.indexOf('function saveThread(){');
 const b=ui.indexOf('function persistChat(){',a);
 assert.ok(a>0&&b>a,'actual History writer exists');
 const writes=[];
 const ctx={
  keepChat:true,embedded:false,THREAD_PREFIX:'threads:',THREAD_INDEX:'threads',
  activeThread:'old',messages:[{role:'user',text:'Important earlier turn'}],
  threadIndex:[{id:'old',title:'New conversation',updated:1}],
  save:(key)=>{writes.push(key);return key!=='threads'}
 };
 const result=vm.runInNewContext(ui.slice(a,b)+';saveThread()',ctx);
 assert.equal(result,false,'a saved message blob is not enough without its History index');
 assert.deepEqual(writes,['threads:old','threads']);
});

test('new chat preserves the active session when the new History index cannot be written',async()=>{
 const a=ui.indexOf('async function startConversation(');
 const b=ui.indexOf("newConversation.addEventListener('click'",a);
 assert.ok(a>0&&b>a);
 const events=[];
 const ctx={
  busy:false,nativeBridgeBusy:false,nativeSpeechPending:false,voicePending:[],
  chatsMessage:{textContent:''},keepChat:true,
  messages:[],activeThread:'old',
  threadIndex:[{id:'old',title:'Earlier conversation',updated:1}],
  pendingImage:null,pendingImages:[],input:{value:''},noteText:{value:''},workText:{value:''},
  readThread:()=>[],freshThreadId:()=> 'chat_new',
  save:(key)=>{events.push('save:'+key);return false},THREAD_INDEX:'threads',
  sessionStorage:{setItem:()=>events.push('session')},
  conversation:{replaceChildren:()=>events.push('cleared')}
 };
 const start=vm.runInNewContext(ui.slice(a,b)+';startConversation',ctx);
 assert.equal(await start({automatic:true}),false);
 assert.deepEqual(events,['save:threads'],'failed index must not change session or clear chat');
 assert.equal(ctx.activeThread,'old');
 assert.deepEqual(ctx.threadIndex.map(x=>x.id),['old']);
 assert.match(ctx.chatsMessage.textContent,/History could not be saved/);
});

test('native recovery reports index persistence failures without mutating History',()=>{
 const begin=ui.indexOf('restoreNativeHistory:(backup)=>{');
 const end=ui.indexOf('checkForSiteUpdate,',begin);
 assert.ok(begin>0&&end>begin,'actual native recovery handler exists');
 const id='chat_1234567890';
 const backup=JSON.stringify({thread:id,messages:[
  {id:'message_12345678',role:'user',text:'Recovered Android turn',at:1000}
 ]});
 const run=({existing=false,indexFails=false}={})=>{
  const writes=[],initial=existing?[{id,title:'Earlier chat',updated:10}]:[];
  const ctx={
   nativeOverlay:true,keepChat:true,THREAD_PREFIX:'thread:',THREAD_INDEX:'threads',
   SHARED_MAIN_THREAD:'bubbles_shared_main_v1',
   activeThread:'different_chat',messages:[],threadIndex:initial,
   readThread:()=>[],
   save:key=>{writes.push(key);return !(indexFails&&key==='threads')},
   renderConversationFolders:()=>writes.push('render')
  };
  const restore=vm.runInNewContext('({'+ui.slice(begin,end)+'}).restoreNativeHistory',ctx);
  const result=restore(backup);
  return {result,writes,index:ctx.threadIndex,initial};
 };
 for(const existing of [false,true]){
  const failed=run({existing,indexFails:true});
  assert.equal(failed.result,false,'failed index write cannot acknowledge Android recovery');
  assert.deepEqual(failed.writes,['thread:'+id,'threads']);
  assert.deepEqual(failed.index,failed.initial,'failed write must not mutate History in memory');
 }
 const successful=run({indexFails:false});
 assert.equal(successful.result,true);
 assert.deepEqual(successful.writes,['thread:'+id,'threads','render']);
 assert.equal(successful.index.find(x=>x.id===id)?.updated,1000);
});
