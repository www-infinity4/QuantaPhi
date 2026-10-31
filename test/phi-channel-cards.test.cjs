'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8'),code=fs.readFileSync('phi-channel-cards.js','utf8'),
css=fs.readFileSync('phi-channel-cards.css','utf8'),programs=require('../phi-tv-programs.js');
test('all four QuantaPhi cards display video-only players, not TV websites',()=>{
 for(const name of ['StarQuest','Omni TV','Chiller','ShopLC'])assert.ok(code.includes("name:'"+name+"'"));
 assert.match(html,/\/phi-tv-programs\.js\?v=/);
 assert.ok(html.indexOf('phi-tv-programs.js?v=')<html.indexOf('phi-channel-cards.js?v='));
 assert.match(code,/youtube-nocookie\.com\/embed\//);
 assert.match(code,/createElement|el\('video','channelphi-video'\)/);
 assert.match(code,/video\.controls=true/);
 assert.doesNotMatch(code,/embedded=1|\/omni-tv\/\?|stationPage|siteViewerFrame|iframe\.src='\/TV-Database/);
 assert.match(css,/channelphi-video-slot/);
 assert.doesNotThrow(()=>new vm.Script(code));
});
test('existing TV sources are exact media identifiers and live ShopLC HLS URLs',()=>{
 assert.ok(programs.STARQUEST.length>=6);
 assert.ok(programs.CHILLER.length>=8);
 assert.equal(programs.SHOPLC_STREAMS.length,3);
 for(const x of [...programs.STARQUEST,...programs.CHILLER,programs.CHILLER_FEATURE])assert.equal(programs.valid(x.videoId),true,x.title);
 assert.ok(programs.SHOPLC_STREAMS.every(x=>x.startsWith('https://')&&x.endsWith('.m3u8')));
 const now=programs.chillerNow(new Date(2026,9,15,12,45));
 assert.ok(programs.valid(now.videoId));
 assert.equal(now.slot,25);
 assert.ok(now.start>=900&&now.start<=1800);
 assert.equal(programs.now('shoplc').channel,'shoplc');
 assert.notEqual(programs.next('chiller',now,1).videoId,now.videoId);
});
test('video and audio stop when navigating another Oracle card or changing station',()=>{
 assert.match(code,/document\.addEventListener\('oracle:card-deactivated'/);
 assert.match(code,/if\(document\.hidden\)stop\(\)/);
 assert.match(code,/window\.addEventListener\('pagehide',stop\)/);
 assert.match(code,/playback\.hls\.destroy\(\)/);
 assert.match(code,/playback\.yt\.stopVideo\(\)/);
 assert.match(code,/playback\.video\.pause\(\)/);
 assert.match(code,/video\.muted=false;video\.volume=1/);
 assert.match(code,/playback\.yt\.unMute\(\)/);
 assert.match(code,/playback\.yt\.setVolume\(100\)/);
});
test('Chiller slot schedule and feature weekend are stable across page refresh',()=>{
 const d=new Date(2026,9,17,22,10);
 const p=programs.chillerNow(d);
 assert.equal(p.title,'Blackmail');
 assert.equal(p.start,600);
 assert.deepEqual(programs.chillerSchedule(d).map(x=>x.videoId),programs.chillerSchedule(d).map(x=>x.videoId));
});

test('one active TV screen can be played and switched with genuine media elements',()=>{
 class Element{
  constructor(tag){this.tagName=tag;this.children=[];this.handlers={};this.attributes={};this.className='';this.hidden=false;this.textContent='';this.classList={add:x=>this.className+=' '+x,remove:x=>this.className=this.className.replace(' '+x,'')};}
  appendChild(n){this.children.push(n);return n}append(...nodes){nodes.forEach(n=>this.appendChild(n))}
  replaceChildren(){this.children=[]}setAttribute(k,v){this.attributes[k]=v}
  removeAttribute(k){delete this.attributes[k]}addEventListener(t,f){this.handlers[t]=f}
  click(){this.handlers.click?.()}focus(){this.focused=true}
  load(){}pause(){}play(){return Promise.resolve()}canPlayType(){return 'maybe'}
 }
 const root=new Element('section'),listeners={};
 const document={getElementById:id=>id==='phiChannelCards'?root:null,createElement:tag=>new Element(tag),
  head:new Element('head'),addEventListener:(kind,callback)=>listeners[kind]=callback,dispatchEvent:event=>listeners[event.type]?.(event),hidden:false};
 const window={PhiTVPrograms:programs,YT:{Player:class{stopVideo(){}destroy(){}unMute(){}setVolume(){}playVideo(){}}},
  addEventListener:(kind,cb)=>listeners[kind]=cb};
 const context={document,window,location:{origin:'https://quantaphi.org'},URL,setTimeout,clearTimeout,CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail}}};
 vm.runInNewContext(code,context);
 const all=n=>[n,...n.children.flatMap(all)];
 const cards=all(root).filter(n=>n.tagName==='article');
 assert.equal(cards.length,5);
 const [kyou,star,omni,chiller,shop]=cards;
 const btn=(card,c)=>all(card).find(n=>n.className===c);
 root.handlers['oracle:activate']();
 assert.equal(all(root).filter(x=>x.tagName==='iframe').length,1);
 assert.match(all(kyou).find(x=>x.tagName==='iframe').src,/^https:\/\/www\.kyoutv\.com\/livestream\/\?utm_source=quantaphi/);
 const kyouControls=all(kyou).find(x=>x.className.includes('channelphi-kyou-controls'));
 assert.equal(kyouControls.children.length,3,'KYOU shows only Refresh, Station Website and Stop');
 assert.equal(btn(kyou,'channelphi-sound'),undefined,'KYOU volume is controlled in the publisher iframe');
 assert.match(btn(kyou,'channelphi-prev').textContent,/Refresh station/);
 assert.match(btn(kyou,'channelphi-next').textContent,/KYOU website/);
 assert.match(all(kyou).find(x=>x.className==='channelphi-hint').textContent,/volume are controlled inside KYOU/);
 btn(kyou,'channelphi-prev').click();
 assert.equal(all(kyou).filter(x=>x.tagName==='iframe').length,1,'refresh replaces the original frame');
 btn(star,'channelphi-screen').click();
 const f1=all(root).filter(x=>x.tagName==='iframe');assert.equal(f1.length,1);
 assert.match(f1[0].src,/youtube-nocookie.com\/embed\/[A-Za-z0-9_-]{11}/);
 assert.doesNotMatch(f1[0].src,/\/omni-tv\/|\/TV-Database\/|\/Chiller\//);
 btn(chiller,'channelphi-screen').click();
 assert.equal(all(root).filter(x=>x.tagName==='iframe').length,1);
 assert.equal(btn(star,'channelphi-screen').hidden,false);
 btn(shop,'channelphi-screen').click();
 assert.equal(all(root).filter(x=>x.tagName==='iframe').length,0);
 const videos=all(root).filter(x=>x.tagName==='video');assert.equal(videos.length,1);
 assert.equal(videos[0].muted,false);assert.equal(videos[0].volume,1);
 assert.match(videos[0].src,/master\.m3u8/);
 btn(omni,'channelphi-screen').click();
 btn(omni,'channelphi-next').click();
 assert.match(btn(omni,'channelphi-now').textContent,/Unlocked Window|Night Caller|Revenge|Alfred Hitchcock|Little Peace|Nightcrawlers|Examination|Message from Charity|Blackmail/);
 btn(omni,'channelphi-next').click();
 assert.match(btn(omni,'channelphi-now').textContent,/Shop LC/);
 btn(omni,'channelphi-next').click();
 assert.equal(all(root).filter(x=>x.tagName==='iframe').length,1);
 listeners['oracle:card-deactivated']({detail:{id:'phiChannelCards'}});
 assert.equal(all(root).filter(x=>x.tagName==='iframe'||x.tagName==='video').length,0);
 root.handlers['oracle:activate']();
 assert.equal(all(root).filter(x=>x.tagName==='iframe').length,1);
 listeners['quantaphi:tv-playback-request']({detail:{owner:'liveFoxNewsCard'}});
 assert.equal(all(root).filter(x=>x.tagName==='iframe'||x.tagName==='video').length,0);
});

test('KYOU and shared Quick Card footer actions keep real controls with neutral styling',()=>{
 const actions=fs.readFileSync('quanta-card-actions.mjs','utf8');
 const actionCss=fs.readFileSync('quanta-card-experience.css','utf8');
 for(const action of ['follow','star','collect','preview','share','build']){
  assert.ok(actions.includes("'"+action+"')"),action+' is a real tagged control');
 }
 assert.match(actionCss,/\.qca-toolbar \.qca-controls>\.qca-button\{[^}]*background:#fff!important/);
 assert.match(actionCss,/\.qca-toolbar \.qca-controls>\.qca-button\[aria-pressed="true"\]\{[^}]*background:#eee!important/);
 assert.doesNotMatch(actionCss,/data-action="follow"\]\{background:#e7f3ff/);
 assert.match(actions,/collect\.setAttribute\('aria-pressed','true'\)/);
 assert.match(actionCss,/@media\(max-width:380px\)/);
 assert.match(css,/\.channelphi-kyou \.channelphi-controls\{grid-template-columns:repeat\(3,/);
 assert.match(css,/\.channelphi-kyou \.channelphi-controls \.channelphi-stop\{background:#7b2638/);
 assert.match(css,/@media\(max-width:430px\)\{\.channelphi-kyou \.channelphi-controls\{grid-template-columns:repeat\(2,/);
});
