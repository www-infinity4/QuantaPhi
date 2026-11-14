'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

function boot(failingTitles=[]){
 const nodes=new Map(),store=new Map();
 const tracks=Array.from({length:274},(_,i)=>({title:'Track '+i,url:'https://archive.org/download/verified-collection/track-'+i+'.mp3'}));
 const blocked=new Set(failingTitles.map(i=>tracks[i].url));
 class Node {
  constructor(tag){this.tagName=tag;this.children=[];this.handlers={};this.attributes={};this.disabled=false;this.textContent='';this.ended=false;this.paused=true;this._src='';}
  append(...items){this.children.push(...items);for(const item of items)if(item.id)nodes.set(item.id,item);return this}
  appendChild(item){this.append(item);return item}
  insertAdjacentElement(where,item){this.append(item)}
  addEventListener(type,cb){(this.handlers[type]??=[]).push(cb)}
  dispatch(type){for(const cb of this.handlers[type]||[])cb({type})}
  setAttribute(k,v){this.attributes[k]=String(v)}
  getAttribute(k){return this.attributes[k]??null}
  set src(value){this._src=value;this.attributes.src=value}
  get src(){return this._src}
  play(){
   if(blocked.has(this._src))return Promise.reject(Object.assign(new Error('unsupported media'),{name:'NotSupportedError'}));
   this.paused=false;return Promise.resolve();
  }
  pause(){this.paused=true;this.dispatch('pause')}
 }
 const anchor=new Node('div');
 const document={
  head:new Node('head'),hidden:false,
  getElementById:id=>id==='qtraffic'?anchor:nodes.get(id)||null,
  createElement:tag=>new Node(tag)
 };
 const ctx={document,URL,Set,JSON,String,Promise,console:{warn(){}},setInterval(){},
  localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},
  fetch:async()=>({ok:true,json:async()=>({tracks})})};
 vm.runInNewContext(fs.readFileSync('quick-infinity-radio.js','utf8'),ctx,{filename:'quick-infinity-radio.js'});
 return {nodes,anchor,tracks};
}
const flush=async()=>{for(let i=0;i<10;i++)await new Promise(setImmediate)};
test('a rejected media source is skipped without stopping Infinity Radio',async()=>{
 const app=boot([0]);
 await flush();
 const play=app.nodes.get('irQuickPlay');
 assert.equal(play.disabled,false);
 play.dispatch('click');
 await flush();
 const audio=app.anchor.children[0].children.find(x=>x.tagName==='audio');
 assert.equal(audio.src,app.tracks[1].url,'next working song must be attempted');
 assert.equal(play.getAttribute('aria-pressed'),'true','station stays playing after recovery');
});
test('multiple unstable songs are skipped, with no infinite retry loop',async()=>{
 const app=boot([0,1,2]);
 await flush();
 app.nodes.get('irQuickPlay').dispatch('click');
 await flush();
 const audio=app.anchor.children[0].children.find(x=>x.tagName==='audio');
 assert.equal(audio.src,app.tracks[3].url);
 assert.equal(app.nodes.get('irQuickPlay').getAttribute('aria-pressed'),'true');
});
