'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const source=path=>fs.readFileSync(path,'utf8');

test('NES/SNES lives in the original Oracle Quick Card deck and has a direct spotlight route',()=>{
 const html=source('index.html'),deck=source('oracle-card-deck.js');
 assert.match(html,/<section id="nesSnesQuickCard"[^>]*>/);
 assert.match(html,/\/nes-snes-quick-card\.js\?v=/);
 assert.match(html,/\/nes-snes-quick-card\.css\?v=/);
 assert.match(deck,/\['nesSnesQuickCard','NES \/ SNES/);
 assert.match(deck,/nesSnesQuickCard:\['nes-snes-player','Games'/);
 assert.match(deck,/nes:'nesSnesQuickCard'/);
});

test('the original Quick Card starts only on an explicit click and stops on Oracle navigation',()=>{
 const js=source('nes-snes-quick-card.js');
 assert.doesNotThrow(()=>new vm.Script(js));
 assert.match(js,/getElementById\('nesSnesQuickCard'\)/);
 assert.match(js,/addEventListener\('click'/);
 assert.match(js,/createElement\('iframe'\)/);
 assert.match(js,/nes-snes-player\.html/);
 assert.match(js,/oracle:card-deactivated/);
 assert.match(js,/frame\.remove\(\)/);
 assert.doesNotMatch(js,/archive\.org\/download|romsgames\.com|mint|STARCOIN|StarCoin/);
});

test('NES/SNES local file player accepts only owned .nes, .sfc or .smc files and never uploads ROMs',()=>{
 const html=source('nes-snes-player.html');
 assert.match(html,/type="file"[^>]*accept="\.nes,\.sfc,\.smc"/);
 assert.match(html,/new Set\(\['nes','snes'\]\)/);
 assert.match(html,/URL\.createObjectURL\(file\)/);
 assert.match(html,/EJS_gameUrl/);
 assert.match(html,/EJS_pathtodata/);
 assert.match(html,/cdn\.emulatorjs\.org\/stable\/data\//);
 assert.match(html,/EJS_onGameStart/);
 assert.match(html,/NES\\x1a|0x4e/);
 assert.doesNotMatch(html,/fetch\(|XMLHttpRequest|localStorage|sessionStorage|checkout|StarCoin|Coin\b/);
});

test('mobile player and source art stay within the card with readable controls',()=>{
 const css=source('nes-snes-quick-card.css');
 const card=source('nes-snes-quick-card.js');
 const hero=source('assets/nes-snes-card.svg');
 assert.match(css,/min-height:48px/);
 assert.match(css,/@media\(max-width:420px\)/);
 assert.match(card,/assets\/nes-snes-card\.svg/);
 assert.match(hero,/<svg/);
 assert.match(card,/aria-label/);
});

test('NES/SNES player inline script parses and does not load a core before a user file selection',async()=>{
 const html=source('nes-snes-player.html');
 const match=html.match(/<script>([\s\S]*?)<\/script>/);
 assert.ok(match,'inline controller script');
 const playerScript=new vm.Script(match[1]);
 const callbacks={};
 const elements={};
 for(const id of ['system','romFile','play','reset','status']){
  elements[id]={value:id==='system'?'nes':'',files:[],disabled:false,textContent:'',
   addEventListener:(kind,cb)=>{callbacks[id+':'+kind]=cb;}};
 }
 const appended=[];
 const frame={document:{
  getElementById:id=>elements[id],
  createElement:tag=>({tagName:tag,src:'',referrerPolicy:'',onerror:null}),
  body:{appendChild:el=>appended.push(el)}
 },window:{addEventListener:()=>{}},location:{reload:()=>{}},
 URL:{createObjectURL:()=>{throw Error('Unexpected blob before valid selection')},revokeObjectURL:()=>{}},
 Uint8Array,Set};
 vm.runInNewContext(playerScript,frame);
 assert.equal(appended.length,0,'no emulator loader before a ROM and a play click');
 await callbacks['play:click']();
 assert.match(elements.status.textContent,/Choose a compatible/);
 assert.equal(appended.length,0);
});

test('valid user-provided NES file starts the correct emulator configuration, without a network upload',async()=>{
 const html=source('nes-snes-player.html');
 const script=new vm.Script(html.match(/<script>([\s\S]*?)<\/script>/)[1]);
 const callbacks={};const appended=[];const core={};
 const file={name:'owner-homebrew.nes',size:1024,slice:()=>({arrayBuffer:async()=>new Uint8Array([0x4e,0x45,0x53,0x1a]).buffer})};
 const controls={system:{value:'nes'},romFile:{files:[file]},play:{disabled:false},reset:{},status:{textContent:''}};
 for(const [id,el] of Object.entries(controls))el.addEventListener=(kind,cb)=>callbacks[id+':'+kind]=cb;
 const objUrl={createObjectURL:item=>{assert.equal(item,file);return 'blob:owned-game'},revokeObjectURL:()=>{}};
 const doc={getElementById:id=>controls[id],createElement:tag=>({tagName:tag}),body:{appendChild:s=>appended.push(s)}};
 const win={addEventListener:()=>{}};
 const context={document:doc,window:win,location:{reload:()=>{}},URL:objUrl,Uint8Array,Set};
 vm.runInNewContext(script,context);
 await callbacks['play:click']();
 assert.equal(controls.play.disabled,true);
 assert.equal(win.EJS_core,'nes');
 assert.equal(win.EJS_gameUrl,'blob:owned-game');
 assert.equal(appended.length,1);
 assert.equal(appended[0].src,'https://cdn.emulatorjs.org/stable/data/loader.js');
 assert.match(controls.status.textContent,/not started yet/);
 win.EJS_onGameStart();
 assert.match(controls.status.textContent,/Game started/);
});
