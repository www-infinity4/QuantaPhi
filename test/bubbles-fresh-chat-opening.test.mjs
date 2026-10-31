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
 const a=ui.indexOf('function startConversation(');
 const b=ui.indexOf("newConversation.addEventListener('click'",a);
 assert.ok(a>0&&b>a);
 const saved=[],cloud=[],storage=new Map(),ctx={
  busy:false,nativeBridgeBusy:false,nativeSpeechPending:false,voicePending:[],nativeRecordingActive:false,voiceStarting:false,voiceEnabled:false,speaking:false,
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
 const a=ui.indexOf('function startConversation(');
 const b=ui.indexOf("newConversation.addEventListener('click'",a);
 const state={busy:true,nativeBridgeBusy:false,nativeSpeechPending:false,voicePending:[],nativeRecordingActive:false,voiceStarting:false,voiceEnabled:false,speaking:false,
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
 const a=ui.indexOf('function startConversation(');
 const b=ui.indexOf("newConversation.addEventListener('click'",a);
 assert.ok(a>0&&b>a);
 let saves=0,clears=0,confirms=0;
 const ctx={
  busy:false,nativeBridgeBusy:false,nativeSpeechPending:false,voicePending:[],nativeRecordingActive:false,voiceStarting:false,voiceEnabled:false,speaking:false,
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
 const a=ui.indexOf('function startConversation(');
 const b=ui.indexOf("newConversation.addEventListener('click'",a);
 assert.ok(a>0&&b>a);
 const events=[];
 const ctx={
  busy:false,nativeBridgeBusy:false,nativeSpeechPending:false,voicePending:[],nativeRecordingActive:false,voiceStarting:false,voiceEnabled:false,speaking:false,
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

test('History switching never discards unsent photos, typed work or an unsaved current conversation',async()=>{
 const begin=ui.indexOf('async function openConversation(id){');
 const end=ui.indexOf('function startConversation(',begin);
 assert.ok(begin>0&&end>begin,'actual History switch handler exists');
 async function run({draft='',photo=false,approve=false,saveOk=true,lateDraft=null,latePhoto=false,historyOff=false,nativeBusy=false,cloudEmpty=false,cloudMessages=false,cloudSessionId='chat_target',ownerSwitchDuringCloud=false}={}){
  let confirmations=0,saves=0,clears=0;
  const original={id:'old_message',role:'user',text:'Important current chat',at:100};
  const ctx={
   busy:false,nativeBridgeBusy:nativeBusy,nativeSpeechPending:false,voicePending:[],nativeRecordingActive:false,voiceStarting:false,voiceEnabled:false,speaking:false,
   chatsMessage:{textContent:''},
   threadIndex:[{id:'chat_old',title:'Current chat',updated:100},{id:'chat_target',title:'Earlier chat',updated:10}],
   keepChat:!historyOff,messages:[original],activeThread:'chat_old',
   input:{value:draft,focus:()=>{}},pendingImage:photo?{id:'photo'}:null,
   pendingImages:photo?[{id:'photo'}]:[],photoInput:{value:'selected'},photoPreview:{hidden:false},
   saveThread:()=>{saves++;return saveOk},
   readThread:()=>[{id:'saved_123',role:'assistant',text:'Saved earlier turn',at:10}],
   ownerReady:lateDraft!==null||latePhoto||cloudEmpty||cloudMessages||ownerSwitchDuringCloud,
   ownerHeaders:{Authorization:'Bearer old-verified-owner'},
   conversationApi:async()=>{
    if(ownerSwitchDuringCloud)ctx.ownerHeaders={Authorization:'Bearer different-verified-owner'};
    if(lateDraft!==null)ctx.input.value=lateDraft;
    if(latePhoto)ctx.pendingImages.push({id:'new-photo'});
    return {session:{id:cloudSessionId},messages:cloudMessages?[{id:'cloud_123',role:'assistant',text:'Verified cloud turn',at:20}]:[]};
   },
   confirm:()=>{confirmations++;return approve},
   sessionStorage:{setItem:()=>{}},TAB_THREAD:'tab',EXPLICIT_THREAD:'explicit',
   SHARED_MAIN_THREAD:'bubbles_shared_main_v1',
   memoryContext:[],activeCardEvidence:null,cardWorkspaceInstance:null,
   conversation:{replaceChildren:()=>{clears++}},display:()=>{},
   renderConversationFolders:()=>{},chatsPanel:{open:true},
   crypto:{randomUUID:()=> 'uuid'},greeted:true
  };
  const source=vm.runInNewContext(ui.slice(begin,end)+
   ';({openConversation,getState:()=>({activeThread,pendingImage,pendingImages,messages,input})})',ctx);
  const result=await source.openConversation('chat_target');
  return {result,confirmations,saves,clears,state:source.getState(),notice:ctx.chatsMessage.textContent};
 }
 const denied=await run({draft:'Unsent writing',photo:true});
 assert.equal(denied.result,false);
 assert.equal(denied.confirmations,1);
 assert.equal(denied.saves,0);
 assert.equal(denied.clears,0);
 assert.equal(denied.state.activeThread,'chat_old');
 assert.equal(denied.state.pendingImages.length,1);
 assert.equal(denied.state.input.value,'Unsent writing');
 const failed=await run({draft:'Unsent writing',photo:true,approve:true,saveOk:false});
 assert.equal(failed.result,false);
 assert.equal(failed.saves,1);
 assert.equal(failed.clears,0);
 assert.equal(failed.state.activeThread,'chat_old');
 assert.equal(failed.state.pendingImages.length,1);
 assert.match(failed.notice,/could not be saved/);
 const accepted=await run({draft:'Old chat draft',photo:true,approve:true});
 assert.equal(accepted.result,true);
 assert.equal(accepted.confirmations,1);
 assert.equal(accepted.clears,1);
 assert.equal(accepted.state.activeThread,'chat_target');
 assert.equal(accepted.state.pendingImages.length,0);
 assert.equal(accepted.state.input.value,'','approved switch must not leak an old draft into another conversation');
 const cloudEmptyResult=await run({cloudEmpty:true});
 assert.equal(cloudEmptyResult.result,true,'empty cloud History must not prevent opening a saved local conversation');
 assert.equal(cloudEmptyResult.state.messages[0]?.text,'Saved earlier turn','an empty cloud response must not replace nonempty saved device History');
 const cloudWithTurns=await run({cloudMessages:true});
 assert.equal(cloudWithTurns.result,true);
 assert.equal(cloudWithTurns.state.messages[0]?.text,'Verified cloud turn','nonempty cloud History remains authoritative');
 const switchedWallet=await run({ownerSwitchDuringCloud:true,cloudMessages:true});
 assert.equal(switchedWallet.result,false,'a different owner session arriving during History fetch must abort the switch');
 assert.equal(switchedWallet.clears,0,'stale cloud History must not replace the active chat');
 assert.equal(switchedWallet.state.activeThread,'chat_old');
 assert.equal(switchedWallet.state.messages[0].text,'Important current chat');
 assert.match(switchedWallet.notice,/owner connection changed/i);
 const wrongCloudSession=await run({cloudMessages:true,cloudSessionId:'another_wallet_thread'});
 assert.equal(wrongCloudSession.result,true,'the verified device copy remains open when cloud returns a different session');
 assert.equal(wrongCloudSession.state.messages[0]?.text,'Saved earlier turn','a mismatched cloud session must never replace device History');
 assert.match(wrongCloudSession.notice,/saved device copy/i);
 const late=await run({lateDraft:'Typed while cloud History was loading'});
 assert.equal(late.result,false);
 assert.equal(late.clears,0);
 assert.equal(late.state.activeThread,'chat_old');
 assert.equal(late.state.input.value,'Typed while cloud History was loading');
 const latePhoto=await run({latePhoto:true});
 assert.equal(latePhoto.result,false);
 assert.equal(latePhoto.clears,0);
 assert.equal(latePhoto.state.pendingImages.length,1);
 const historyOff=await run({historyOff:true});
 assert.equal(historyOff.result,false,'History-off turns require explicit consent before switching');
 assert.equal(historyOff.confirmations,1);
 const busy=await run({nativeBusy:true});
 assert.equal(busy.result,false);
 assert.equal(busy.confirmations,0);
 assert.equal(busy.clears,0);
});

test('History-off turns survive automatic website and Android reopen without unsent composer text',async()=>{
 const a=ui.indexOf('function startConversation(');
 const b=ui.indexOf("newConversation.addEventListener('click'",a);
 assert.ok(a>0&&b>a,'real fresh-chat handler exists');
 let clears=0;
 const state={
  busy:false,nativeBridgeBusy:false,nativeSpeechPending:false,voicePending:[],nativeRecordingActive:false,voiceStarting:false,voiceEnabled:false,speaking:false,
  chatsMessage:{textContent:''},keepChat:false,
  messages:[{id:'prior_turn',role:'user',text:'History disabled but still active'}],
  activeThread:'chat_live',threadIndex:[{id:'chat_live',title:'Current chat',updated:1}],
  input:{value:''},noteText:{value:''},workText:{value:''},
  pendingImage:null,pendingImages:[],
  saveThread:()=>{throw Error('must not attempt History storage')},
  freshThreadId:()=>{throw Error('must not create a new chat')},
  conversation:{replaceChildren:()=>{clears++}}
 };
 const start=vm.runInNewContext(ui.slice(a,b)+';startConversation',state);
 assert.equal(await start({automatic:true}),false,'automatic reopen must preserve unsaved History-off turns');
 assert.equal(state.activeThread,'chat_live');
 assert.equal(state.messages[0].text,'History disabled but still active');
 assert.equal(clears,0);
 const n=ui.indexOf('startFreshOnReopen:()=>{');
 const e=ui.indexOf(' // The native Android foreground service',n);
 assert.ok(n>0&&e>n,'real Android reopen bridge exists');
 let starts=0;
 const native=vm.runInNewContext('({'+ui.slice(n,e)+'}).startFreshOnReopen',{
  nativeOverlay:true,busy:false,nativeBridgeBusy:false,nativeSpeechPending:false,voicePending:[],nativeRecordingActive:false,voiceStarting:false,voiceEnabled:false,speaking:false,
  keepChat:false,messages:state.messages,input:{value:''},noteText:{value:''},workText:{value:''},
  pendingImage:null,pendingImages:[],startConversation:()=>{starts++}
 });
 assert.equal(native(),false,'Android must report no fresh chat when History-off turns exist');
 assert.equal(starts,0);
});


test('explicit New chat requires confirmation before discarding History-off conversation turns',async()=>{
 const a=ui.indexOf('function startConversation(');
 const b=ui.indexOf("newConversation.addEventListener('click'",a);
 assert.ok(a>0&&b>a,'actual New chat handler exists');
 async function attempt(approve){
  let confirms=0,clears=0,warning='';
  const ctx={
   busy:false,nativeBridgeBusy:false,nativeSpeechPending:false,voicePending:[],nativeRecordingActive:false,voiceStarting:false,voiceEnabled:false,speaking:false,
   chatsMessage:{textContent:''},keepChat:false,
   messages:[{id:'turn_1',role:'user',text:'Important conversation with History disabled'}],
   activeThread:'chat_live',threadIndex:[{id:'chat_live',title:'Current chat',updated:1}],
   input:{value:'',focus:()=>{}},noteText:{value:''},workText:{value:''},
   pendingImage:null,pendingImages:[],photoInput:{value:''},photoPreview:{hidden:false},
   confirm:text=>{confirms++;warning=text;return approve},
   readThread:()=>[],freshThreadId:()=> 'chat_next',
   save:()=>true,THREAD_INDEX:'threads',
   sessionStorage:{setItem:()=>{}},TAB_THREAD:'tab',EXPLICIT_THREAD:'explicit',
   memoryContext:[],memoryInstructions:[],greeted:true,activeCardEvidence:null,
   cardWorkspaceInstance:null,conversation:{replaceChildren:()=>{clears++}},
   renderConversationFolders:()=>{},chatsPanel:{open:true},status:{textContent:''},
   nativeOverlay:true,ownerReady:false
  };
  const start=vm.runInNewContext(ui.slice(a,b)+';startConversation',ctx);
  const result=await start({automatic:false});
  return {result,confirms,clears,warning,thread:ctx.activeThread,messages:ctx.messages};
 }
 const cancelled=await attempt(false);
 assert.equal(cancelled.result,false,'Cancel must preserve History-off turns');
 assert.equal(cancelled.confirms,1,'explicit New chat must ask before discarding an unsaved conversation');
 assert.match(cancelled.warning,/History is off/i);
 assert.equal(cancelled.thread,'chat_live');
 assert.equal(cancelled.messages[0].text,'Important conversation with History disabled');
 assert.equal(cancelled.clears,0);
 const approved=await attempt(true);
 assert.equal(approved.result,true,'owner-approved new chat remains available');
 assert.equal(approved.confirms,1);
 assert.equal(approved.thread,'chat_next');
 assert.equal(approved.clears,1);
});

test('Android RecordB, live mic and speech block History switch, New chat and native reopen',async()=>{
 const openStart=ui.indexOf('async function openConversation(id){');
 const freshStart=ui.indexOf('function startConversation(',openStart);
 const freshEnd=ui.indexOf("newConversation.addEventListener('click'",freshStart);
 const nativeStart=ui.indexOf('startFreshOnReopen:()=>{');
 const nativeEnd=ui.indexOf('nativeHistorySnapshot:',nativeStart);
 assert.ok(openStart>0&&freshStart>openStart&&freshEnd>freshStart&&nativeStart>0&&nativeEnd>nativeStart);
 for(const media of ['nativeRecordingActive','voiceStarting','voiceEnabled','speaking']){
  let opened=0,cleared=0,started=0;
  const state={
   busy:false,nativeBridgeBusy:false,nativeSpeechPending:false,voicePending:[],
   nativeRecordingActive:false,voiceStarting:false,voiceEnabled:false,speaking:false,
   chatsMessage:{textContent:''},keepChat:true,ownerReady:false,
   threadIndex:[{id:'old',title:'Earlier chat',updated:1},{id:'target',title:'Saved chat',updated:2}],
   activeThread:'old',messages:[],input:{value:'',focus:()=>{}},
   noteText:{value:''},workText:{value:''},pendingImage:null,pendingImages:[],
   readThread:()=>[],saveThread:()=>true,save:()=>true,THREAD_INDEX:'threads',
   photoInput:{value:''},photoPreview:{hidden:true},sessionStorage:{setItem:()=>{}},
   TAB_THREAD:'tab',EXPLICIT_THREAD:'explicit',SHARED_MAIN_THREAD:'shared',
   crypto:{randomUUID:()=> 'test-id'},memoryContext:[],memoryInstructions:[],
   activeCardEvidence:null,cardWorkspaceInstance:null,
   conversation:{replaceChildren:()=>{cleared++}},display:()=>{opened++},
   chatsPanel:{open:true},renderConversationFolders:()=>{},greeted:false,
   freshThreadId:()=> 'next',status:{textContent:''},nativeOverlay:true
  };
  state[media]=true;
  const open=vm.runInNewContext(ui.slice(openStart,freshStart)+';openConversation',state);
  assert.equal(await open('target'),false,media+' must block History switch');
  assert.equal(state.activeThread,'old');
  assert.equal(cleared,0);
  const fresh=vm.runInNewContext(ui.slice(freshStart,freshEnd)+';startConversation',state);
  assert.equal(await fresh({automatic:false}),false,media+' must block New chat');
  assert.equal(state.activeThread,'old');
  assert.equal(cleared,0);
  const native=vm.runInNewContext('({'+ui.slice(nativeStart,nativeEnd)+'}).startFreshOnReopen',{
   nativeOverlay:true,busy:false,nativeBridgeBusy:false,nativeSpeechPending:false,voicePending:[],
   nativeRecordingActive:media==='nativeRecordingActive',
   voiceStarting:media==='voiceStarting',voiceEnabled:media==='voiceEnabled',speaking:media==='speaking',
   keepChat:true,messages:[],input:{value:''},noteText:{value:''},workText:{value:''},
   pendingImage:null,pendingImages:[],startConversation:()=>{started++}
  });
  assert.equal(native(),false,media+' must block native reopen');
  assert.equal(started,0);
 }
});
