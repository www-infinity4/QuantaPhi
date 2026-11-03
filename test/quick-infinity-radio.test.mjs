import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const home=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const player=readFileSync(new URL('../quick-infinity-radio.js',import.meta.url),'utf8');

test('home loads a single lightweight radio mini-player and retains full station route',()=>{
  assert.equal((home.match(/<script src="\/quick-infinity-radio\.js/g)||[]).length,1);
  assert.match(player,/open\.href = '\/infinity-radio\/'/);
  assert.match(player,/anchor\.insertAdjacentElement\('afterend',bar\)/);
});

test('audio begins only on explicit Play; no autoplay and no speculative wallet credit',()=>{
  assert.match(player,/play\.addEventListener\('click'/);
  assert.match(player,/const request = audio\.play\(\)/);
  assert.doesNotMatch(player,/audio\.autoplay|autoplay\s*=\s*true/);
  assert.doesNotMatch(player,/(?:mint|credit|award)\s*\(/);
  assert.match(player,/audio\.preload = 'none'/);
});

test('player handles errors and continues playlist without background media preloading',()=>{
  assert.match(player,/audio\.addEventListener\('ended',advance\)/);
  assert.match(player,/audio\.addEventListener\('error'/);
  assert.match(player,/if \(\+\+failures > tracks\.length\)/);
  assert.match(player,/Playback unavailable/);
});

test('original cover has a known bundled image and fails gracefully',()=>{
  const deck=readFileSync(new URL('../oracle-card-deck.js',import.meta.url),'utf8');
  assert.match(deck,/infinityConcepts:\['Infinity Concepts'[^\n]+julius-balloon-001\.jpg/);
  assert.match(deck,/image\.addEventListener\('error',/);
  assert.match(deck,/header\.classList\.add\('oracle-cover-no-art'\)/);
});

function playerFixture(snapshotCount=129){
 const all=[],pending=[],events=[];
 const element=tag=>{
  const listeners=new Map(),attrs=new Map();
  const node={tagName:tag,children:[],paused:true,ended:false,
   append(...children){this.children.push(...children)},appendChild(child){this.append(child);return child},
   insertAdjacentElement(){},setAttribute(key,value){attrs.set(key,String(value))},
   getAttribute(key){return attrs.get(key)||this[key]||null},
   addEventListener(type,listener){listeners.set(type,listener)},
   emit(type){listeners.get(type)?.()},
   play(){this.paused=false;return new Promise((resolve,reject)=>pending.push({resolve,reject}))},
   pause(){this.paused=true;this.emit('pause')}
  };
  all.push(node);return node;
 };
 const anchor=element('details');anchor.id='qtraffic';
 const catalog=Array.from({length:129},(_,i)=>({title:'Catalog song '+(129-i),url:'https://archive.org/download/musopen-chopin/catalog-'+(129-i)+'.mp3'}));
 const stableCatalog=Array.from({length:snapshotCount},(_,i)=>({title:'Catalog song '+(snapshotCount-i),url:'https://archive.org/download/musopen-chopin/catalog-'+(snapshotCount-i)+'.mp3'}));
 const store=new Map();
 const document={head:element('head'),createElement:element,getElementById:id=>all.find(node=>node.id===id)||null};
 vm.runInNewContext(player,{document,URL,console,navigator:{},setInterval(){},
   window:{dispatchEvent(event){events.push(event)}},
   CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail}},
   localStorage:{getItem(key){return store.get(key)||null},setItem(key,value){store.set(key,value)}},
   fetch:async(url)=>({ok:true,json:async()=>({tracks:String(url).includes('raw.githubusercontent.com')?stableCatalog:catalog})})});
 return {audio:all.find(node=>node.tagName==='audio'),play:document.getElementById('irQuickPlay'),
  status:all.find(node=>node.className==='ir-quick-status'),next:document.getElementById('irQuickNext'),pending,store,events};
}

const catalogReady=async()=>{await new Promise(resolve=>setImmediate(resolve))};
test('delayed media events cannot restart playback after a person presses Pause',async()=>{
 const f=playerFixture();await catalogReady();
 assert.equal(f.pending.length,0);
 f.play.emit('click');f.pending[0].resolve();
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.play.getAttribute('aria-pressed'),'true');
 const pausedSource=f.audio.src;
 f.play.emit('click');
 assert.equal(f.audio.paused,true);
 for(const event of ['error','ended','playing'])f.audio.emit(event);
 assert.equal(f.pending.length,1,'late source errors and ended events must not call play again');
 assert.equal(f.audio.src,pausedSource);
 assert.equal(f.play.getAttribute('aria-pressed'),'false');
 assert.match(f.status.textContent,/Paused/);
 f.play.emit('click');
 assert.equal(f.pending.length,2,'an explicit Play still resumes the station');
 f.pending[1].resolve();await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.play.getAttribute('aria-pressed'),'true');
});

test('Pause also cancels a pending connection and ignores its late play result',async()=>{
 const f=playerFixture();await catalogReady();
 f.play.emit('click');f.play.emit('click');
 f.pending[0].resolve();await new Promise(resolve=>setImmediate(resolve));
 f.audio.emit('error');
 assert.equal(f.pending.length,1);
 assert.equal(f.audio.paused,true);
 assert.equal(f.play.getAttribute('aria-pressed'),'false');
 assert.match(f.status.textContent,/Paused/);
});

test('full catalog is loaded, visible and newest song plays first, not old four-song fallback',async()=>{
 const f=playerFixture();
 await catalogReady();
 assert.equal(f.play.disabled,false,'play must become available after catalog fetch');
 assert.match(f.status.textContent,/129 songs · newest first/);
 assert.equal(JSON.parse(f.store.get('infinityRadio:quickFullCatalog:v1')).length,129);
 f.play.emit('click');
 assert.match(f.audio.src,/catalog-129\.mp3$/);
 f.pending[0].resolve();await catalogReady();
 f.audio.emit('ended');
 assert.match(f.audio.src,/catalog-128\.mp3$/);
 assert.equal(f.pending.length,2);
});

test('next control moves forward in full catalog and remains paused after manual Pause',async()=>{
 const f=playerFixture();await catalogReady();
 f.play.emit('click');f.pending[0].resolve();await catalogReady();
 f.next.emit('click');
 assert.match(f.audio.src,/catalog-128\.mp3$/);
 f.pending[1].resolve();await catalogReady();
 f.play.emit('click');f.audio.emit('ended');f.audio.emit('error');
 assert.equal(f.audio.paused,true);
 assert.equal(f.pending.length,2);
 assert.match(f.status.textContent,/Paused/);
});

test('stale public 129-song catalog is supplemented by verified 274-song bootstrap',async()=>{
 const f=playerFixture(274);await catalogReady();
 assert.equal(f.play.disabled,false);
 assert.match(f.status.textContent,/274 songs · newest first/);
 assert.equal(JSON.parse(f.store.get('infinityRadio:quickFullCatalog:v1')).length,274);
 f.play.emit('click');
 assert.match(f.audio.src,/catalog-274\.mp3$/);
});

test('homepage radio offers load same approved album shelf and style as full station',()=>{
 assert.match(home,/\/infinity-radio\/radio-album-offers\.css\?v=/);
 assert.match(home,/\/infinity-radio\/radio-album-offers\.js\?v=/);
 assert.equal((home.match(/\/infinity-radio\/radio-album-offers\.js\?v=/g)||[]).length,1);
});
test('a verified play notifies album offers, but pause and delayed results do not fabricate a new track',async()=>{
 const f=playerFixture();await catalogReady();
 f.play.emit('click');
 assert.equal(f.events.filter(x=>x.type==='infinityradio:track-start').length,0);
 f.pending[0].resolve();await catalogReady();
 const starts=f.events.filter(x=>x.type==='infinityradio:track-start');
 assert.equal(starts.length,1);
 assert.match(starts[0].detail.track.title,/Catalog song 129/);
 f.play.emit('click');
 f.audio.emit('error');
 f.audio.emit('ended');
 assert.equal(f.events.filter(x=>x.type==='infinityradio:track-start').length,1);
});
