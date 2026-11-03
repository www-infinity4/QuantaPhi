import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=()=>readFileSync(new URL('../steve-miller-book-of-dreams.js',import.meta.url),'utf8');
const html=()=>readFileSync(new URL('../index.html',import.meta.url),'utf8');
const deck=()=>readFileSync(new URL('../oracle-card-deck.js',import.meta.url),'utf8');

test('Book of Dreams has its own adjacent original Oracle Quick Card',()=>{
 assert.match(html(),/id="infinityAdultContentCard"[\s\S]*?id="steveMillerBookOfDreamsCard"[\s\S]*?id="bruceBannerWeedmapsCard"/);
 assert.match(html(),/steve-miller-book-of-dreams\.js/);
 assert.match(deck(),/\['steveMillerBookOfDreamsCard','Steve Miller · Book of Dreams'\]/);
 assert.match(deck(),/steveMillerBookOfDreamsCard:\['steve-miller-book-of-dreams','Music'/);
});

test('the user-facing player uses a full YouTube album playlist, with direct fallback',()=>{
 const script=source();
 assert.match(script,/PL8a8cutYP7foGH0YDM8YtNqGtgL0EAJ7k/);
 assert.match(script,/D6KCZXzLdVM/);
 assert.match(script,/https:\/\/www\.youtube\.com\/playlist\?list=/);
 assert.match(script,/www\.youtube\.com\/iframe_api/);
 assert.match(script,/new yt\.Player/);
 assert.doesNotMatch(script,/\.mp3|audio\.src|youtube-dl/);
});

test('round button has Infinity Radio play and pause appearance and truthful state',()=>{
 const script=source();
 assert.match(script,/width:48px;height:48px/);
 assert.match(script,/button\.textContent = playing \? 'Ⅱ' : '▶'/);
 assert.match(script,/aria-pressed/);
 assert.match(script,/player\.pauseVideo\(\)/);
 assert.match(script,/player\.playVideo\(\)/);
});

test('autoplay attempts occur only when active; switching away stops playback',()=>{
 const script=source();
 assert.match(script,/oracle:activate/);
 assert.match(script,/oracle:card-deactivated/);
 assert.match(script,/function isActive\(\)/);
 assert.match(script,/document\.hidden/);
 assert.match(script,/Autoplay blocked/);
 assert.doesNotMatch(script,/MusicQuant|StarCoin|wallet\.debit/);
});

test('mock YouTube player starts only in the displayed card, pauses and resumes, and stops on navigation',async()=>{
 const eventRoot=new Map();
 class Node {
  constructor(tag='div'){
   this.tagName=tag;this.dataset={};this.isConnected=true;this.children=[];this.attributes={};
   this.classList={add(){}};this.active=false;
  }
  append(...kids){this.children.push(...kids)}
  appendChild(child){this.children.push(child)}
  remove(){this.removed=true}
  setAttribute(key,val){this.attributes[key]=val}
  addEventListener(key,handler){if(!this.handlers)this.handlers={};(this.handlers[key]??=[]).push(handler)}
  emit(key,detail){(this.handlers?.[key]||[]).forEach(handler=>handler({detail}))}
  closest(selector){return selector==='#oracleCardStage'&&this.active?{}:null}
 }
 const root=new Node();root.id='steveMillerBookOfDreamsCard';
 const document=new Node();document.hidden=false;document.head=new Node('head');
 document.createElement=tag=>new Node(tag);
 document.getElementById=id=>id===root.id?root:null;
 let playCalls=0,pauseCalls=0,configuration;
 class FakePlayer {
  constructor(id,options){
   assert.equal(id,'smbAlbumYoutubeMount');
   configuration=options;this.events=options.events;
   queueMicrotask(()=>this.events.onReady());
  }
  playVideo(){playCalls++;this.events.onStateChange({data:1})}
  pauseVideo(){pauseCalls++;this.events.onStateChange({data:2})}
  getIframe(){return new Node('iframe')}
 }
 const window={
  YT:{Player:FakePlayer,PlayerState:{PLAYING:1,PAUSED:2,ENDED:0}},
  location:{origin:'https://quantaphi.org'},
  setTimeout(fn){fn()}
 };
 const evaluate=new Function('document','window','console',source());
 evaluate(document,window,{warn(){}});
 assert.equal(playCalls,0,'never autoplay a hidden or unselected card');
 root.active=true;root.emit('oracle:activate');
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(configuration.videoId,'D6KCZXzLdVM');
 assert.equal(configuration.playerVars.list,'PL8a8cutYP7foGH0YDM8YtNqGtgL0EAJ7k');
 assert.equal(playCalls,1,'autoplay attempt on card activation');
 const button=root.children[2].children[0];
 assert.equal(button.attributes['aria-pressed'],'true');
 button.emit('click');
 assert.equal(pauseCalls,1);
 assert.equal(button.attributes['aria-pressed'],'false');
 button.emit('click');
 assert.equal(playCalls,2);
 document.emit('oracle:card-deactivated',{id:root.id});
 assert.equal(pauseCalls,2);
 assert.equal(button.attributes['aria-pressed'],'false');
});
