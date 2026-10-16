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
