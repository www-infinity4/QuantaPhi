import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const code=readFileSync(new URL('../bubbles-embed.js',import.meta.url),'utf8');
function mount(){
 const listeners={},events=[],elements=[],messages=[],mounted=[];
 function createElement(tag){
  const el={tag,style:{setProperty(key,value){this[key]=value}},dataset:{},handlers:{},children:[],contentWindow:tag==='iframe'?{postMessage(msg,origin){messages.push({msg,origin})}}:undefined,
   setAttribute(key,value){this[key]=value},addEventListener(type,fn){this.handlers[type]=fn;listeners[tag+':'+type]=fn;},appendChild(child){this.children.push(child);},
   fire(type,event={}){this.handlers[type]?.(event);}
  };
  elements.push(el);return el;
 }
 const document={currentScript:{dataset:{bubbleId:'team-bubble',bubbleName:'Bubbles'}},createElement,
  body:{append(...nodes){mounted.push(...nodes)}},documentElement:{append(...nodes){mounted.push(...nodes)}}};
 const window={innerWidth:400,innerHeight:700,
  addEventListener(type,fn){listeners[type]=fn;},
  dispatchEvent(event){events.push(event);}};
 class CustomEvent {constructor(type,options){this.type=type;this.detail=options.detail;}}
 vm.runInNewContext(code,{document,window,CustomEvent,URLSearchParams});
 const iframe=elements.find(x=>x.tag==='iframe'),orb=elements.find(x=>x.tag==='button');
 return {iframe,orb,events,messages,mounted,listeners,
  receive:(data,origin='https://quantaphi.org',source=iframe.contentWindow)=>
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

test('closed embed paints only a circular accessible button, with no iframe page text',()=>{
 const kit=mount();
 assert.equal(kit.mounted.length,1,'closed widgets must not mount a costly iframe');
 assert.equal(kit.mounted[0],kit.orb);
 assert.equal(kit.iframe.src,undefined,'closed widget must not even navigate Bubbles');
 assert.equal(kit.iframe.style.display,'none');
 assert.equal(kit.orb.style.display,'block');
 assert.match(kit.orb.style.cssText,/border-radius:50%!important/);
 assert.match(kit.orb['aria-label'],/Open Bubbles chat/);
 assert.equal(kit.orb.children.length,3);
 assert.equal(kit.orb.children.every(child=>child.tag==='span'),true);
 assert.equal(kit.messages.length,0,'no script or microphone auto-start');
});

test('tap opens iframe and close restores host orb; foreign frames cannot fake close',()=>{
 const kit=mount();
 kit.orb.fire('click');
 assert.equal(kit.mounted.length,2,'first tap lazily mounts the frame');
 assert.equal(kit.mounted[1],kit.iframe);
 assert.match(kit.iframe.src,/^https:\/\/quantaphi\.org\/bubbles\.html\?/);
 assert.equal(kit.iframe.style.display,'block');
 assert.equal(kit.orb.style.display,'none');
 assert.equal(kit.messages.length,0,'open waits for child readiness');
 kit.iframe.fire('load');
 assert.equal(kit.messages.length,1);
 assert.equal(kit.messages[0].msg.type,'quantaphi:bubbles:open');
 assert.equal(kit.messages[0].msg.id,'team-bubble');
 assert.equal(kit.messages[0].origin,'https://quantaphi.org');
 kit.receive({type:'quantaphi:bubbles:size',open:false},'https://evil.example');
 assert.equal(kit.iframe.style.display,'block');
 kit.receive({type:'quantaphi:bubbles:size',open:false});
 assert.equal(kit.iframe.style.display,'none');
 assert.equal(kit.orb.style.display,'block');
 kit.orb.fire('click');
 assert.equal(kit.mounted.length,2,'reopen reuses iframe, not duplicate request or document');
 assert.equal(kit.messages.length,2,'reopening works without reloading or losing chat state');
});

test('dragging the closed orb does not accidentally open the messenger',()=>{
 const kit=mount();
 kit.orb.fire('pointerdown',{button:0,clientX:345,clientY:585,pointerId:1});
 kit.orb.fire('pointermove',{clientX:300,clientY:545});
 kit.orb.fire('pointerup');
 kit.orb.fire('click');
 assert.equal(kit.iframe.style.display,'none');
 kit.orb.fire('click');
 assert.equal(kit.iframe.style.display,'block');
});
