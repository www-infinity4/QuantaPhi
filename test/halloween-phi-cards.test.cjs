'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8'),js=fs.readFileSync('halloween-phi.js','utf8'),css=fs.readFileSync('halloween-phi.css','utf8');
const config=JSON.parse(fs.readFileSync('halloween-phi-content.json','utf8'));
const terri=fs.readFileSync('terriphi/index.html','utf8'),petri=fs.readFileSync('petriphi/index.html','utf8');

test('Terra and Petra both mount on homepage in Oracle Octaves style',()=>{
 assert.match(html,/id="halloweenPhi"/);
 assert.match(html,/\/halloween-phi\.js\?/);
 assert.match(html,/\/halloween-phi\.css\?/);
 assert.equal(config.schema,'quantaphi.halloween-phi/v1');
 assert.deepEqual(config.cards.map(c=>c.id),['terriphi','petriphi']);
 assert.ok(css.includes('.hphi-card'));
 assert.doesNotThrow(()=>new Function(js));
});
test('standalone Terra arcade and Petra poster studio remain available',()=>{
 for(const label of ['Haunted Door Hunt','Ghostly Sound Lab','Costume Chaos','ernest-trailer-btn']) assert.ok(terri.includes(label));
 assert.match(terri,/not the complete movie/);
 assert.match(petri,/canvas/i);assert.match(petri,/toDataURL\('image\/png'\)/);
 assert.match(petri,/nosferatu-open/);
});
test('both cards curate full original-host movies with clear source metadata',()=>{
 for(const card of config.cards){
  assert.ok(card.movies.some(m=>m.provider==='youtube'));
  assert.ok(card.movies.some(m=>m.provider==='archive'));
  assert.ok(card.images.length>=6);
  assert.ok(card.movies.every(m=>/^https:\/\//.test(m.watchUrl) && /^https:\/\//.test(m.embedUrl)));
  assert.ok(card.movies.filter(m=>m.provider==='archive').some(m=>m.originalMediaUrl && m.mediaUrl));
  assert.ok(card.approvedArchiveIds.length>=3);
 }
 assert.notEqual(config.cards[0].movie.embedUrl,config.cards[1].movie.embedUrl);
});
test('in-card full movie player can use Archive MP4 with fallback to source embed',()=>{
 assert.match(js,/▶ Play movie here/);
 assert.match(js,/originalMediaUrl/);
 assert.match(js,/e\('video'\)/);
 assert.match(js,/playsInline=true/);
 assert.match(js,/e\('iframe'\)/);
 assert.match(js,/autoplay; encrypted-media/);
 assert.match(js,/Watch at source/);
 assert.match(js,/player\.replaceChildren\(\)/);
 assert.match(css,/hphi-play-now/);
 assert.match(js,/setArchiveMovie/);
 assert.match(js,/approved\.has\(identifier\)/);
});
test('share and collect actions never fabricate a confirmed StarQuest reward',()=>{
 assert.match(js,/QuantaStarCredit/);assert.match(js,/quantaPhiCollected/);
 assert.match(js,/navigator\.share/);assert.match(js,/Share canceled/);
 assert.match(js,/credit is not awarded for copying/);
});
