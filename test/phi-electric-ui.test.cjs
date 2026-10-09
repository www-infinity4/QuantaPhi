'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');

test('electric styling loads after shared styles and keeps red yellow blue orange purple and white cards',()=>{
 const html=read('index.html'),style=read('phi-electric-theme.css');
 assert.ok(html.indexOf('phi-card-controls.css')<html.indexOf('phi-electric-theme.css'));
 for(const sector of ['Red','Yellow','Blue','Orange','Purple'])assert.match(style,new RegExp('\\.qzone'+sector+'\\b'));
 for(const selector of ['#infiniteBook .ib-story','#phiImageBuilder .pi-panel','#fredSpacesRadio .fs-card','.mcard.imageCard','.mcard.videoCard','.mcard.soundCard','.qtop .qmenuBtn','.qmenu:not([hidden])'])assert.ok(style.includes(selector),selector);
 assert.match(style,/prefers-reduced-motion:reduce/);
 assert.match(style,/:focus-visible/);
});

test('new search lives in the upper right and clears just search view, not wallet or quant',()=>{
 const html=read('index.html'),script=read('phi-page-ui.js'),elems=new Map(),handlers=new Map(),invoked=[];
 for(const id of ['q','go','qNewSearch','qrefine','qrefineWrap','result','status','media','mediaGrid','qmenu']){
  const e={value:'used',hidden:false,textContent:'text',addEventListener:(event,cb)=>handlers.set(id+':'+event,cb),focus:()=>invoked.push('focus'),replaceChildren:()=>invoked.push('clear-media'),click:()=>invoked.push('search-click')};
  elems.set(id,e);
 }
 const location={href:'https://quantaphi.org/?q=bitcoin&story=one&foo=keep#result'};
 const history={state:null,replaceState:(_a,_b,url)=>{location.href=url;invoked.push('history')}};
 const document={getElementById:id=>elems.get(id)};
 const window={scrollTo:()=>invoked.push('scroll'),matchMedia:()=>({matches:true})};
 vm.runInNewContext(script,{document,location,history,window,URL},{timeout:1000});
 assert.ok(html.indexOf('id="qNewSearch"')<html.indexOf('id="qinfinity"'));
 assert.ok(html.includes('/phi-page-ui.js?'));
 handlers.get('qNewSearch:click')();
 assert.equal(elems.get('q').value,'');
 assert.equal(elems.get('result').hidden,true);
 assert.equal(elems.get('media').hidden,true);
 assert.equal(new URL(location.href).searchParams.get('foo'),'keep');
 assert.equal(new URL(location.href).searchParams.get('q'),null);
 assert.ok(invoked.includes('focus'));
 assert.ok(!invoked.includes('search-click'),'new search must not mint or run a search');
});

test('Fred player opens actual X replay, hides internal slot, and presents interactive topic choices',()=>{
 const js=read('fred-spaces-radio.js'),css=read('fred-spaces-radio.css');
 assert.doesNotThrow(()=>new vm.Script(js));
 assert.match(js,/node\("a","fs-play","▶"\)/);
 assert.match(js,/play\.href=active\.source/);
 assert.match(js,/play\.target="_blank"/);
 assert.match(js,/audio is simulated|No simulated audio/);
 assert.doesNotMatch(js,/node\("strong","fs-number"/);
 assert.match(js,/for\(const tag of active\.tags\)/);
 assert.match(js,/\["search","build","learn"\]/);
 for(const tool of ['QuantaPhi','InfinityPhi','OmniPhi'])assert.ok(js.includes(tool));
 assert.match(css,/\.fs-play/);
 assert.match(css,/\.fs-player-track/);
});

test('Fred next card requires user consent and a verified direct X Spaces link; ledger is authoritative',()=>{
 const js=read('fred-spaces-radio.js');
 assert.match(js,/function isReplayLink\(episode\)/);
 assert.match(js,/episodes\.filter\(e=>isReplayLink\(e\)\)/);
 assert.match(js,/available\.filter\(e=>!old\.has\(e\.id\)\)/);
 assert.match(js,/!unlocked\.has\(next\.id\)&&!window\.confirm/);
 assert.match(js,/ledger\("\/v1\/spaces\/unlock","POST",\{episodeId:next\.id\}\)/);
 assert.match(js,/Buy next curated episode · 1 ★/);
 assert.match(js,/X may require sign-in or may not offer playback/);
 assert.match(js,/data\.charged===1/);
 assert.doesNotMatch(js,/if\(!next\.audioUrl\)/,'paid curation does not pretend to have local licensed audio');
});
