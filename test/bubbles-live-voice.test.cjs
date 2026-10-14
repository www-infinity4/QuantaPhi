'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const gateSource=fs.readFileSync('bubbles-voice-gate.js','utf8');
const appSource=fs.readFileSync('bubbles-ai.js','utf8');
const brainSource=fs.readFileSync('bubbles-brain-actions.js','utf8');

function harness(owner=false,speech=false){
 const utterances=[];const nodes=[],storage=new Map(),requests=[],recognized=[],track={stopped:false,stop(){this.stopped=true}};
 const node=(tag)=>{
  const n={tag,className:'',dataset:{},style:{setProperty(){}},children:[],handlers:{},hidden:false,value:'',
   append(...arr){this.children.push(...arr)},insertBefore(item,before){this.children.splice(this.children.indexOf(before),0,item)},
   addEventListener(name,callback){this.handlers[name]=callback},setAttribute(k,v){this[k]=v},
   getBoundingClientRect(){return{left:16,top:150}},replaceChildren(){this.children=[]},
   focus(){},select(){},removeAttribute(){}};
  nodes.push(n);return n;
 };
 const host=node('div'),body=node('body');
 const document={body,visibilityState:'visible',handlers:{},createElement:node,addEventListener(name,fn){this.handlers[name]=fn},getElementById:id=>id==='bubblesAICard'?host:null};
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
 const fetch=async(url,opts)=>{requests.push({url,opts});return{ok:true,json:async()=>url.endsWith('/work/tickets/create')?{ok:true,ticket:{id:'fixture-ticket',context:{}}}:{ok:true,output:'Bubbles response from Oracle'}}};
 const context={window,document,navigator,localStorage,location:{href:'https://quantaphi.org/',search:'',origin:'https://quantaphi.org',pathname:'/'},
  URL,URLSearchParams,crypto:{randomUUID:()=> 'note-id',subtle:require('node:crypto').webcrypto.subtle},TextEncoder,AbortSignal,CustomEvent:class{constructor(type,opts){this.type=type;this.detail=opts.detail}},fetch,AbortController,setTimeout:()=>1,clearTimeout(){}};
 if(speech){context.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};context.speechSynthesis={cancel(){},getVoices:()=>[],speak(u){utterances.push(u);u.onstart?.()}};}
 vm.runInNewContext(gateSource,context);
 vm.runInNewContext(brainSource,context);
 vm.runInNewContext(appSource,context);
 const orb=nodes.find(n=>n.className==='ba-launcher');
 return {window,document,nodes,orb,requests,recognized,track,utterances};
}
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};
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
 assert.equal(h.requests.length,0,'without owner proof no Brain or GPT write request is sent');
 assert.equal(h.nodes.find(n=>n['aria-label']==='Work request for Robot Brain').value,'fix the image upload');
 assert.ok(h.nodes.some(n=>String(n.textContent||'').includes('No job was confirmed queued')));
});

test('owner repair command creates and readies one real ticket with receipt',async()=>{
 const h=harness(true);await flush();h.orb.handlers.click();await flush();
 h.recognized[0].onresult({resultIndex:0,results:[result('Bubbles repair the video generator')]});
 await new Promise(resolve=>setTimeout(resolve,20));await flush();
 assert.equal(h.requests.length,2);assert.match(h.requests[0].url,/tickets\/create$/);assert.match(h.requests[1].url,/tickets\/update$/);
 assert.equal(JSON.parse(h.requests[0].opts.body).context.approval,'explicit-user-command');
 assert.equal(h.nodes.find(n=>n['aria-label']==='Work request for Robot Brain').value,'');
 assert.ok(h.nodes.some(n=>String(n.textContent||'').includes('Robot Brain receipt: ticket fixture-ticket is ready')));
});

test('spoken replies keep the same microphone and recognizer active',async()=>{
 const h=harness(false,true);h.orb.handlers.click();await flush();
 assert.equal(h.recognized.length,1);assert.equal(h.track.stopped,false);
 h.utterances[0].onend();
 h.recognized[0].onresult({resultIndex:0,results:[result('Bubbles hello')]});await flush();
 assert.equal(h.requests.length,1);assert.equal(h.recognized[0].stopped,undefined);assert.equal(h.track.stopped,false);
 h.recognized[0].onresult({resultIndex:0,results:[result('Bubbles response from Oracle')]});await flush();
 assert.equal(h.requests.length,1,'synthesized speech is not sent back into AI');
});
test('owner helper loaded after Bubbles is connected after deferred scripts finish',async()=>{
 const h=harness();await flush();
 h.window.QuantaBrainOwner={ready:Promise.resolve({Authorization:'Bearer fixture-only'})};
 h.document.handlers.DOMContentLoaded();await flush();
 assert.equal(h.nodes.find(n=>n.textContent==='Send approved request to Robot Brain').hidden,false);
 h.orb.handlers.click();await flush();
 h.recognized[0].onresult({resultIndex:0,results:[result('Bubbles repair the upload')]});
 await new Promise(resolve=>setTimeout(resolve,20));await flush();
 assert.equal(h.requests.length,2);
});

