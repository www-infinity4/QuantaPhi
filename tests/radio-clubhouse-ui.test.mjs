import assert from 'node:assert/strict';
import {test} from 'node:test';
import {readFile} from 'node:fs/promises';

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
 const mount=new Element('section'),cache=new Map(),listeners=new Map(),credits=[],shares=[];
 let results=[live([8,7]),live([9,8]),archive()],poll;
 try{
  globalThis.document={hidden:false,getElementById:id=>id==='radioClubhouse'?mount:null,
   createElement:tag=>new Element(tag),createTextNode:value=>({textContent:String(value),children:[]})};
  globalThis.window={addEventListener:(key,fn)=>listeners.set(key,fn),
   dispatchEvent:()=>{},QuantaStarCredit:(...args)=>{credits.push(args);return {pending:true}}};
  globalThis.fetch=async()=>Response.json(results.shift()||archive());
  globalThis.localStorage={getItem:key=>cache.get(key)||null,setItem:(key,value)=>cache.set(key,String(value))};
  Object.defineProperty(globalThis,'navigator',{configurable:true,value:{share:async data=>{shares.push(data)},clipboard:{writeText:async data=>{shares.push({url:data})}}}});
  globalThis.setInterval=fn=>(poll=fn,1);
  globalThis.setTimeout=()=>1;
  globalThis.clearTimeout=()=>{};
  await import('../radio-clubhouse.js?frontend-regression=1');
  await flush();
  assert.deepEqual(find(mount,'rc-topic').map(x=>x.dataset.topicId),['8']);
  const reader=find(mount,'rc-reader')[0],original=find(mount,'rc-original')[0];
  assert.match(reader.href,/^https:\/\/quantaphi\.org\/radio-clubhouse\/\?t=8&title=/);
  assert.equal(reader.dataset.siteUrl,reader.href);
  assert.equal(original.href,'https://antiqueradios.com/forums/viewtopic.php?t=8');
  assert.ok(find(mount,'rc-topic')[0].children.includes(reader)===false);
  // Read and Share are outside the collapsible excerpt, not hidden until Expand.
  assert.ok(find(mount,'rc-topic')[0].children.some(x=>String(x.className).includes('rc-actions')));
  await find(mount,'rc-secondary')[2].listeners.click();
  assert.equal(shares.length,1);
  assert.match(shares[0].url,/^https:\/\/quantaphi\.org\/radio-clubhouse\//);
  assert.ok(!shares[0].url.startsWith('https://antiqueradios.com/'));
  assert.equal(find(mount,'rc-new').length,0);
  await find(mount,'rc-refresh')[0].listeners.click();
  await flush();
  // Preserve the currently selected card when newer topics arrive.
  assert.deepEqual(find(mount,'rc-topic').map(x=>x.dataset.topicId),['8']);
  // The next control exposes the newly discovered discussion.
  find(mount,'rc-button').find(x=>x.textContent==='Next discussion').listeners.click();
  assert.deepEqual(find(mount,'rc-topic').map(x=>x.dataset.topicId),['9']);
  assert.equal(find(mount,'rc-new').length,1);
  find(mount,'rc-secondary')[0].listeners.click();
  assert.equal(credits.length,2); // successful Share and Star each submit one receipt
  assert.deepEqual(credits.map(x=>x[0]),['share','star']);
  assert.match(find(mount,'rc-notice')[0].textContent,/pending/);
  assert.ok(typeof poll==='function');
  assert.ok(typeof listeners.get('pageshow')==='function');
  listeners.get('pageshow')({persisted:true});
  await flush();
  assert.deepEqual(find(mount,'rc-topic').map(x=>x.dataset.topicId),['9']);
  assert.match(find(mount,'rc-status')[0].textContent,/previously retrieved/);
 }finally{
  for(const key of Object.keys(prior))Object.defineProperty(globalThis,key,{configurable:true,writable:true,value:prior[key]});
 }
});


test('Radio Clubhouse share landing is a first-party preview with credited original source',async()=>{
 const html=await readFile(new URL('../radio-clubhouse/index.html',import.meta.url),'utf8');
 assert.match(html,/og:site_name" content="QuantaPhi"/);
 assert.match(html,/og:image" content="https:\/\/quantaphi\.org\/preview\.png/);
 assert.match(html,/antique[r]?radios\.com\/forums\/viewtopic\.php\?t=/);
 assert.match(html,/no discussion text has been invented/);
 assert.match(html,/source\.href=/);
 assert.ok(!html.includes('iframe src="https://antiqueradios.com'));
});
