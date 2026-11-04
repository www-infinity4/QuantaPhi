'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const programs=require('../phi-tv-programs.js');
test('Chiller card exposes next title recovery instead of hiding CH+',()=>{
 const css=fs.readFileSync('phi-channel-cards.css','utf8');
 const js=fs.readFileSync('phi-channel-cards.js','utf8');
 assert.doesNotMatch(css,/not\(\.channelphi-omni\) :is\(\.channelphi-prev,\.channelphi-next,\.channelphi-sound\)/);
 assert.match(js,/Next program/);
 assert.match(js,/This video is unavailable here/);
});
test('Chiller starts complete episodes rather than seeking past their ending',()=>{
 const late=new Date(2026,10,3,12,29,50);
 const p=programs.chillerNow(late);
 assert.equal(p.start,0);
 assert.ok(programs.valid(p.videoId));
});
