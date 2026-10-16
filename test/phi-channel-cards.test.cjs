'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),js=fs.readFileSync('phi-channel-cards.js','utf8'),css=fs.readFileSync('phi-channel-cards.css','utf8');
test('four inline Oracle channel windows replace HBO with Omni TV',()=>{
 assert.match(html,/id="phiChannelCards"/);
 assert.match(html,/\/phi-channel-cards\.js\?v=/);
 assert.match(html,/\/phi-channel-cards\.css\?v=/);
 assert.match(html,/StarQuest Omni TV Chiller ShopLC television cards/);
 assert.doesNotMatch(js,/name:'HBO'/);
 assert.doesNotMatch(js,/inPageSite|siteViewerFrame|channelphi-external/);
 for(const name of ['StarQuest','Omni TV','Chiller','ShopLC'])assert.ok(js.includes("name:'"+name+"'"));
 for(const slug of ['TV-Database','Chiller','ShopLC'])assert.ok(js.includes("tune:'"+slug+"'"));
 assert.match(css,/channelphi-frame/);assert.doesNotThrow(()=>new Function(js));
});
test('tapping a show window starts one in-card Omni TV remote; next tap stops old playback',()=>{
 class Element {
  constructor(tag){this.tagName=tag;this.children=[];this.attributes={};this.handlers={};this.hidden=false;this.className='';this.textContent='';this.classList={add:x=>this.className+=' '+x,remove:x=>this.className=this.className.replace(' '+x,'')};}
  appendChild(v){this.children.push(v);return v}
  append(...xs){xs.forEach(x=>this.appendChild(x))}
  setAttribute(k,v){this.attributes[k]=v}
  addEventListener(k,fn){this.handlers[k]=fn}
  click(){this.handlers.click?.()}
  replaceChildren(){this.children=[]}
  insertBefore(v,before){this.children.splice(this.children.indexOf(before),0,v)}
  focus(){this.focused=true}
 }
 const root=new Element('section'),document={
  getElementById:id=>id==='phiChannelCards'?root:null,
  createElement:tag=>new Element(tag),hidden:false,addEventListener:()=>{}
 };
 vm.runInNewContext(js,{document,console});
 const all=e=>[e,...e.children.flatMap(all)],cards=all(root).filter(x=>x.tagName==='article');
 assert.equal(cards.length,4);
 assert.equal(all(root).filter(x=>x.tagName==='iframe').length,0);
 const shop=cards.find(x=>x.attributes['aria-label']==='ShopLC channel');
 const star=cards.find(x=>x.attributes['aria-label']==='StarQuest channel');
 all(shop).find(x=>x.tagName==='button').click();
 let frames=all(root).filter(x=>x.tagName==='iframe');
 assert.equal(frames.length,1);
 assert.match(frames[0].src,/\/omni-tv\/\?embedded=1#ShopLC$/);
 all(star).find(x=>x.tagName==='button').click();
 frames=all(root).filter(x=>x.tagName==='iframe');
 assert.equal(frames.length,1);
 assert.match(frames[0].src,/#TV-Database$/);
 assert.equal(all(shop).find(x=>x.className==='channelphi-screen').hidden,false);
 all(star).filter(x=>x.tagName==='button').at(-1).click();
 assert.equal(all(root).filter(x=>x.tagName==='iframe').length,0);
});
test('Terra and Petra movie playback remains unchanged',()=>{
 const player=fs.readFileSync('halloween-phi.js','utf8');
 assert.match(player,/originalMediaUrl/);
 assert.match(player,/playsInline/);
 assert.match(player,/Watch at source/);
 assert.doesNotThrow(()=>new Function(player));
});