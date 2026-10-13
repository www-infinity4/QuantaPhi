'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const gateSource=fs.readFileSync('bubbles-voice-gate.js','utf8');
const appSource=fs.readFileSync('bubbles-ai.js','utf8');

function harness(){
 const nodes=[],storage=new Map(),requests=[],recognized=[],track={stopped:false,stop(){this.stopped=true}};
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
 const window={parent:{postMessage(){}},SpeechRecognition:Recognition,addEventListener(){},innerWidth:390,innerHeight:780};
 const navigator={mediaDevices:{async getUserMedia(){return{getTracks:()=>[track]}}}};
 const localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
 const fetch=async(url,opts)=>{requests.push({url,opts});return{ok:true,json:async()=>({ok:true,output:'Bubbles response from Oracle'})}};
 const context={window,document,navigator,localStorage,location:{search:'',origin:'https://quantaphi.org',pathname:'/'},
  URLSearchParams,crypto:{randomUUID:()=> 'note-id'},fetch,AbortController,setTimeout:()=>1,clearTimeout(){}};
 vm.runInNewContext(gateSource,context);
 vm.runInNewContext(appSource,context);
 const orb=nodes.find(n=>n.className==='ba-launcher');
 return {window,document,nodes,orb,requests,recognized,track};
}
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve()};
const result=s=>Object.assign([{transcript:s}],{isFinal:true});
test('Bubbles opens typing first and explicit voice control starts continuous listening',async()=>{
 const h=harness();assert.equal(h.recognized.length,0);
 h.orb.handlers.click();await flush();assert.equal(h.recognized.length,0);
 h.nodes.find(n=>n.textContent==='Connect Bubbles voice').handlers.click();await flush();
 assert.equal(h.recognized.length,1);assert.equal(h.recognized[0].continuous,true);
 assert.equal(h.recognized[0].interimResults,true);
 h.recognized[0].onresult({resultIndex:0,results:[result('Someone talking nearby')]});
 await flush();assert.equal(h.requests.length,0);
 h.recognized[0].onresult({resultIndex:0,results:[result('Bubbles explain stars')]});
 await flush();
 assert.equal(h.requests.length,1);
 assert.match(h.requests[0].opts.body,/explain stars/);
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

test('background suspension resumes on return but deliberate mute stays muted',async()=>{
 const h=harness();h.nodes.find(n=>n.textContent==='Connect Bubbles voice').handlers.click();await flush();
 h.document.visibilityState='hidden';h.document.handlers.visibilitychange();
 assert.equal(h.recognized[0].stopped,true);assert.equal(h.track.stopped,true);
 h.document.visibilityState='visible';h.document.handlers.visibilitychange();await flush();
 assert.equal(h.recognized.length,2);assert.equal(h.recognized[1].started,true);
 h.nodes.find(n=>n.className==='ba-mic').handlers.click();
 h.document.visibilityState='hidden';h.document.handlers.visibilitychange();
 h.document.visibilityState='visible';h.document.handlers.visibilitychange();await flush();
 assert.equal(h.recognized.length,2);
});
