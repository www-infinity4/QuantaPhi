'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('index.html','utf8');
const js=fs.readFileSync('halloween-phi.js','utf8');
const css=fs.readFileSync('halloween-phi.css','utf8');
const config=JSON.parse(fs.readFileSync('halloween-phi-content.json','utf8'));
const terri=fs.readFileSync('terriphi/index.html','utf8');
const petri=fs.readFileSync('petriphi/index.html','utf8');

test('two distinct seasonal cards mount in QuantaPhi homepage',()=>{
 assert.match(html,/id="halloweenPhi"/);
 assert.match(html,/\/halloween-phi\.js\?/);
 assert.match(html,/\/halloween-phi\.css\?/);
 assert.equal(config.schema,'quantaphi.halloween-phi/v1');
 assert.deepEqual(config.cards.map(c=>c.id),['terriphi','petriphi']);
 assert.ok(css.includes('.hphi-card'));
 assert.doesNotThrow(()=>new Function(js));
});

test('TerriPhi retains working entertainment and labels Ernest as trailer',()=>{
 assert.match(terri,/Haunted Door Hunt/);
 assert.match(terri,/Ghostly Sound Lab/);
 assert.match(terri,/Costume Chaos/);
 assert.match(terri,/ernest-trailer-btn/);
 assert.match(terri,/not the complete movie/);
 const film=config.cards[0].movie;
 assert.equal(film.kind,'trailer');
 assert.match(film.title,/Ernest Scared Stupid/);
 assert.match(film.embedUrl,/youtube-nocookie\.com\/embed\//);
 assert.match(film.note,/not the full movie/i);
 assert.match(film.watchUrl,/play\.google\.com/);
});

test('PetriPhi retains real poster creation and a distinct horror screening',()=>{
 assert.match(petri,/canvas/i);
 assert.match(petri,/toDataURL\('image\/png'\)/);
 assert.match(petri,/localStorage/);
 assert.match(petri,/nosferatu-open/);
 const film=config.cards[1].movie;
 assert.equal(film.kind,'feature');
 assert.match(film.title,/Nosferatu/);
 assert.match(film.embedUrl,/archive\.org\/embed\/Nosferatu1922_58/);
 assert.notEqual(film.embedUrl,config.cards[0].movie.embedUrl);
});

test('only pre-1940 curated images appear, with source and rights labels',()=>{
 assert.notEqual(config.cards[0].feed.search,config.cards[1].feed.search);
 for(const card of config.cards){
  assert.ok(card.images.length>=3);
  for(const image of card.images){
   assert.ok(image.year<1940&&image.year>=1800);
   assert.ok(image.source.includes('commons.wikimedia.org/wiki/File:'));
   assert.ok(image.license.includes('public domain'));
  }
 }
 assert.ok(!js.includes('commons.wikimedia.org/w/api.php'));
 assert.ok(!js.includes('autoplay=1'));
 assert.ok(js.includes('halloweenPreview'));
});
test('archive playback is a single player and only accepts approved IDs',()=>{
 assert.ok(js.includes('QuantaPhiHalloweenPlayer'));
 assert.ok(js.includes('setArchiveMovie'));
 assert.ok(js.includes('https://archive.org/embed/'));
 assert.ok(js.includes('approved.has(identifier)'));
 assert.ok(js.includes('host.replaceChildren()'));
 assert.deepEqual(config.cards[0].approvedArchiveIds,['night_of_the_living_dead_dvd']);
 assert.deepEqual(config.cards[1].approvedArchiveIds,['Nosferatu1922_58']);
});

test('StarQuest actions are requested only on actual user events',()=>{
 assert.match(js,/QuantaStarCredit/);
 assert.match(js,/quantaPhiCollected/);
 assert.match(js,/navigator\.share/);
 assert.match(js,/Share canceled/);
 assert.match(js,/credit is not awarded for copying/);
 assert.match(js,/ledger|Ledger/);
});
