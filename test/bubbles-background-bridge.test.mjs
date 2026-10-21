import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

class Element {
 constructor(){this.children=[];this.style={};this.classList={add(){}};this.listeners={};}
 append(...items){for(const item of items){if(item.parent)item.parent.children=item.parent.children.filter(x=>x!==item);item.parent=this;this.children.push(item);}}
 setAttribute(){} removeAttribute(){} addEventListener(name,fn){this.listeners[name]=fn;}
}
async function exercise({approved,proof=true,slow=false}){
 const originals=Object.fromEntries(['document','window','fetch','setInterval','CustomEvent'].map(k=>[k,globalThis[k]]));
 const calls=[],intervals=[],events=[];
 let release;
 const pending=new Promise(resolve=>{release=resolve;});
 try{
  globalThis.document={hidden:true,createElement:()=>new Element()};
  globalThis.CustomEvent=class{constructor(type,init){this.type=type;this.detail=init.detail;}};
  globalThis.window={dispatchEvent(event){events.push(event.type);event.detail.respond({ok:true,reply:'acknowledged'});}};
  globalThis.setInterval=fn=>{intervals.push(fn);return 1;};
  globalThis.fetch=async(url,options)=>{
   assert.equal(options.headers.Authorization,'Bearer owner-fixture');
   const body=JSON.parse(options.body);calls.push({url,body});
   if(url.endsWith('/permission'))return Response.json({ok:true,enabled:approved,expiresAt:Date.now()+86400000});
   if(url.endsWith('/process')){if(slow)await pending;return Response.json({ok:true,jobId:'chatgpt_fixture_12345',status:'needs_bubbles_reply',message:'connection check'});}
   if(url.endsWith('/complete'))return Response.json({ok:true,status:'complete'});
   throw Error('unexpected_request');
  };
  const source=fs.readFileSync('bubbles-cloud-browser.mjs','utf8');
  const mod=await import('data:text/javascript;base64,'+Buffer.from(source+'\n// '+Math.random()).toString('base64'));
  mod.mount({host:new Element(),ownerHeaders:async()=>proof?{Authorization:'Bearer owner-fixture'}:null});
  for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));
  intervals[0]();
  if(slow){
   intervals[0]();intervals[0]();
   for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));
   assert.equal(calls.filter(x=>x.url.endsWith('/process')).length,1);
   release();
  }
  for(let i=0;i<10;i++)await new Promise(resolve=>setImmediate(resolve));
  return {calls,events};
 }finally{for(const [key,value] of Object.entries(originals)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}}
}
test('hidden but open approved Bubbles receives and completes a real bridge message cycle',async()=>{
 const {calls,events}=await exercise({approved:true});
 assert.deepEqual(events,['bubbles:chatgpt-bridge']);
 const completed=calls.find(x=>x.url.endsWith('/complete'));
 assert.equal(completed.body.id,'chatgpt_fixture_12345');
 assert.deepEqual(completed.body.reply,{ok:true,reply:'acknowledged'});
});
test('hidden page with revoked approval never processes a queued message',async()=>{
 const {calls,events}=await exercise({approved:false});
 assert.equal(events.length,0);assert.ok(calls.every(x=>x.url.endsWith('/permission')));
 assert.ok(calls.every(x=>x.body.action==='status'));
});
test('missing owner proof cannot fetch permissions or process messages',async()=>{
 const {calls,events}=await exercise({approved:true,proof:false});
 assert.equal(calls.length,0);assert.equal(events.length,0);
});
test('slow background request keeps one flight across overlapping timer ticks',async()=>{
 const {calls,events}=await exercise({approved:true,slow:true});
 assert.equal(calls.filter(x=>x.url.endsWith('/process')).length,1);
 assert.equal(calls.filter(x=>x.url.endsWith('/complete')).length,1);
 assert.equal(events.length,1);
});
