import test from 'node:test';
import assert from 'node:assert/strict';
import {ContinuationSupervisor} from '../workers/bubbles-cloud-browser/continuation.mjs';

const KEY='owner-chatgpt-continuation-v1';
const sessionId='11111111-1111-4111-8111-111111111111';
const url=n=>'https://chatgpt.com/c/12345678-1234-4123-8123-'+String(n).padStart(12,'0');
const privateText='Private deployment details are pending verification.';
function fixture({signedIn=true,count=12,receipt=true}={}){
 let clock=1000000,alarm=null;const records=new Map(),calls=[],sends=[];
 const grant={enabled:true,expiresAt:clock+86400000};
 const storage={
  get:async key=>structuredClone(records.get(key)),put:async(key,value)=>records.set(key,structuredClone(value)),
  setAlarm:async time=>{alarm=time;},deleteAlarm:async()=>{alarm=null;},
  transaction:async fn=>{const before=structuredClone(records),oldAlarm=alarm;
   try{return await fn(storage);}catch(e){records.clear();for(const [k,v] of before)records.set(k,v);alarm=oldAlarm;throw e;}}
 };
 const targets=[{id:'history',type:'page',url:'https://chatgpt.com/'}];
 const snapshots=new Map();
 for(let n=0;n<count;n++)snapshots.set(url(n),{ok:true,authenticatedConversation:true,conversationUrl:url(n),
  messageCount:8,latestRole:'assistant',latestAssistantText:privateText,latestUserText:'Repair the approved project',
  generating:false,draftPresent:false,editorReady:true,recentNudgeCount:0});
 const env={CHATGPT_LOGIN_EMAIL:'owner@example.com',BROWSER:{devtools:{
  listTargets:async()=>structuredClone(targets),
  newTarget:async(_,url)=>{const tab={id:'tab'+targets.length,type:'page',url};targets.push(tab);return tab;}
 }}};
 let onAction;
 const action=async(_env,args)=>{
  calls.push({action:args.action,targetId:args.targetId});
  if(onAction)return onAction(args);
  if(args.action==='chatgpt_signin')return signedIn?{ok:true,state:'history_ready',accountVerified:true}:{ok:true,state:'needs_owner'};
  if(args.action==='chatgpt_scan'&&args.targetId==='history')return {ok:true,conversations:[...snapshots.keys()].map(url=>({url,title:'Private title'}))};
  const item=targets.find(t=>t.id===args.targetId);
  if(args.action==='chatgpt_scan')return structuredClone(snapshots.get(item.url));
  if(args.action==='chatgpt_resume'){
   assert.equal(args.text,'*');assert.equal((await storage.get(KEY)).phase,'sending');
   assert.equal(await args.canSend(),true);sends.push(args.conversationUrl);
   return {ok:true,submissionVerified:receipt};
  }
  throw Error('unexpected action');
 };
 const make=()=>new ContinuationSupervisor(storage,env,async()=>({...grant}),{action,now:()=>clock});
 return {storage,records,env,grant,calls,sends,snapshots,targets,make,
  get alarm(){return alarm;},get now(){return clock;},advance(ms=15000){clock+=ms;},
  set onAction(fn){onAction=fn;},start:()=>make().start({sessionId,targetId:'history'})};
}

test('only existing active grants admit the owner-bound browser job',async()=>{
 const f=fixture();f.grant.enabled=false;
 await assert.rejects(f.start(),/existing_five_day_approval_required/);assert.equal(f.records.size,0);
 f.grant.enabled=true;
 await assert.rejects(f.make().start({sessionId,targetId:'foreign'}),/browser_tab_not_found/);
 const started=await f.start();assert.equal(started.running,true);assert.equal(started.background,true);
 assert.equal(f.alarm,f.now+15000);
});

test('start retries preserve the job, pinned chats and original expiry without renewing permission',async()=>{
 const f=fixture();await f.start();await f.make().tick();
 const original=await f.storage.get(KEY);f.grant.expiresAt+=86400000;
 await f.start();const retried=await f.storage.get(KEY);
 assert.equal(retried.id,original.id);assert.equal(retried.expiresAt,original.expiresAt);
 assert.deepEqual(retried.chats,original.chats);
});

test('worker recreation and a closed client page keep one browser and the newest eight chats',async()=>{
 const f=fixture();await f.start();await f.make().tick();
 assert.equal(f.targets.length,9);
 for(let n=0;n<8;n++){f.advance();await f.make().tick();}
 assert.deepEqual(f.sends,Array.from({length:8},(_,n)=>url(n)));
 assert.equal(f.targets.length,9);assert.equal((await f.make().status()).submitted,8);
 assert.ok(f.alarm>f.now);
});

test('an alarm replay after a crash in the sending phase never sends again',async()=>{
 const f=fixture();await f.start();await f.make().tick();
 const state=await f.storage.get(KEY);state.phase='sending';await f.storage.put(KEY,state);
 await f.make().tick();await f.make().tick();
 assert.equal(f.sends.length,0);assert.equal((await f.make().status()).error,'uncertain_send');assert.equal(f.alarm,null);
});

test('an uncertain send receipt stops instead of retrying the same prompt',async()=>{
 const f=fixture({receipt:false});await f.start();await f.make().tick();
 await f.make().tick();await f.make().tick();
 assert.equal(f.sends.length,1);assert.equal((await f.make().status()).error,'uncertain_send');
});

test('revocation or original expiry stops alarms before any browser call',async()=>{
 for(const expired of [true,false]){
  const f=fixture();await f.start();const before=f.calls.length;
  if(expired)f.advance(86400001);else f.grant.enabled=false;
  await f.make().tick();assert.equal(f.calls.length,before);assert.equal(f.alarm,null);
  assert.equal((await f.make().status()).running,false);
 }
});

test('stop during an in-flight observation cannot resurrect or submit the job',async()=>{
 const f=fixture({count:1});await f.start();await f.make().tick();
 f.onAction=async args=>{assert.equal(args.action,'chatgpt_scan');await f.make().stop();return structuredClone(f.snapshots.get(url(0)));};
 await f.make().tick();assert.equal(f.sends.length,0);assert.equal(f.alarm,null);
 assert.equal((await f.make().status()).phase,'stopped');
});

test('an old alarm cannot mutate a newly started job after an owner stop/restart',async()=>{
 const f=fixture({count:1});await f.start();await f.make().tick();
 const old=(await f.storage.get(KEY)).id;
 f.onAction=async()=>{await f.make().stop();await f.start();return structuredClone(f.snapshots.get(url(0)));};
 await f.make().tick();
 const current=await f.storage.get(KEY);assert.notEqual(current.id,old);assert.equal(current.running,true);
 assert.equal(current.phase,'awaiting_signin');assert.equal(f.sends.length,0);
});

test('an early restart between the tick read and grant check cannot expire the replacement job',async()=>{
 const f=fixture({count:1});await f.start();
 const originalGet=f.storage.get;let reads=0;
 f.storage.get=async key=>{
  if(++reads===2){const next=await originalGet(KEY);next.id='replacement-job';await f.storage.put(KEY,next);}
  return originalGet(key);
 };
 await f.make().tick();
 const state=await originalGet(KEY);assert.equal(state.id,'replacement-job');assert.equal(state.running,true);
 assert.equal(state.phase,'awaiting_signin');assert.ok(f.alarm>f.now);
});

test('Stop during an awaited grant check prevents the final send guard from succeeding',async()=>{
 const f=fixture();await f.start();const id=(await f.storage.get(KEY)).id;
 const guarded=new ContinuationSupervisor(f.storage,f.env,async()=>{
  await f.make().stop();return {...f.grant};
 },{now:()=>f.now});
 assert.equal(await guarded.allowed(id),false);
});

test('credential entry may wait while alarms keep the same Chrome session available',async()=>{
 const f=fixture({signedIn:false});await f.start();
 await f.make().tick();f.advance(60000);await f.make().tick();
 assert.equal((await f.make().status()).phase,'awaiting_signin');
 assert.equal(f.sends.length,0);assert.equal(f.targets.length,1);assert.ok(f.alarm>f.now);
});

test('background sign-in follows an official Google popup and then the returned ChatGPT tab',async()=>{
 const f=fixture({count:1});await f.start();let phase=0;
 f.onAction=async args=>{
  if(args.action==='chatgpt_signin'&&phase===0){
   assert.equal(args.targetId,'history');phase=1;
   f.targets.push({id:'google',type:'page',url:'https://accounts.google.com/v3/signin/identifier?app_domain=https%3A%2F%2Fauth.openai.com'});
   return {ok:true,state:'progress'};
  }
  if(args.action==='chatgpt_signin'&&phase===1){
   assert.equal(args.targetId,'google');phase=2;return {ok:true,state:'needs_owner'};
  }
  if(args.action==='chatgpt_signin'&&phase===2){
   assert.equal(args.targetId,'google');phase=3;return {ok:true,state:'needs_owner'};
  }
  if(args.action==='chatgpt_signin'&&phase===3){
   assert.equal(args.targetId,'returned');return {ok:true,state:'history_ready',accountVerified:true};
  }
  assert.equal(args.action,'chatgpt_scan');assert.equal(args.targetId,'returned');
  return {ok:true,conversations:[{url:url(0)}]};
 };
 await f.make().tick();await f.make().tick();
 f.targets.find(t=>t.id==='google').url='https://accounts.google.com/v3/signin/challenge/pwd';
 await f.make().tick();
 f.targets.splice(0,f.targets.length,{id:'returned',type:'page',url:'https://chatgpt.com/'});
 await f.make().tick();
 assert.equal((await f.storage.get(KEY)).historyTargetId,'returned');
 assert.equal((await f.make().status()).selected,1);
});

test('private message text and authentication artifacts do not enter durable checkpoints or status',async()=>{
 const f=fixture({count:1});await f.start();await f.make().tick();await f.make().tick();
 const persisted=JSON.stringify(await f.storage.get(KEY));
 assert.equal(persisted.includes(privateText),false);assert.equal(persisted.includes('Private title'),false);
 assert.doesNotMatch(persisted,/Authorization|Bearer|password|cookie|proof/);
 const report=JSON.stringify(await f.make().status());
 assert.doesNotMatch(report,/chatgpt\.com|sessionId|targetId|owner@example/);
});

test('drafts, active generation and unanswered requests do not send',async()=>{
 const f=fixture({count:3});await f.start();await f.make().tick();
 Object.assign(f.snapshots.get(url(0)),{draftPresent:true});
 Object.assign(f.snapshots.get(url(1)),{generating:true});
 Object.assign(f.snapshots.get(url(2)),{latestRole:'user'});
 for(let n=0;n<3;n++)await f.make().tick();assert.equal(f.sends.length,0);
});

test('new replies must stabilize, respect cooldown and contain changed unfinished work before another nudge',async()=>{
 const f=fixture({count:1});await f.start();await f.make().tick();await f.make().tick();
 Object.assign(f.snapshots.get(url(0)),{messageCount:10,latestUserText:'*',recentNudgeCount:1});
 f.advance(120000);await f.make().tick();await f.make().tick();
 assert.equal(f.sends.length,1,'unchanged answer must not cause a loop');
 Object.assign(f.snapshots.get(url(0)),{latestAssistantText:'The build passed; deployment is still pending verification.'});
 await f.make().tick();assert.equal(f.sends.length,2);
});
