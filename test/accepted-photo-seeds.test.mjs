import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BRAND_PHOTO_SEEDS} from '../accepted-brand-photo-seeds.mjs';
import {acceptedBrand,INFINITY_ACCEPTED_BRANDS} from '../infinity-accepted-catalog.mjs';
import {cardImageCandidates} from '../infinity-accepted-cards.mjs';
const code=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('three visual-gap brands ship attributed real item photography, not logo or synthetic images',()=>{
 const names=['durable-miele','durable-coleman-classic-camp-stoves','durable-fritz-hansen'];
 for(const id of names){
  const seed=BRAND_PHOTO_SEEDS[id],card=acceptedBrand(id);
  assert.ok(seed,id+' has no documented source photo');
  assert.ok(card&&card.photoSource&&card.photoCaption,id+' lacks source attribution');
  assert.equal(card.photoSource,seed.sourceUrl);
  assert.equal(card.image,seed.image);
  assert.equal(cardImageCandidates(card)[0],seed.image);
  assert.match(seed.image,/^https:\/\//);
  assert.match(seed.sourceUrl,/^https:\/\//);
  assert.match(seed.caption,/.{12,}/);
  assert.ok(!/logo|favicon|brandmark|social-media\/microsoftteams/i.test(new URL(seed.image).pathname),id);
  assert.equal(seed.advertiserPaid,false,'independent source image must not claim sponsorship');
 }
 assert.equal(INFINITY_ACCEPTED_BRANDS.length,116,'do not delete any accepted cards');
});

test('accepted brand image renderer credits each retailer or publisher and keeps fallback',()=>{
 const renderer=code('infinity-accepted-cards.mjs');
 const css=code('infinity-accepted-cards.css');
 assert.match(renderer,/photoSource/);
 assert.match(renderer,/iac-image-credit/);
 assert.match(css,/\.iac-image-credit/);
 assert.match(renderer,/websiteFaviconUrl\(card\)/);
});

test('image gap seed links remain source-specific, not arbitrary third party ads',()=>{
 assert.match(BRAND_PHOTO_SEEDS['durable-miele'].sourceUrl,/mieleusa\.com/);
 assert.match(BRAND_PHOTO_SEEDS['durable-coleman-classic-camp-stoves'].sourceUrl,/backcountry\.com/);
 assert.match(BRAND_PHOTO_SEEDS['durable-fritz-hansen'].sourceUrl,/mynordicliving\.co\.uk/);
});
