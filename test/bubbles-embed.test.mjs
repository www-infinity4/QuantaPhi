import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const code=readFileSync(new URL('../bubbles-embed.js',import.meta.url),'utf8');
function mount(){
 const listeners={},events=[];
 const iframe={style:{},dataset:{},contentWindow:{},setAttribute(){},addEventListener(type,fn){listeners['iframe:'+type]=fn;}};
 const document={currentScript:{dataset:{bubbleId:'team-bubble',bubbleName:'Bubbles'}},
  createElement(name){assert.equal(name,'iframe');return iframe;},
  body:{appendChild(){}},documentElement:{appendChild(){}}};
 const window={innerWidth:400,innerHeight:700,
  addEventListener(type,fn){listeners[type]=fn;},
  dispatchEvent(event){events.push(event);}};
 class CustomEvent {constructor(type,options){this.type=type;this.detail=options.detail;}}
 vm.runInNewContext(code,{document,window,CustomEvent,URLSearchParams});
 return {iframe,events,receive:(data,origin='https://quantaphi.org',source=iframe.contentWindow)=>
   listeners.message({origin,source,data})};
}
test('explicit visitor website drafts are relayed as untrusted events, never owner jobs',()=>{
 const kit=mount();
 kit.receive({type:'quantaphi:bubbles:site-draft',id:'team-bubble',request:'Create my own website'});
 assert.equal(kit.events.length,1);
 assert.equal(kit.events[0].type,'bubbles:work-draft');
 assert.equal(kit.events[0].detail.request,'Create my own website');
 assert.equal(kit.events[0].detail.executed,false);
 assert.equal(kit.events[0].detail.source,'bubbles-embed');
});
test('foreign origins, windows, mismatched ids and empty drafts are rejected',()=>{
 const kit=mount();
 const data={type:'quantaphi:bubbles:site-draft',id:'team-bubble',request:'Change wallet'};
 kit.receive(data,'https://other.example');
 kit.receive(data,'https://quantaphi.org',{});
 kit.receive({...data,id:'other'});
 kit.receive({...data,request:'   '});
 kit.receive({...data,request:null});
 assert.equal(kit.events.length,0);
});
test('website draft text is bounded',()=>{
 const kit=mount();
 kit.receive({type:'quantaphi:bubbles:site-draft',id:'team-bubble',request:'X'.repeat(4000)});
 assert.equal(kit.events[0].detail.request.length,2000);
});
