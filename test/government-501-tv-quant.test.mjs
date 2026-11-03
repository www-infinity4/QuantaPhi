import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GOV501_RESOURCES,selectGovernmentResources,officialResourceUrl} from '../government-501-core.mjs';
import {TV_EXPANSION_CHANNELS,rankMoviePrograms,movieContextFromSignals,quantTvConsentKey} from '../tv-quant-discovery.mjs';
import programs from '../phi-tv-programs.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('501 Affiliates has real official entry points, never an invented federal credential',()=>{
 assert.ok(GOV501_RESOURCES.length>=6);
 assert.ok(GOV501_RESOURCES.some(x=>x.id==='agency-directory'));
 assert.ok(GOV501_RESOURCES.some(x=>x.id==='agency-developers'));
 for(const row of GOV501_RESOURCES){
  const url=new URL(row.url);
  assert.equal(url.protocol,'https:');
  assert.equal(officialResourceUrl(row.url),url.href);
  assert.ok(['public','account-required','agency-approval'].includes(row.access));
  assert.match(row.description, /./);
 }
 for(const unsafe of ['javascript:alert(1)','https://login.gov.evil.example/','http://www.usa.gov/','https://user:pass@usa.gov/','https://localhost/admin'])assert.equal(officialResourceUrl(unsafe),'');
 const filtered=selectGovernmentResources('developer');
 assert.ok(filtered.some(x=>x.id==='agency-developers'));
 assert.equal(selectGovernmentResources('something-never-listed').length,0);
});
test('501 card is findable in Oracle and Bubbles while never taking employee passwords',()=>{
 const home=read('index.html'),deck=read('oracle-card-deck.js'),catalog=read('bubbles-card-catalog.mjs'),ui=read('government-501-affiliates.mjs');
 assert.match(home,/id="government501Affiliates"/);
 assert.match(home,/government-501-affiliates\.mjs/);
 assert.match(deck,/government501Affiliates:\['government-501-affiliates'/);
 assert.match(catalog,/app\('government-501-affiliates'/);
 assert.match(ui,/not.*grant.*government|does not grant government/i);
 assert.doesNotMatch(ui,/fetch\(|type=['"]password/i);
});
test('CNN and CNBC are honest subscriber handoffs; NASA+ and PBS are official sources',()=>{
 const names=TV_EXPANSION_CHANNELS.map(x=>x.id);
 for(const key of ['cnn','cnbc','nasa-plus','pbs-nova','pbs-history'])assert.ok(names.includes(key),key);
 for(const row of TV_EXPANSION_CHANNELS){
  assert.equal(new URL(row.url).protocol,'https:');
  assert.equal(row.mode,'official-link','no offsite page iframe masquerading as video');
  assert.ok(row.poster && /^https:\/\//.test(row.poster));
 }
 assert.match(TV_EXPANSION_CHANNELS.find(x=>x.id==='cnn').access,/subscription|provider/i);
 assert.match(TV_EXPANSION_CHANNELS.find(x=>x.id==='cnbc').access,/subscription|provider/i);
 assert.match(TV_EXPANSION_CHANNELS.find(x=>x.id==='nasa-plus').access,/free/i);
});
test('consented Quant read ranks existing movie IDs only, with science preference and bounded signals',()=>{
 assert.match(quantTvConsentKey,/tv:quant/);
 const sci=movieContextFromSignals({following:['nasa-science'],counts:{'nasa-webb':19},quantScores:{science:50,space:60}});
 const ranked=rankMoviePrograms(programs,sci);
 assert.ok(ranked.length>=programs.STARQUEST.length);
 assert.ok(ranked.every(x=>programs.valid(x.videoId)));
 assert.match(ranked[0].title,/Cosmic Dawn|Moonbound/i);
 assert.deepEqual(ranked.filter(x=>x.source==='NASA').map(x=>x.videoId).sort(),['uSMGENDH_QI','bfw4G59j9uw','ttiLcMUQq80'].sort(), 'only verified official NASA uploads');
 const suspense=movieContextFromSignals({following:['reader-mystery'],counts:{'reader-mystery':4},quantScores:{suspense:60}});
 assert.ok(programs.CHILLER.some(x=>x.videoId===rankMoviePrograms(programs,suspense)[0].videoId));
 const noConsent=rankMoviePrograms(programs,movieContextFromSignals({}));
 assert.equal(noConsent[0].videoId,programs.STARQUEST[0].videoId);
 const polluted=movieContextFromSignals({quantScores:{science:Infinity},counts:{'nasa-webb':-999999,private:100000000}});
 assert.ok(Number.isFinite(polluted.science)&&polluted.science<=100);
});
test('TV extension shows actual in-card movies with one player, cast instructions and opt-in read',()=>{
 const ui=read('tv-501-expansion.mjs'),home=read('index.html');
 assert.match(home,/tv-501-expansion\.mjs/);
 assert.match(ui,/quantaphi:tv-playback-request/);
 assert.match(ui,/youtube-nocookie\.com\/embed\//);
 assert.match(ui,/loadOwnQuantScores/);
 assert.match(ui,/Use my Quant interests/);
 assert.match(ui,/Screen Cast|screen mirror/i);
 assert.match(ui,/addEventListener\('pagehide'/);
 assert.doesNotMatch(ui,/youtube\.com\/watch\?v=.*iframe\.src/);
 assert.doesNotMatch(ui,/localStorage\.setItem\([^\n]*quantScores|localStorage\.setItem\([^\n]*topics/);
});

test('rotating source spotlights never hide the accepted-brand original product photo',()=>{
 const css=read('quick-card-spotlights.css');
 assert.doesNotMatch(css,/\.qcs-has-items\s*>\s*\.iac-media\b/,
  'verified accepted source photos must not disappear when a rotating offer appears');
 assert.match(read('infinity-accepted-cards.css'),/\.iac-media\{/);
});
