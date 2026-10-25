import test from 'node:test';
import assert from 'node:assert/strict';
import {createChatGPTLoop} from '../bubbles-chatgpt-loop.mjs';

const url=n=>'https://chatgpt.com/c/12345678-1234-4123-8123-'+String(n).padStart(12,'0');
const items=Array.from({length:12},(_,n)=>({url:url(n),title:'Chat '+n}));
const snapshot=(item,extra={})=>({authenticatedConversation:true,conversationUrl:item.url,
 latestRole:'assistant',messageCount:8,latestAssistantText:'The deployment is pending verification.',
 editorReady:true,draftPresent:false,generating:false,recentNudgeCount:0,...extra});

test('pins the newest eight once; sends a star in each and keeps watching those same chats',async()=>{
 const sent=[],events=[];let lists=0,ticks=0;
 const loop=createChatGPTLoop({
  listRecent:async()=>{lists++;return [...items.slice(0,2),items[0],...items.slice(2)];},
  inspect:async item=>snapshot(item),resume:async item=>{sent.push(item.url);return {submissionVerified:true};},
  onEvent:e=>events.push(e),wait:async()=>{if(++ticks===3)loop.stop();}
 });
 assert.equal(loop.start(),true);assert.equal(loop.start(),false);
 await loop.settled();
 assert.equal(lists,1);assert.equal(sent.length,8);
 assert.deepEqual(sent,items.slice(0,8).map(x=>x.url));
 assert.ok(events.some(e=>e.round===3));assert.equal(loop.running,false);
});

test('a later completed new reply can receive another star after the cooldown',async()=>{
 const sent=[],events=[];let clock=0,round=0;
 const loop=createChatGPTLoop({listRecent:async()=>items.slice(0,1),
  beforeRound:async()=>{round++;},
  inspect:async item=>snapshot(item,round===1?{}:{messageCount:10,latestUserText:'*',
   recentNudgeCount:1,latestAssistantText:'The build passed; the live deployment is still pending verification.'}),
  resume:async(item,before)=>{sent.push(before.messageCount);return {submissionVerified:true};},
  now:()=>clock,onEvent:e=>events.push(e),
  wait:async()=>{clock+=60000;if(round>=3)loop.stop();}
 });
 loop.start();await loop.settled();
 assert.deepEqual(sent,[8,10]);
 assert.equal(events.filter(e=>e.type==='reply').length,1);
});

test('never repeats an unchanged answer, even when a new assistant turn exists',async()=>{
 let round=0,sends=0;
 const loop=createChatGPTLoop({listRecent:async()=>items.slice(0,1),
  beforeRound:async()=>{round++;},inspect:async item=>snapshot(item,{messageCount:round===1?8:10}),
  resume:async()=>{sends++;return {submissionVerified:true};},
  now:()=>round*120000,wait:async()=>{if(round===4)loop.stop();}
 });
 loop.start();await loop.settled();assert.equal(sends,1);
});

test('active generation, drafts, unanswered user turns, and owner questions do not submit',async()=>{
 const variants=[{generating:true},{draftPresent:true},{latestRole:'user'},
  {latestAssistantText:'Please provide your password.'}];let sends=0,checked=0;
 const loop=createChatGPTLoop({listRecent:async()=>items.slice(0,4),
  inspect:async item=>snapshot(item,variants[checked++]),
  resume:async()=>{sends++;return {submissionVerified:true};},wait:async()=>loop.stop()
 });
 loop.start();await loop.settled();assert.equal(checked,4);assert.equal(sends,0);
});

test('stop during an in-flight inspection prevents the next send',async()=>{
 let release,observed;const inspecting=new Promise(resolve=>{observed=resolve;});let sends=0;
 const loop=createChatGPTLoop({listRecent:async()=>items,
  inspect:async item=>{observed();await new Promise(resolve=>{release=resolve;});return snapshot(item);},
  resume:async()=>{sends++;return {submissionVerified:true};}
 });
 loop.start();await inspecting;loop.stop();release();await loop.settled();assert.equal(sends,0);
});

test('revoked approval or a lost submission receipt ends the loop without renewal or blind retry',async()=>{
 for(const lost of [true,false]){
  let round=0,sends=0;const events=[];
  const loop=createChatGPTLoop({listRecent:async()=>items.slice(0,1),
   beforeRound:async()=>{if(++round>1)throw Error('chatgpt_five_day_approval_required');},
   inspect:async item=>snapshot(item),resume:async()=>{sends++;if(lost)throw Error('http_timeout');return {submissionVerified:true};},
   wait:async()=>{},onEvent:e=>events.push(e)
  });
  loop.start();await loop.settled();assert.equal(sends,1);
  assert.ok(events.some(e=>e.type==='blocked'));
 }
});

test('an existing recent star receives an initial cooldown, and restarting keeps checkpoints',async()=>{
 let clock=0,round=0,sends=0;
 const loop=createChatGPTLoop({listRecent:async()=>items.slice(0,1),
  beforeRound:async()=>{round++;},
  inspect:async item=>snapshot(item,{recentNudgeCount:1,latestUserText:'*'}),
  resume:async()=>{sends++;return {submissionVerified:true};},now:()=>clock,
  wait:async()=>{clock+=60000;loop.stop();}
 });
 loop.start();await loop.settled();assert.equal(sends,0);
 loop.start();await loop.settled();assert.equal(sends,0);
 loop.start();await loop.settled();assert.equal(sends,1);assert.equal(round,3);
});
