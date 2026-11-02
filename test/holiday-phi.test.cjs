'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const page = fs.readFileSync('index.html', 'utf8');
const deck = fs.readFileSync('oracle-card-deck.js', 'utf8');
const js = fs.readFileSync('holiday-phi.js', 'utf8');
const css = fs.readFileSync('holiday-phi.css', 'utf8');
const data = JSON.parse(fs.readFileSync('holiday-phi-content.json', 'utf8'));

test('one holiday quick card replaces the Halloween carousel entry without deleting archives', () => {
  assert.match(page, /id="holidayPhi"/);
  assert.doesNotMatch(page, /id="halloweenPhi"/);
  assert.match(page, /\/holiday-phi\.js\?/);
  assert.match(page, /\/holiday-phi\.css\?/);
  assert.doesNotMatch(page, /<script defer src="\/halloween-phi\.js/);
  assert.match(deck, /\['holidayPhi','Thanksgiving & Christmas/);
  assert.doesNotMatch(deck, /\['halloweenPhi'/);
  assert.ok(fs.existsSync('terriphi/index.html'));
  assert.ok(fs.existsSync('petriphi/index.html'));
});

test('holiday sources show actual images, in-card video, and rights/source links for each holiday', () => {
  assert.equal(data.schema, 'quantaphi.holiday-phi/v1');
  assert.deepEqual(Object.keys(data.holidays), ['thanksgiving','christmas']);
  for (const [name, holiday] of Object.entries(data.holidays)) {
    assert.equal(holiday.name.toLowerCase(),name);
    assert.ok(holiday.images.length >= 2);
    assert.ok(holiday.videos.length >= 1);
    assert.ok(holiday.images.every(x => x.src.startsWith('https://commons.wikimedia.org/wiki/Special:FilePath/') && x.source.startsWith('https://commons.wikimedia.org/wiki/File:') && x.license));
    assert.ok(holiday.videos.every(x => x.embedUrl.startsWith('https://archive.org/embed/') && x.source.startsWith('https://archive.org/details/')));
  }
  assert.match(js, /commons\.wikimedia\.org\/w\/api\.php/);
  assert.match(js, /archive\.org\/advancedsearch\.php/);
  assert.match(js, /▶ Play here/);
  assert.match(js, /createElement\('iframe'\)/);
  assert.match(js, /Original source/);
});

test('no fake wallet mints and real Create Phi and Code Phi project handoffs', () => {
  assert.match(js, /PhiProjectPackage/);
  assert.match(js, /captureFile/);
  assert.match(js, /capture\(/);
  assert.match(js, /\.seed\('code'\)/);
  assert.match(js, /\.seed\('create'\)/);
  assert.match(js, /Build website in Code Phi/);
  assert.match(js, /Create assets in Create Phi/);
  assert.match(js, /No wallet coins are minted/);
  assert.match(js, /navigator\.share/);
  assert.match(js, /PhiCinemaReel/);
  assert.match(js, /PhiVisualRender/);
  assert.doesNotThrow(() => new Function(js));
  assert.match(css, /@media\s*\(max-width:\s*600px\)/);
});
