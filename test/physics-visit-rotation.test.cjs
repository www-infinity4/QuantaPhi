'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

async function setup(hash=''){
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.listeners={};this.attributes={};this.textContent='';}
  appendChild(node){this.children.push(node);return node}
  append(...nodes){this.children.push(...nodes)}
  replaceChildren(...nodes){this.children=[...nodes]}
  setAttribute(name,value){this.attributes[name]=value}
  getAttribute(name){return this.attributes[name]}
  addEventListener(type,callback){(this.listeners[type]??=[]).push(callback)}
  dispatch(type){for(const callback of this.listeners[type]||[])callback()}
  scrollIntoView(){}
 }
 const mount=new Element('section'),storage=new Map(),listeners={};
 const seed=(id,number)=>({id,number,title:'Experiment '+number,
  description:'A tested science experiment',principle:'Conservation law',
  imageUrl:'https://example.org/'+id+'.png',materials:['a'],steps:['test'],
  sources:[{url:'https://example.org/source',label:'Source'}]});
 const catalog={schema:'widgetphi.physics-seed/v1',experiments:[seed('physics-001',1),seed('physics-002',2),seed('physics-003',3)]};
 const built={schema:'widgetphi.physics-built/v1',generatedIds:catalog.experiments.map(x=>x.id)};
 const ctx={window:{location:{hash,origin:'https://quantaphi.org'},addEventListener:(name,cb)=>listeners[name]=cb},
  document:{getElementById:id=>id==='infinityConcepts'?mount:null,createElement:tag=>new Element(tag)},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
  fetch:async url=>({ok:true,json:async()=>String(url).includes('physics-built')?built:catalog}),
  URL,Set,JSON,String,Array,Number,Date,console:{warn(){}},AbortController,
  setTimeout:()=>1,clearTimeout:()=>{},requestAnimationFrame:cb=>cb()};
 vm.runInNewContext(fs.readFileSync('infinity-concepts.js','utf8'),ctx,{filename:'infinity-concepts.js'});
 for(let i=0;i<10;i++)await new Promise(setImmediate);
 return {mount,storage,listeners,ctx};
}
test('Physics card changes on each carousel visit and remembers its last experiment',async()=>{
 const app=await setup();
 const shown=()=>app.mount.children[0]?.getAttribute('data-infinity-concept-id');
 const first=shown();assert.ok(first);
 app.mount.dispatch('oracle:activate');const second=shown();
 assert.notEqual(second,first,'reopening card must not display the same experiment');
 app.mount.dispatch('oracle:activate');const third=shown();
 assert.notEqual(third,second,'every subsequent visit rotates');
 assert.equal(app.storage.get('quantaPhi:physicsLastViewed:v1'),third);
});
test('Physics direct link remains pinned to the requested experiment',async()=>{
 const app=await setup('#infinity-concept-physics-002');
 const shown=()=>app.mount.children[0]?.getAttribute('data-infinity-concept-id');
 assert.equal(shown(),'physics-002');
 app.mount.dispatch('oracle:activate');
 assert.equal(shown(),'physics-002');
});
