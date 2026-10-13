'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8'),js=fs.readFileSync('phi-channel-cards.js','utf8'),css=fs.readFileSync('phi-channel-cards.css','utf8');
test('four channel cards mount on QuantaPhi and use existing in-page viewer',()=>{
 assert.match(html,/id="phiChannelCards"/);
 assert.match(html,/\/phi-channel-cards\.js\?v=/);
 assert.match(html,/\/phi-channel-cards\.css\?v=/);
 assert.match(html,/id="siteViewerFrame"/);
 assert.match(js,/inPageSite/);
 for(const name of ['StarQuest','HBO','Chiller','ShopLC'])assert.match(js,new RegExp("name:'"+name+"'"));
 for(const path of ['/TV-Database/','/HBO/','/Chiller/','/shoplc/'])assert.ok(js.includes("path:'"+path+"'"));
 assert.ok(css.includes('.channelphi-grid'));
 assert.doesNotThrow(()=>new Function(js));
});
test('Terra and Petra movie playback is in-card after an explicit tap',()=>{
 const player=fs.readFileSync('halloween-phi.js','utf8');
 assert.match(player,/originalMediaUrl/);
 assert.match(player,/playsInline/);
 assert.match(player,/▶ Play movie here/);
 assert.match(player,/autoplay; encrypted-media/);
 assert.match(player,/Watch at source/);
 assert.doesNotThrow(()=>new Function(player));
});
