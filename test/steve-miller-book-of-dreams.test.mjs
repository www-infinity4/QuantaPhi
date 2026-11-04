import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('Steve Miller remains an original Oracle Quick Card beside the 21 plus shelf',()=>{
 const html=read('index.html'),deck=read('oracle-card-deck.js');
 assert.match(html,/id="infinityAdultContentCard"[\s\S]*?id="steveMillerBookOfDreamsCard"[\s\S]*?id="bruceBannerWeedmapsCard"/);
 assert.match(html,/infinity-artist-music\.js[\s\S]*?steve-miller-book-of-dreams\.js/);
 assert.match(deck,/\['steveMillerBookOfDreamsCard','Steve Miller · Book of Dreams'\]/);
});
test('one 48px Infinity Radio style button with no autoplay, viewer, or external music navigation',()=>{
 const src=read('steve-miller-book-of-dreams.js');
 assert.match(src,/width:48px;height:48px/);
 assert.match(src,/button\.id='smbAlbumPlay'/);
 assert.match(src,/InfinityArtistMusic\.toggle\('steve-miller'\)/);
 assert.match(src,/aria-pressed/);
 assert.doesNotMatch(src,/new yt\.Player|iframe|window\.open|target\s*=|autoplay|oracle:card-deactivated/);
 assert.doesNotMatch(src,/MusicQuant|StarCoin|wallet\.debit/);
});
test('a tap requests the artist; changing cards never pauses it and actual state controls labels',()=>{
 class Node{
  constructor(){this.dataset={};this.classList={};this.children=[];this.attributes={};this.handlers={}}
  append(...children){this.children.push(...children)}
  appendChild(child){this.children.push(child)}
  setAttribute(name,value){this.attributes[name]=value}
  addEventListener(name,fn){(this.handlers[name]??=[]).push(fn)}
  emit(name,detail){for(const fn of this.handlers[name]??[])fn({detail})}
 }
 const root=new Node();root.id='steveMillerBookOfDreamsCard';
 const doc=new Node();doc.head=new Node();doc.createElement=()=>new Node();
 doc.getElementById=id=>id===root.id?root:null;
 const win=new Node();let selected=null;
 win.InfinityArtistMusic={toggle:id=>selected=id};
 new Function('document','window',read('steve-miller-book-of-dreams.js'))(doc,win);
 const button=root.children[1].children[0];
 assert.equal(selected,null,'no autoplay on mount');
 button.emit('click');assert.equal(selected,'steve-miller');
 win.emit('infinity:artist-state',{id:'steve-miller',playing:true,status:'Playing'});
 assert.equal(button.attributes['aria-pressed'],'true');
 assert.equal(button.textContent,'Ⅱ');
 win.emit('infinity:artist-state',{id:'steve-miller',playing:false,status:'Paused'});
 assert.equal(button.attributes['aria-pressed'],'false');
 assert.equal(button.textContent,'▶');
});
