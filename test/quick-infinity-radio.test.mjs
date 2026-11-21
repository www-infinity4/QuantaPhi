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
  assert.match(player,/audio\.addEventListener\('ended',\(\)=>advance\('ended'\)\)/);
  assert.match(player,/audio\.addEventListener\('error'/);
  assert.match(player,/if \(\+\+failures >= Math\.min\(5,tracks\.length\)\)/);
  assert.match(player,/unavailableSources\.add/);
  assert.match(player,/Tap Play again to allow audio/);
});

test('original cover has a known bundled image and fails gracefully',()=>{
  const deck=readFileSync(new URL('../oracle-card-deck.js',import.meta.url),'utf8');
  assert.match(deck,/infinityConcepts:\['Infinity Concepts'[^\n]+julius-balloon-001\.jpg/);
  assert.match(deck,/image\.addEventListener\('error',/);
  assert.match(deck,/header\.classList\.add\('oracle-cover-no-art'\)/);
});

function playerFixture(snapshotCount=129){
 const all=[],pending=[];
 const element=tag=>{
  const listeners=new Map(),attrs=new Map();
  const node={tagName:tag,children:[],paused:true,ended:false,
   append(...children){this.children.push(...children)},appendChild(child){this.append(child);return child},
   insertAdjacentElement(){},setAttribute(key,value){attrs.set(key,String(value))},
   getAttribute(key){return attrs.get(key)||this[key]||null},
   addEventListener(type,listener){listeners.set(type,listener)},
   emit(type,event={preventDefault(){}}){listeners.get(type)?.(event)},
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
   localStorage:{getItem(key){return store.get(key)||null},setItem(key,value){store.set(key,value)}},
   fetch:async(url)=>({ok:true,json:async()=>({tracks:String(url).includes('raw.githubusercontent.com')?stableCatalog:catalog})})});
 return {audio:all.find(node=>node.tagName==='audio'),play:document.getElementById('irQuickPlay'),
  status:all.find(node=>node.className==='ir-quick-status'),next:document.getElementById('irQuickNext'),search:document.getElementById('irQuickSearch'),searchInput:document.getElementById('irQuickQuery'),pending,store};
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
 assert.ok(f.audio.src.endsWith('/catalog-128.mp3'),'matched track must load the existing in-card audio source');
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

test('Search & Listen plays a matching verified catalog song inside the existing card',async()=>{
 const f=playerFixture();await catalogReady();
 assert.ok(f.search,'search form should be mounted in the radio card');
 assert.ok(f.searchInput,'radio search input should be mounted in the card');
 f.searchInput.value='catalog song 128';
 f.search.emit('submit');
 assert.ok(f.audio.src.endsWith('/catalog-128.mp3'),'searched song must play in the same audio element');
 assert.equal(f.pending.length,1,'the radio must attempt one in-card audio play');
 assert.ok(!player.includes('youtube.com/results'),'search should not redirect to YouTube');
});

test('Search & Listen never opens YouTube or starts playback when no verified song matches',async()=>{
 const f=playerFixture();await catalogReady();
 f.searchInput.value='an unavailable band';
 f.search.emit('submit');
 assert.equal(f.pending.length,0,'no fabricated result should start audio');
 assert.match(f.status.textContent,/not found|not in/i);
 assert.equal(f.play.getAttribute('aria-pressed'),'false');
});
