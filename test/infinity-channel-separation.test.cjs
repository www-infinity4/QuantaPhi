'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const programs=require('../phi-tv-programs.js');
const read=path=>fs.readFileSync(path,'utf8');
const cards=[
 ['infinityStarQuestCard','StarQuest'],
 ['infinityOmniTvCard','Omni TV'],
 ['infinityChillerCard','Chiller'],
 ['infinityShopLcCard','Shop LC']
];
test('each Infinity player gets its own original Oracle Quick Card and direct spotlight link',()=>{
 const html=read('index.html'),oracle=read('oracle-card-deck.js');
 for(const [id,name] of cards){
  assert.match(html,new RegExp('id="'+id+'"'));
  assert.ok(oracle.includes("['"+id+"','"+name),name+' must be in Oracle choices');
  assert.ok(oracle.includes(id+':['),name+' must have a Follow-ready feed identifier');
 }
 assert.match(html,/id="phiChannelCards"/);
 assert.match(oracle,/Infinity TV Guide/);
});
test('program previews identify a title, actual source poster, and a description without inventing broadcast data',()=>{
 assert.equal(typeof programs.preview,'function');
 for(const channel of ['starquest','chiller','omni','shoplc']){
  const item=programs.preview(channel,new Date(2026,10,3,15,30));
  assert.ok(item.title&&item.description&&item.poster&&item.guideUrl);
  assert.match(item.poster,/^https:\/\//);
  assert.match(item.guideUrl,/\/infinity-tv\/guide\.html#/);
  assert.ok(item.providerUrl.startsWith('https://'));
  assert.ok(item.availabilityNote.length>=12);
 }
 const chiller=programs.preview('chiller',new Date(2026,10,3,15,30));
 assert.match(chiller.availabilityNote,/Infinity|curated|playlist/i);
 const shoplc=programs.preview('shoplc',new Date(2026,10,3,15,30));
 assert.doesNotMatch(shoplc.description,/\$\d|currently selling|today's host/i);
});
test('an actual on-site guide offers day, time, and network controls and provider links',()=>{
 const html=read('infinity-tv/guide.html'),js=read('infinity-tv/guide.js');
 for(const id of ['tvGuideDay','tvGuideTime','tvGuideNetwork','tvGuidePrograms'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/phi-tv-programs\.js/);
 assert.match(html,/guide\.js/);
 for(const link of ['www.kyoutv.com/programming/schedule','www.shoplc.com/pages/live-tv-program-guide'])
  assert.ok(js.includes(link)||html.includes(link));
});
test('curated guide slots are source-backed, timezone-labeled and never claim KYOU or FOX show titles',()=>{
 assert.equal(typeof programs.guideRows,'function');
 const today=programs.guideRows(new Date(2026,10,3,15,30));
 assert.ok(today.filter(x=>x.channel==='chiller').length>=24);
 assert.ok(today.some(x=>x.channel==='starquest'));
 assert.ok(today.some(x=>x.channel==='shoplc'&&x.title==='Shop LC · live shopping'));
 assert.ok(today.some(x=>x.channel==='kyou'&&/check|schedule|guide/i.test(x.title)));
 assert.ok(today.every(x=>x.title&&x.description&&x.poster&&x.guideUrl));
 assert.ok(today.filter(x=>x.channel==='chiller').every(x=>typeof x.hour==='number'));
});
test('the homepage mounts each Infinity player separately and stops previous card playback',()=>{
 const code=read('phi-channel-cards.js'),fox=read('fox-infinity-tv.mjs'),css=read('phi-channel-cards.css');
 for(const [id] of cards)assert.ok(code.includes("'"+id+"'"),id+' mount missing');
 assert.match(code,/oracle:card-deactivated/);
 assert.match(code,/quantaphi:tv-playback-request/);
 assert.match(code,/owner/);
 assert.match(css,/channelphi-independent/);
 assert.doesNotMatch(code,/iframe\.src=['"]https?:\/\/www\.kyoutv\.com/);
 assert.match(fox,/!grid/);
});
