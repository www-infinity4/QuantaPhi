import assert from 'node:assert/strict';
import {test} from 'node:test';

class Element {
 constructor(tag='div'){this.tag=tag;this.children=[];this.className='';this.dataset={};this.listeners={};this.textContent='';}
 append(...items){this.children.push(...items)}
 replaceChildren(...items){this.children=items}
 setAttribute(){}
 addEventListener(name,handler){this.listeners[name]=handler}
}
const walk=(node)=>[node,...(node.children||[]).flatMap(walk)];
const find=(root,cls)=>walk(root).filter(n=>String(n.className||'').split(' ').includes(cls));
const topic=id=>({id:String(id),title:'Real thread '+id,url:'https://antiqueradios.com/forums/viewtopic.php?t='+id});
const live=ids=>({ok:true,archived:false,feedType:'forum',topics:ids.map(topic)});
const archive=()=>({ok:true,archived:true,feedType:'archive',topics:[{...topic(448450),archived:true,publishedAt:'2025-06-05'}]});
const flush=async()=>{for(let i=0;i<16;i++)await Promise.resolve()};

test('Radio Clubhouse browser refresh, archive labels, pending rewards and BFCache',async()=>{
 const prior={document:globalThis.document,window:globalThis.window,fetch:globalThis.fetch,
 localStorage:globalThis.localStorage,navigator:globalThis.navigator,setInterval:globalThis.setInterval,
 setTimeout:globalThis.setTimeout,clearTimeout:globalThis.clearTimeout};
 const mount=new Element('section'),cache=new Map(),listeners=new Map(),credits=[];
 let results=[live([8,7]),live([9,8]),archive()],poll;
 try{
  globalThis.document={hidden:false,getElementById:id=>id==='radioClubhouse'?mount:null,
   createElement:tag=>new Element(tag),createTextNode:value=>({textContent:String(value),children:[]})};
  globalThis.window={addEventListener:(key,fn)=>listeners.set(key,fn),
   dispatchEvent:()=>{},QuantaStarCredit:(...args)=>{credits.push(args);return {pending:true}}};
  globalThis.fetch=async()=>Response.json(results.shift()||archive());
  globalThis.localStorage={getItem:key=>cache.get(key)||null,setItem:(key,value)=>cache.set(key,String(value))};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{share:async()=>{},clipboard:{writeText:async()=>{}}}});
  globalThis.setInterval=fn=>(poll=fn,1);
  globalThis.setTimeout=()=>1;
  globalThis.clearTimeout=()=>{};
  await import('../radio-clubhouse.js?frontend-regression=1');
  await flush();
  assert.deepEqual(find(mount,'rc-topic').map(x=>x.dataset.topicId),['8','7']);
  assert.equal(find(mount,'rc-new').length,0);
  await find(mount,'rc-refresh')[0].listeners.click();
  await flush();
  assert.deepEqual(find(mount,'rc-topic').map(x=>x.dataset.topicId),['9','8']);
  assert.equal(find(mount,'rc-new').length,1);
  find(mount,'rc-secondary')[0].listeners.click();
  assert.equal(credits.length,1);
  assert.match(find(mount,'rc-notice')[0].textContent,/pending/);
  assert.ok(typeof poll==='function');
  assert.ok(typeof listeners.get('pageshow')==='function');
  listeners.get('pageshow')({persisted:true});
  await flush();
  assert.deepEqual(find(mount,'rc-topic').map(x=>x.dataset.topicId),['9','8']);
  assert.match(find(mount,'rc-status')[0].textContent,/previously retrieved/);
 }finally{
  for(const key of Object.keys(prior))Object.defineProperty(globalThis,key,{configurable:true,writable:true,value:prior[key]});
 }
});
