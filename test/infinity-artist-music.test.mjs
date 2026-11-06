import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('artist music uses one page-level dock and no per-card iframe or outbound music links',()=>{
 const home=read('index.html'), steve=read('steve-miller-book-of-dreams.js'), rock=read('classic-rock-official-card.mjs');
 assert.match(home,/infinity-artist-music\.js/);
 assert.match(steve,/InfinityArtistMusic/);
 assert.match(steve,/music\.toggle\('steve-miller'\)/);
 assert.match(rock,/InfinityArtistMusic\?\.toggle/);
 assert.doesNotMatch(steve,/target\s*=\s*['_"]_blank|new yt\.Player|smb-player-frame|oracle:card-deactivated/);
 assert.doesNotMatch(rock,/artistLink\.href\s*=|artistLink\.target\s*=|window\.open\(/);
});
test('common player uses YouTube-visible, persistent, accessible controls and explicit play gesture',()=>{
 const js=read('infinity-artist-music.js');
 assert.match(js,/width:220px;height:220px/);
 assert.match(js,/position:fixed/);
 assert.match(js,/new YT\.Player/);
 assert.match(js,/aria-pressed/);
 assert.match(js,/infinity:music-focus/);
 assert.match(js,/visibilitychange/);
 assert.doesNotMatch(js,/display:none[^;]*iframe|\.mp3|\.mp4|youtube-dl|window\.open\(/);
});
test('all six artist selections are mapped to verified official video IDs',()=>{
 const js=read('infinity-artist-music.js');
 for(const id of ['D6KCZXzLdVM','K6qj09OHvjw','wJzNZ1c5C9c','T_Km11HNzUY','VcjzHMhBtf0','e5MAg_yWsq8'])
  assert.ok(js.includes(id),id+' absent');
});
test('radio yields to artist selection and artist yields to radio selection',()=>{
 const js=read('quick-infinity-radio.js');
 assert.match(js,/infinity:music-focus/);
 assert.match(js,/player:\s*'radio'/);
 assert.match(js,/audio\.pause\(\)/);
});

test('shared player survives carousel switching and pauses for Infinity Radio without redirecting',async()=>{
 const node=tag=>({
  tag,children:[],attributes:{},handlers:{},
  append(...children){this.children.push(...children)},
  appendChild(child){this.children.push(child)},
  setAttribute(name,value){this.attributes[name]=value},
  addEventListener(name,handler){this.handlers[name]=handler}
 });
 const document={
  hidden:false,head:node('head'),body:node('body'),handlers:{},
  createElement:node,addEventListener(name,handler){this.handlers[name]=handler}
 };
 const window={
  location:{origin:'https://quantaphi.org'},handlers:{},
  addEventListener(name,handler){this.handlers[name]=handler},
  dispatchEvent(event){this.handlers[event.type]?.(event)},
  YT:{PlayerState:{PLAYING:1,PAUSED:2,ENDED:0}}
 };
 const events=[],loads=[];
 class FakePlayer{
  constructor(host,options){
   assert.equal(host,'infinityArtistMediaFrame');
   this.handlers=options.events;
   Promise.resolve().then(()=>this.handlers.onReady());
  }
  getIframe(){return node('iframe')}
  loadPlaylist(payload){loads.push(payload.list);this.playVideo()}
  loadVideoById(videoId){loads.push(videoId);this.playVideo()}
  playVideo(){events.push('play');this.handlers.onStateChange({data:1})}
  pauseVideo(){events.push('pause');this.handlers.onStateChange({data:2})}
  stopVideo(){events.push('stop');this.handlers.onStateChange({data:0})}
 }
 window.YT.Player=FakePlayer;
 const CustomEvent=function(type,options){this.type=type;this.detail=options.detail};
 vm.runInNewContext(read('infinity-artist-music.js'),{window,document,CustomEvent,console,Promise});
 assert.equal(document.body.children.length,0,'no media loaded before a user tap');
 window.InfinityArtistMusic.toggle('steve-miller');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(loads[0],'PL8a8cutYP7foGH0YDM8YtNqGtgL0EAJ7k');
 assert.equal(window.InfinityArtistMusic.isPlaying(),true);
 assert.equal(document.body.children.length,1,'one player dock is created');
 assert.equal(document.handlers['oracle:card-deactivated'],undefined,'card switching cannot pause playback');
 window.InfinityArtistMusic.toggle('pink-floyd');
 assert.equal(loads.at(-1),'K6qj09OHvjw');
 assert.equal(document.body.children.length,1,'band changes reuse the dock');
 window.InfinityArtistMusic.toggle('pink-floyd');
 assert.equal(window.InfinityArtistMusic.isPlaying(),false,'second tap pauses');
 window.InfinityArtistMusic.toggle('pink-floyd');
 assert.equal(window.InfinityArtistMusic.isPlaying(),true,'third tap resumes');
 window.dispatchEvent(new CustomEvent('infinity:music-focus',{detail:{player:'radio'}}));
 assert.equal(window.InfinityArtistMusic.isPlaying(),false,'Infinity Radio takes audio focus');
 assert.ok(events.includes('pause'));
});
