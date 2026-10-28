import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GAME_START,GAME_END,QUICK_ADS,inGameWindow,isOfficialUrl,gameLiveStatus,eligibleQuickAds,chooseQuickAd} from '../quick-ads-core.mjs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('only scheduled Game 4 night in Chicago may serve Quick Ads',()=>{
 assert.equal(inGameWindow(GAME_START-1),false);
 assert.equal(inGameWindow(GAME_START),true);
 assert.equal(inGameWindow(GAME_END),true);
 assert.equal(inGameWindow(GAME_END+1),false);
 assert.equal(eligibleQuickAds(GAME_END+1).length,0);
 assert.equal(chooseQuickAd({}, {}, [], GAME_START-1),null);
});
test('prospective independent-site ads have unique ids and legitimate HTTPS destinations',()=>{
 assert.ok(QUICK_ADS.length>=15);
 assert.equal(new Set(QUICK_ADS.map(a=>a.id)).size,QUICK_ADS.length);
 for(const ad of QUICK_ADS){
  assert.ok(ad.name&&ad.tagline&&ad.category&&/^#[a-fA-F0-9]{6}$/.test(ad.tone));
  assert.equal(isOfficialUrl(ad.href),true);
 }
 assert.equal(isOfficialUrl('javascript:alert(1)'),false);
 assert.equal(isOfficialUrl('https://user:pass@example.com'),false);
 assert.ok(QUICK_ADS.every(a=>!/budweiser|corona|kalshi|polymarket/i.test(a.name)));
});
test('replacement ad rotates through every unseen website before recycling',()=>{
 const counts={},recent=[],used=new Set();
 for(let i=0;i<QUICK_ADS.length;i++){
  const ad=chooseQuickAd({category:'Sports',id:'trending-mlb',title:'World Series'},counts,recent,GAME_START);
  assert.ok(ad);
  assert.equal(used.has(ad.id),false,'must not repeat while another new ad exists');
  used.add(ad.id);counts[ad.id]=1;
  recent.unshift(ad.id);if(recent.length>4)recent.pop();
 }
 assert.equal(used.size,QUICK_ADS.length);
 assert.ok(chooseQuickAd({category:'Sports'},counts,recent,GAME_START));
});
test('official scoreboard status gates live, scheduled and final states',()=>{
 const fixture=status=>({dates:[{games:[{seriesDescription:'World Series',status}]}]});
 assert.equal(gameLiveStatus(fixture({abstractGameState:'Live',detailedState:'In Progress'})),'live');
 assert.equal(gameLiveStatus(fixture({abstractGameState:'Preview',detailedState:'Scheduled'})),'scheduled');
 assert.equal(gameLiveStatus(fixture({abstractGameState:'Final',detailedState:'Final'})),'final');
 assert.equal(gameLiveStatus({dates:[]}), 'unknown');
});
test('homepage loads the independent notification module after carousel, keeping original cards',()=>{
 const html=source('index.html'),ui=source('quick-ads.mjs'),css=source('quick-ads.css');
 assert.match(html,/oracle-card-deck\.js\?v=/);
 assert.match(html,/quick-ads\.mjs\?v=20261027-game4/);
 assert.match(html,/quick-ads\.css\?v=20261027-game4/);
 assert.ok(html.indexOf('quick-ads.mjs?v=20261027-game4')>html.indexOf('oracle-card-deck.js?v='));
 assert.match(ui,/quantaphi:switchboard-change/);
 assert.match(ui,/status!=='live'/);
 assert.match(ui,/Dismiss Quick Ads for 10 minutes/);
 assert.match(css,/prefers-reduced-motion/);
});
