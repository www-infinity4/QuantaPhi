import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const script=()=>readFileSync(new URL('../news-phi-continuous-audio.js',import.meta.url),'utf8');
const html=()=>readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('homepage loads News Phi navigation after the single Infinity Radio player',()=>{
 const h=html();
 assert.equal((h.match(/src="\/quick-infinity-radio\.js/g)||[]).length,1);
 assert.equal((h.match(/src="\/news-phi-continuous-audio\.js/g)||[]).length,1);
 assert.ok(h.indexOf('quick-infinity-radio.js') < h.indexOf('news-phi-continuous-audio.js'));
});

function fixture(){
 const nodes=[];
 class Node {
  constructor(tag){this.tagName=tag;this.children=[];this.listeners={};this.attributes={};this.disabled=false;nodes.push(this)}
  append(...children){this.children.push(...children)}
  appendChild(child){this.children.push(child);return child}
  setAttribute(k,v){this.attributes[k]=String(v)}
  getAttribute(k){return this.attributes[k]??null}
  addEventListener(k,cb){(this.listeners[k]??=[]).push(cb)}
  emit(k){for(const cb of this.listeners[k]??[])cb({type:k})}
  click(){this.emit('click')}
  showModal(){this.open=true}
  close(){this.open=false;this.emit('close')}
 }
 const radio=new Node('button');radio.attributes['aria-pressed']='true';radio.id='irQuickPlay';
 const next=new Node('button');next.id='irQuickNext';
 const status=new Node('span');status.className='ir-quick-status';status.textContent='Playing song';
 const audio=new Node('audio');let pauseCalls=0;audio.pause=()=>{pauseCalls++};
 let radioClicks=0,nextClicks=0;
 radio.addEventListener('click',()=>{radioClicks++;radio.attributes['aria-pressed']=radio.attributes['aria-pressed']==='true'?'false':'true'});
 next.addEventListener('click',()=>nextClicks++);
 const byId=new Map([[radio.id,radio],[next.id,next]]);
 const listeners={};
 const doc={body:new Node('body'),createElement:tag=>new Node(tag),getElementById:id=>byId.get(id)||null,
  querySelector:sel=>sel==='#infinityRadioQuick .ir-quick-status'?status:null,
  addEventListener:(type,listener)=>{listeners[type]=listener}};
 const window={location:{href:'https://quantaphi.org/',origin:'https://quantaphi.org'}};
 class MutationObserver {observe(){}disconnect(){}}
 vm.runInNewContext(script(),{document:doc,window,URL,MutationObserver});
 function navigate(raw,{ctrlKey=false,button=0,target='_self',download=false}={}){
  const anchor={href:new URL(raw,window.location.href).href,target,
   getAttribute:k=>k==='href'?raw:null,hasAttribute:k=>k==='download'&&download};
  const event={target:{closest:()=>anchor},defaultPrevented:false,button,ctrlKey,metaKey:false,altKey:false,shiftKey:false,
   preventDefault(){this.defaultPrevented=true}};
  listeners.click(event);return event;
 }
 const find=tag=>nodes.filter(n=>n.tagName===tag);
 return {find,navigate,radio,next,audio,byId,get pauseCalls(){return pauseCalls},get radioClicks(){return radioClicks},get nextClicks(){return nextClicks}};
}

test('News Phi opens within current page without pausing or replacing radio audio',()=>{
 const f=fixture();
 const e=f.navigate('/newsroom/index.html');
 assert.equal(e.defaultPrevented,true);
 const d=f.find('dialog')[0], frame=f.find('iframe')[0];
 assert.equal(d.open,true);
 assert.equal(new URL(frame.src,'https://quantaphi.org').pathname,'/newsroom/index.html');
 assert.equal(f.pauseCalls,0);
 assert.equal(f.radio.getAttribute('aria-pressed'),'true');
 f.navigate('https://www-infinity4.github.io/News-Phi/');
 assert.equal(frame.src,'https://www-infinity4.github.io/News-Phi/');
 assert.equal(f.find('dialog').length,1,'reuse one news viewer');
 assert.equal(f.pauseCalls,0);
});

test('reader play and next buttons control the one home audio element',()=>{
 const f=fixture();f.navigate('/newsroom/index.html');
 const buttons=f.find('button');
 const play=buttons.find(x=>x.getAttribute('aria-label')==='Play or pause Infinity Radio');
 const next=buttons.find(x=>x.getAttribute('aria-label')==='Next Infinity Radio song');
 assert.ok(play);assert.ok(next);
 play.click();next.click();
 assert.equal(f.radioClicks,1);
 assert.equal(f.nextClicks,1);
 assert.equal(f.pauseCalls,0,'view itself never stops or resets audio');
});

test('modified clicks and unrelated links keep normal browser navigation',()=>{
 const f=fixture();
 assert.equal(f.navigate('/newsroom/index.html',{ctrlKey:true}).defaultPrevented,false);
 assert.equal(f.navigate('/newsroom/index.html',{target:'_blank'}).defaultPrevented,false);
 assert.equal(f.navigate('/newsroom/index.html',{download:true}).defaultPrevented,false);
 assert.equal(f.navigate('/about.html').defaultPrevented,false);
 assert.equal(f.navigate('https://unrelated.example/').defaultPrevented,false);
 assert.equal(f.find('dialog').length,0);
});

test('close releases News iframe but not Infinity Radio',()=>{
 const f=fixture();f.navigate('/news-phi/');
 f.find('dialog')[0].close();
 assert.equal(f.find('iframe')[0].src,'about:blank');
 assert.equal(f.pauseCalls,0);
});
