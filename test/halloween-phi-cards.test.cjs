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

test('image feeds are distinct, rights labelled, and no movie autoplays',()=>{
 assert.notEqual(config.cards[0].feed.search,config.cards[1].feed.search);
 assert.match(config.cards[0].feed.search,/costume/);
 assert.match(config.cards[1].feed.search,/postcard/);
 assert.match(js,/LicenseShortName/);
 assert.match(js,/Public domain/);
 assert.match(js,/commons\.wikimedia\.org/);
 assert.doesNotMatch(js,/autoplay=1/);
 assert.match(js,/addEventListener\('click'/);
 assert.match(js,/halloweenPreview/);
});

test('StarQuest actions are requested only on actual user events',()=>{
 assert.match(js,/QuantaStarCredit/);
 assert.match(js,/quantaPhiCollected/);
 assert.match(js,/navigator\.share/);
 assert.match(js,/Share canceled/);
 assert.match(js,/credit is not awarded for copying/);
 assert.match(js,/ledger|Ledger/);
});
