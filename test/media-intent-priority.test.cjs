const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const source=fs.readFileSync('media-repair.js','utf8');
function fixture(){
 const listeners=new Map(),documentEvents=new Map(),calls=[],pending=[];
 const parent={children:[],insertBefore(item,reference){
  if(item.parentNode){const old=item.parentNode.children.indexOf(item);if(old>=0)item.parentNode.children.splice(old,1)}
  let index=this.children.indexOf(reference);if(index<0)index=this.children.length;
  this.children.splice(index,0,item);item.parentNode=this;return item;
 }};
 const el=(id)=>({id,parentNode:parent,hidden:id==='media',value:'',textContent:'',innerHTML:'',dataset:{},
  classList:{add(){},remove(){}},scrollIntoView(){},querySelector(s){return s==='h2'?heading:null},cloneNode(){return this},replaceWith(){},addEventListener(){}});
 const heading={textContent:'Media extensions'};
 const nodes=Object.fromEntries(['q','go','status','webSearchResults','result','media','mediaGrid','qImagesBtn','qVideoBtn','qSoundBtn'].map(id=>[id,el(id)]));
 nodes.q.value='';parent.children=[nodes.status,nodes.webSearchResults,nodes.result,nodes.media];nodes.media.hidden=true;
 const document={getElementById:id=>nodes[id],createComment:()=>({nodeType:8}),addEventListener:(name,fn)=>documentEvents.set(name,fn)};
 let json=async()=>({results:[]});
 const fetch=(url)=>{const u=new URL(String(url));calls.push(u);return Promise.resolve({ok:true,json:()=>json(u)})};
 const window={addEventListener:(name,fn)=>listeners.set(name,[...(listeners.get(name)||[]),fn]),dispatchEvent:e=>(listeners.get(e.type)||[]).forEach(fn=>fn(e))};
 const context={window,document,URL,URLSearchParams,AbortController,fetch,setTimeout,clearTimeout,console};
 vm.createContext(context);vm.runInContext(source,context);
 const search=q=>{nodes.q.value=q;(listeners.get('quantaphi:search-start')||[]).forEach(fn=>fn({detail:{query:q,run:calls.length+1}}))};
 const next=()=>new Promise(resolve=>setTimeout(resolve,0));
 return {nodes,parent,calls,window,search,next,preflight:(query)=>{nodes.q.value=query;documentEvents.get('click')?.({type:'click',target:nodes.go})},respond:f=>{json=f}};
}
test('explicit image/video feed intent and subject extraction, never generic search hijack',()=>{
 const api=fixture().window.QuantaMediaRepair,intent=api.mediaIntent;
 for(const [q,kind,subject]of [
  ['images of radio clubhouse kits','image','radio clubhouse kits'],
  ['radio clubhouse kit photos','image','radio clubhouse kit'],
  ['radio clubhouse image feed','image','radio clubhouse'],
  ['video feed of Pink Floyd','video','Pink Floyd'],
  ['watch videos of antique radios','video','antique radios'],
  ['Pink Floyd videos','video','Pink Floyd'],
  ['vintage radio video feed','video','vintage radio']
 ]){
  const value=intent(q);assert.equal(value?.kind,kind,q);assert.equal(value?.subject,subject,q);
 }
 for(const q of ['radio clubhouse kits','what is image recognition','video games history',
  'how do video feeds work','image generator','compare radio images and videos','what is a video game'])
  assert.equal(intent(q),null,q);
});
test('media-first loads images before overview while keeping overview and source results',async()=>{
 const f=fixture();
 f.respond(url=>url.hostname.includes('wikimedia')?{query:{pages:{
  12:{title:'File:Vintage radio',imageinfo:[{thumburl:'https://commons.wikimedia.org/image.png',descriptionurl:'https://commons.wikimedia.org/wiki/File:Vintage_radio',mime:'image/png'}]}
 }}}:{results:[]});
 f.search('images of radio clubhouse kits');await f.next();
 assert.equal(f.nodes.media.dataset.searchFocus,'image');
 assert.ok(f.parent.children.indexOf(f.nodes.media)<f.parent.children.indexOf(f.nodes.result));
 assert.ok(f.parent.children.indexOf(f.nodes.media)<f.parent.children.indexOf(f.nodes.webSearchResults));
 assert.match(f.nodes.mediaGrid.innerHTML,/Vintage radio/);
 assert.ok(f.calls.some(x=>x.hostname.includes('wikimedia')&&x.searchParams.get('gsrsearch')==='radio clubhouse kits'));
 assert.match(f.nodes.mediaGrid.innerHTML,/cardCollect/);
 f.search('helium atomic number');await f.next();
 assert.equal(f.nodes.media.dataset.searchFocus,undefined);
 assert.ok(f.parent.children.indexOf(f.nodes.media)>f.parent.children.indexOf(f.nodes.result));
});
test('video-first shows real playable Internet Archive iframe and never waits for AI text',async()=>{
 const f=fixture();
 f.respond(url=>url.hostname.includes('archive.org')?{response:{docs:[{identifier:'radio-film-1955',title:'Radio Workshop 1955'}]}}:{query:{pages:{}}});
 f.search('video feed radio workshop');await f.next();
 assert.equal(f.nodes.media.dataset.searchFocus,'video');
 assert.match(f.nodes.mediaGrid.innerHTML,/archive.org\/embed\/radio-film-1955/);
 assert.ok(f.parent.children.indexOf(f.nodes.media)<f.parent.children.indexOf(f.nodes.result));
 const count=f.calls.length;await f.window.loadMedia('video feed radio workshop');
 assert.equal(f.calls.length,count,'later overview completion must not refetch or replace priority feed');
});
test('stale video results cannot overwrite a newer image search',async()=>{
 const f=fixture();let release;
 f.respond(url=>url.hostname.includes('archive.org')?new Promise(resolve=>{release=()=>resolve({response:{docs:[{identifier:'late-video',title:'Late Video'}]}})}):{query:{pages:{1:{title:'File:Newer Image',imageinfo:[{thumburl:'https://commons.wikimedia.org/new.png',mime:'image/png'}]}}}});
 f.search('video feed antique radios');await f.next();
 f.search('images of radio kits');await f.next();
 assert.match(f.nodes.mediaGrid.innerHTML,/Newer Image/);
 release();await f.next();
 assert.doesNotMatch(f.nodes.mediaGrid.innerHTML,/Late Video/);
});

test('explicit image feed starts at Search click before asynchronous wallet token creation',async()=>{
 const f=fixture();
 f.respond(url=>url.hostname.includes('wikimedia')?{query:{pages:{1:{title:'File:Preflight kit',imageinfo:[{thumburl:'https://commons.wikimedia.org/kit.png',mime:'image/png'}]}}}}:{results:[]});
 f.preflight('images of radio clubhouse kit');await f.next();
 assert.equal(f.nodes.media.dataset.searchFocus,'image');
 assert.match(f.nodes.mediaGrid.innerHTML,/Preflight kit/);
 const count=f.calls.length;
 f.search('images of radio clubhouse kit');await f.next();
 assert.equal(f.calls.length,count,'later Brain search-start reuses the first feed');
});
