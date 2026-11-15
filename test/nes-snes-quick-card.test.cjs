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
 playerScript.runInNewContext(frame);
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
 script.runInNewContext(context);
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

test('reset and navigation never persist ROM bytes across documents',()=>{
 const player=source('nes-snes-player.html');
 const card=source('nes-snes-quick-card.js');
 assert.match(player,/reset\.addEventListener\('click',\(\)=>location\.reload\(\)\)/);
 assert.match(player,/URL\.revokeObjectURL\(currentBlob\)/);
 assert.match(card,/oracle:card-deactivated/);
 assert.doesNotMatch(player,/sessionStorage|localStorage|readAsDataURL/);
});


test('review: preview gate keeps the NES/SNES card out of public Oracle until explicitly requested',()=>{
 const html=source('index.html'),script=source('nes-snes-quick-card.js'),deck=source('oracle-card-deck.js');
 const css=source('oracle-card-deck.css');
 assert.match(html,/<section id="nesSnesQuickCard"[^>]*\shidden\b/);
 assert.match(script,/nesSnesPreview/);
 assert.match(script,/root\.hidden=false/);
 assert.match(deck,/entry\.node\.hidden/);
 assert.match(css,/\.oracle-card-deck-active:not\(\.oracle-shelf-open\) main\.app > :is\([^\n]*#nesSnesQuickCard/);
});

test('review: gateway allows same-origin player framing but does not weaken other routes',async()=>{
 const worker=source('workers/quantaphi-site/worker.js');
 const env={URL,Request,Response,Headers,AbortController,setTimeout,clearTimeout,fetch:async()=>new Response('<!doctype html><title>Game</title>',{status:200,headers:{'Content-Type':'text/html','X-Frame-Options':'DENY'}})};
 vm.createContext(env);
 vm.runInContext(worker.replace(/^import \{videoAPI\} from ['"]\.\/video-api\.mjs['"];?\s*/m,'').replace('export default','globalThis.worker='),env);
 const player=await env.worker.fetch(new Request('https://quantaphi.org/nes-snes-player.html'));
 assert.equal(player.headers.get('X-Frame-Options'),'SAMEORIGIN');
 const unrelated=await env.worker.fetch(new Request('https://quantaphi.org/unrelated-private.html'));
 assert.notEqual(unrelated.headers.get('X-Frame-Options'),'SAMEORIGIN');
});

test('review: two quick NES Play clicks while header read is pending initialize only once',async()=>{
 const script=new vm.Script(source('nes-snes-player.html').match(/<script>([\s\S]*?)<\/script>/)[1]);
 let resolveRead,objects=0,loaders=0;
 const read=new Promise(resolve=>{resolveRead=resolve});
 const file={name:'my-homebrew.nes',size:2048,slice:()=>({arrayBuffer:()=>read})};
 const callbacks={},controls={system:{value:'nes'},romFile:{files:[file]},play:{disabled:false},reset:{},status:{textContent:''}};
 for(const [id,el] of Object.entries(controls))el.addEventListener=(kind,fn)=>callbacks[id+':'+kind]=fn;
 const doc={getElementById:id=>controls[id],createElement:tag=>({tagName:tag}),body:{appendChild:()=>{loaders++}}};
 const win={addEventListener:()=>{}},url={createObjectURL:()=>{objects++;return 'blob:local'},revokeObjectURL:()=>{}};
 script.runInNewContext({document:doc,window:win,URL:url,Uint8Array,Set,location:{reload(){}}});
 const first=callbacks['play:click'](),second=callbacks['play:click']();
 resolveRead(new Uint8Array([0x4e,0x45,0x53,0x1a]).buffer);
 await Promise.all([first,second]);
 assert.equal(objects,1);
 assert.equal(loaders,1);
});


test('review: preview Share preserves its opt-in flag, and hidden emulator is stopped',()=>{
 const deck=source('oracle-card-deck.js'),card=source('nes-snes-quick-card.js');
 assert.match(deck,/displayed\.id==='nesSnesQuickCard'\?'&nesSnesPreview=1'/);
 assert.match(card,/quantaphi:switchboard-change/);
 assert.match(card,/oracle-shelf-open/);
 assert.match(card,/visibilitychange/);
 assert.match(card,/stop\(\)/);
});


test('review: a running preview emulator actually closes on switchboard change and hidden tab',()=>{
 const handlers={},elements={},frames=[];
 const button=id=>({disabled:false,addEventListener:(type,fn)=>{handlers[id+':'+type]=fn}});
 elements['#nesSnesLaunch']=button('launch');
 elements['#nesSnesStop']=button('stop');
 elements['#nesSnesPlayerSlot']={append:frame=>frames.push(frame),replaceChildren:()=>{}};
 elements['#nesSnesStatus']={textContent:''};
 const root={hidden:true,classList:{add(){}},querySelector:s=>elements[s],closest:()=>null};
 const doc={hidden:false,body:{classList:{contains:()=>false}},
  getElementById:id=>id==='nesSnesQuickCard'?root:null,
  createElement:tag=>{assert.equal(tag,'iframe');return {removed:false,setAttribute(){},addEventListener(){},remove(){this.removed=true}};},
  addEventListener:(name,fn)=>{handlers['document:'+name]=fn}};
 const win={location:{search:'?nesSnesPreview=1'},addEventListener:(name,fn)=>{handlers['window:'+name]=fn}};
 class MockObserver{constructor(fn){handlers.mutation=fn}observe(){}}
 new vm.Script(source('nes-snes-quick-card.js')).runInNewContext({document:doc,window:win,URLSearchParams,MutationObserver:MockObserver});
 assert.equal(root.hidden,false);
 handlers['launch:click']();
 assert.equal(frames.length,1);
 handlers['window:quantaphi:switchboard-change']({detail:{id:'another-card'}});
 assert.equal(frames[0].removed,true,'switching cards must remove the running player');
 handlers['launch:click']();
 doc.hidden=true;
 handlers['document:visibilitychange']();
 assert.equal(frames[1].removed,true,'hidden tab must stop audio');
 doc.hidden=false;
 handlers['launch:click']();
 handlers.mutation();
 assert.equal(frames[2].removed,true,'collapsed and inactive shelf must stop emulator');
});
