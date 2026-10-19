'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const gateSource=fs.readFileSync('bubbles-voice-gate.js','utf8');
const appSource=fs.readFileSync('bubbles-ai.js','utf8');
const brainSource=fs.readFileSync('bubbles-brain-actions.js','utf8');

function harness(owner=false,speech=false){
 const clock={now:Date.now()};const FakeDate=class extends Date{static now(){return clock.now}};
 const utterances=[],memoryRequests=[],catalogCalls=[];let ownsVoice=true;const nodes=[],storage=new Map(),requests=[],recognized=[],track={stopped:false,stop(){this.stopped=true}};
 const node=(tag)=>{
  const n={tag,className:'',classList:{add(){},remove(){},toggle(){}},dataset:{},style:{setProperty(){}},children:[],handlers:{},hidden:false,value:'',
   prepend(...items){this.children.unshift(...items)},before(){},append(...arr){this.children.push(...arr)},insertBefore(item,before){this.children.splice(this.children.indexOf(before),0,item)},
   addEventListener(name,callback){this.handlers[name]=callback},setAttribute(k,v){this[k]=v},
   getBoundingClientRect(){return{left:16,top:150}},replaceChildren(){this.children=[]},
   focus(){},select(){},removeAttribute(){}};
  nodes.push(n);return n;
 };
 const host=node('div'),body=node('body');
 const document={body,head:node('head'),createTreeWalker:()=>({nextNode:()=>null}),visibilityState:'visible',handlers:{},createElement:node,addEventListener(name,fn){this.handlers[name]=fn},getElementById:id=>id==='bubblesAICard'?host:null};
 class Recognition{
  constructor(){recognized.push(this)}
  start(){this.started=true}
  abort(){this.stopped=true}
 }
 const window={parent:{postMessage(){}},dispatchEvent(){},BubblesContinuousVoice:{async startContinuousVoice(options){
  const rec=new Recognition();rec.start();rec.continuous=true;rec.interimResults=true;
  rec.onresult=event=>{for(const result of event.results){if(result.isFinal&&!options.isSpeaking())options.onTranscript(result[0].transcript);else if(!options.isSpeaking())options.onLevel(.1)}};
  return {stop(){rec.abort()},async resume(){}};
 }},addEventListener(){},innerWidth:390,innerHeight:780, ...(owner?{QuantaBrainOwner:{ready:Promise.resolve({Authorization:'Bearer fixture-only'})}}:{})};
 const navigator={mediaDevices:{async getUserMedia(){return{getTracks:()=>[track]}}}};
 const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const fetch=async(url,opts)=>{
  if(url.endsWith('/owner/conversation')){
   memoryRequests.push({url,opts});
   const body=JSON.parse(opts.body);if(body.mode==='notification-preferences')return {ok:true,json:async()=>({ok:true,preferences:{mode:body.preference}})};
   return {ok:true,json:async()=>({ok:true,owned:ownsVoice,saved:JSON.parse(opts.body).messages?.map(m=>m.id)||[],recent:[],related:[]})};
  }
  if(url.endsWith('/work/github')){
   const body=JSON.parse(opts.body);catalogCalls.push(body);
   if(body.action==='list_repositories')return {ok:true,json:async()=>({ok:true,complete:true,repositories:[{repository:'www-infinity4/QuantaPhi',archived:false}]})};
   if(body.action==='suggest_repositories')return {ok:true,json:async()=>({ok:true,source:'verified-test-catalog',catalogComplete:true,candidates:[{repository:'www-infinity4/QuantaPhi',score:20}],selection:['www-infinity4/QuantaPhi'],confidence:'high',requiresReview:false,reason:'fixture Bubbles source'})};
  }
  requests.push({url,opts});
  return {ok:true,json:async()=>url.endsWith('/work/tickets/create')?{ok:true,ticket:{id:'fixture-ticket',status:'ready',context:{kind:'robot-directions'}},execution:{status:'queued_for_runner'}}:url.endsWith('/work/run-next')?{ok:true,status:'queued_for_runner',ticketId:'fixture-ticket',jobId:'TASK-1'}:{ok:true,output:'Bubbles response from Oracle'}};
 };
 const context={window,document,navigator,localStorage,location:{href:'https://quantaphi.org/',search:'',origin:'https://quantaphi.org',pathname:'/'},
  NodeFilter:{SHOW_TEXT:4},scrollY:0,innerHeight:780,innerWidth:390,URL,URLSearchParams,Response,Date:FakeDate,crypto:{randomUUID:()=> 'note-id',subtle:require('node:crypto').webcrypto.subtle},TextEncoder,AbortSignal,CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail}},fetch:async(...args)=>{
   const fixture=await fetch(...args);
   return Response.json(await fixture.json(),{status:fixture.ok?200:500});
  },AbortController,setTimeout:()=>1,clearTimeout(){}};
 if(speech){context.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};context.speechSynthesis={cancel(){},getVoices:()=>[],speak(u){utterances.push(u);u.onstart?.()}};}
 vm.runInNewContext(gateSource,context);
 vm.runInNewContext(brainSource,context);
 vm.runInNewContext(appSource,context);
 const orb=nodes.find(n=>n.className==='ba-launcher');
 return {window,document,nodes,orb,requests,recognized,track,utterances,memoryRequests,catalogCalls,advance:ms=>{clock.now+=ms},setVoiceOwned:value=>{ownsVoice=value}};
}
const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve()};
const result=s=>Object.assign([{transcript:s}],{isFinal:true});
test('Touching Bubbles starts continuous listening',async()=>{
 const h=harness();assert.equal(h.recognized.length,0);
 h.orb.handlers.click();await flush();assert.equal(h.recognized.length,1);
 h.nodes.find(n=>n.textContent==='Connect Bubbles voice').handlers.click();await flush();
 assert.equal(h.recognized.length,1);assert.equal(h.recognized[0].continuous,true);
 assert.equal(h.recognized[0].interimResults,true);
 h.recognized[0].onresult({resultIndex:0,results:[result('Explain the wallet')]});
 await flush();assert.equal(h.requests.length,1);
 h.recognized[0].onresult({resultIndex:0,results:[result('Bubbles explain stars')]});
 await flush();
 assert.equal(h.requests.length,2);
 assert.match(h.requests[0].opts.body,/Explain the wallet/);
 assert.match(h.requests[1].opts.body,/explain stars/);
});
test('wake window accepts follow ups and a voice mute releases microphone',async()=>{
 const h=harness();h.nodes.find(n=>n.textContent==='Connect Bubbles voice').handlers.click();await flush();
 const rec=h.recognized[0];
 rec.onresult({resultIndex:0,results:[result('Bubbles')]});
 rec.onresult({resultIndex:0,results:[result('Tell me what this page does')]});
 await flush();
 assert.equal(h.requests.length,1);
 rec.onresult({resultIndex:0,results:[result('Bubbles go quiet')]});
 assert.equal(h.track.stopped,true);
 assert.equal(rec.stopped,true);
 assert.equal(h.orb.dataset.state,'idle');
});

test('microphone stays on across tab visibility changes until deliberate mute',async()=>{
 const h=harness();h.nodes.find(n=>n.textContent==='Connect Bubbles voice').handlers.click();await flush();
 h.document.visibilityState='hidden';h.document.handlers.visibilitychange();
 assert.equal(h.recognized[0].stopped,undefined);assert.equal(h.track.stopped,false);
 h.document.visibilityState='visible';h.document.handlers.visibilitychange();await flush();
 assert.equal(h.recognized.length,1);assert.equal(h.recognized[0].started,true);
 h.nodes.find(n=>n.className==='ba-mic').handlers.click();
 h.document.visibilityState='hidden';h.document.handlers.visibilitychange();
 h.document.visibilityState='visible';h.document.handlers.visibilitychange();await flush();
 assert.equal(h.recognized.length,1);assert.equal(h.track.stopped,true);
});

test('local speech energy lights the bubble without sending a chat request',async()=>{
 const h=harness();h.orb.handlers.click();await flush();
 const interim=Object.assign([{transcript:'Bubbles hello there'}],{isFinal:false});
 h.recognized[0].onresult({resultIndex:0,results:[interim]});
 assert.equal(h.orb.dataset.state,'hearing');assert.equal(h.requests.length,0);
});
test('explicit repair command is kept as work rather than a fabricated chat repair',async()=>{
 const h=harness();h.orb.handlers.click();await flush();
 h.recognized[0].onresult({resultIndex:0,results:[result('Bubbles fix the image upload')]});await flush();
 assert.equal(h.requests.length,0,'Blocked owner submission reports its actual result without a second chat request');
 assert.equal(h.nodes.find(n=>n['aria-label']==='Work request for Robot Brain').value,'fix the image upload');
 assert.ok(h.nodes.some(n=>String(n.textContent||'').includes('I could not confirm that Robot Brain received this request')));
});

test('owner repair command creates and readies one real ticket with receipt',async()=>{
 const h=harness(true);await flush();h.orb.handlers.click();await flush();
 h.recognized[0].onresult({resultIndex:0,results:[result('Bubbles repair the video generator')]});
 for(let attempt=0;attempt<100&&!h.requests.some(r=>r.url.endsWith('/work/tickets/create'));attempt++){await new Promise(resolve=>setTimeout(resolve,10));await flush();}
 assert.equal(h.requests.filter(r=>r.url.endsWith('/work/tickets/create')).length,1);assert.match(h.requests[0].url,/tickets\/create$/);assert.ok(!h.requests.some(r=>r.url.endsWith('/work/run-next')||r.url.endsWith('/work/tickets/update')));
 assert.equal(JSON.parse(h.requests[0].opts.body).context.approval,'explicit-user-command');
 assert.ok(h.catalogCalls.some(c=>c.action==='suggest_repositories'),'Owner voice task consulted the authenticated repository resolver');
 assert.ok(h.nodes.some(n=>n.tag==='a'&&n.href==='https://quantaphi.org/#robotDirections'),'Receipt contains a clickable progress link');
 assert.ok(h.requests.every(r=>!r.url.includes('/v1/assist')),'No chat-only service can contradict the receipt');
 assert.equal(h.nodes.find(n=>n['aria-label']==='Work request for Robot Brain').value,'');
 assert.ok(h.nodes.some(n=>[n.textContent,...n.children.filter(c=>typeof c==='string')].join('').includes('build runner has been requested')));
});

test('spoken replies keep the same microphone and recognizer active',async()=>{
 const h=harness(false,true);h.orb.handlers.click();await flush();
 assert.equal(h.recognized.length,1);assert.equal(h.track.stopped,false);
 h.utterances[0].onend();h.advance(950);
 h.recognized[0].onresult({resultIndex:0,results:[result('Bubbles hello')]});await flush();
 assert.equal(h.requests.length,0,'early echo after spoken playback stays quarantined');
 h.advance(1600);
 h.recognized[0].onresult({resultIndex:0,results:[result('Bubbles hello')]});await flush();
 assert.equal(h.requests.length,1);assert.equal(h.recognized[0].stopped,undefined);assert.equal(h.track.stopped,false);
 h.recognized[0].onresult({resultIndex:0,results:[result('Bubbles response from Oracle')]});await flush();
 assert.equal(h.requests.length,1,'synthesized speech is not sent back into AI');
});
test('owner helper loaded after Bubbles is connected after deferred scripts finish',async()=>{
 const h=harness();await flush();
 h.window.QuantaBrainOwner={ready:Promise.resolve({Authorization:'Bearer fixture-only'})};
 h.document.handlers.DOMContentLoaded();await flush();
 assert.equal(h.nodes.find(n=>n.textContent==='Start work').hidden,false);
 h.orb.handlers.click();await flush();
 h.recognized[0].onresult({resultIndex:0,results:[result('Bubbles repair the upload')]});
 for(let attempt=0;attempt<100&&!h.requests.some(r=>r.url.endsWith('/work/tickets/create'));attempt++){await new Promise(resolve=>setTimeout(resolve,10));await flush();}
 assert.equal(h.requests.filter(r=>r.url.endsWith('/work/tickets/create')).length,1);
});



test('a microphone takeover prevents the previous session from submitting a spoken repair',async()=>{
 const h=harness(true);await flush();h.orb.handlers.click();await flush();
 h.setVoiceOwned(false);
 h.recognized[0].onresult({resultIndex:0,results:[result('Bubbles repair the video generator')]});
 await new Promise(resolve=>setTimeout(resolve,20));await flush();
 assert.equal(h.requests.length,0,'A stale voice session cannot submit jobs or chat requests');
 assert.ok(h.memoryRequests.some(r=>JSON.parse(r.opts.body).mode==='voice-renew'));
});

test('spoken explicit notification correction saves only the setting through owner auth',async()=>{
 const h=harness(true);await flush();h.orb.handlers.click();await flush();
 h.recognized[0].onresult({resultIndex:0,results:[result('only tell me when finished')]});await flush();
 const settings=h.memoryRequests.map(r=>JSON.parse(r.opts.body)).filter(b=>b.mode==='notification-preferences');
 assert.deepEqual(settings,[{mode:'notification-preferences',preference:'finished'}]);
 assert.equal(h.requests.length,0,'no job or chat-only provider request is created');
 assert.ok(h.nodes.some(n=>[n.textContent,...n.children.filter(c=>typeof c==='string')].join('').includes('Saved. Only verified job completions.')));
});
