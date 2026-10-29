import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GAME_START,CAMPAIGN_START,GAME_END,HOUSE_START,QUICK_ADS,HOUSE_ADS,quickAdCampaign,inGameWindow,isOfficialUrl,gameLiveStatus,eligibleQuickAds,chooseQuickAd} from '../quick-ads-core.mjs';
import {GAME_PK} from '../world-series-score.mjs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Game 5 Quick Ads start early and expire tonight in Chicago',()=>{
 assert.equal(inGameWindow(CAMPAIGN_START-1),false);
 assert.equal(inGameWindow(Date.parse('2026-10-28T14:00:00-05:00')),true);
 assert.equal(inGameWindow(GAME_START-1),true);
 assert.equal(inGameWindow(GAME_START),true);
 assert.equal(inGameWindow(GAME_END),true);
 assert.equal(inGameWindow(GAME_END+1),false);
 assert.equal(eligibleQuickAds(GAME_END+1).length,HOUSE_ADS.length);
 assert.equal(chooseQuickAd({}, {}, [], CAMPAIGN_START-1),null);
});
test('officially ended World Series switches to first-party, unpaid Infinity house spots',()=>{
 assert.equal(HOUSE_START,GAME_END+1);
 assert.equal(quickAdCampaign(CAMPAIGN_START-1),'inactive');
 assert.equal(quickAdCampaign(GAME_START),'world-series');
 assert.equal(quickAdCampaign(GAME_END),'world-series');
 assert.equal(quickAdCampaign(HOUSE_START),'infinity-house');
 assert.equal(quickAdCampaign(Number.NaN),'inactive');
 assert.equal(HOUSE_ADS.length,2);
 assert.deepEqual(eligibleQuickAds(HOUSE_START).map(a=>a.id),HOUSE_ADS.map(a=>a.id));
 assert.equal(eligibleQuickAds(GAME_START).length,QUICK_ADS.length);
 for(const ad of HOUSE_ADS){
  const url=new URL(ad.href);
  assert.equal(url.origin,'https://quantaphi.org','house campaign cannot send traffic to merchants');
  assert.ok(['/infinity-accepted.html','/infinity-affiliates.html'].includes(url.pathname));
  assert.equal(url.search,'');
  assert.equal(url.hash,'');
  assert.ok(!/paid|sponsor|commission|partner/i.test(ad.tagline));
 }
 const seen=new Set(),counts={},recent=[];
 for(let i=0;i<HOUSE_ADS.length;i++){
  const next=chooseQuickAd({category:'shopping'},counts,recent,HOUSE_START);
  assert.ok(next&&!seen.has(next.id),'no duplicate house ad while another is unseen');
  seen.add(next.id);counts[next.id]=1;recent.unshift(next.id);
 }
 assert.equal(seen.size,HOUSE_ADS.length);
 const ui=source('quick-ads.mjs');
 assert.match(ui,/if\(campaign==='infinity-house'\)return 'house'/);
 assert.match(ui,/INFINITY HOUSE SPOTLIGHT/);
 assert.match(ui,/no paid placement or affiliate relationship claimed/);
 assert.doesNotMatch(ui,/Date\.now\(\)>GAME_END/);
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
 const fixture=status=>({dates:[{games:[{gamePk:GAME_PK,seriesDescription:'World Series',status}]}]});
 assert.equal(gameLiveStatus(fixture({abstractGameState:'Live',detailedState:'In Progress'})),'live');
 assert.equal(gameLiveStatus(fixture({abstractGameState:'Preview',detailedState:'Scheduled'})),'scheduled');
 assert.equal(gameLiveStatus(fixture({abstractGameState:'Final',detailedState:'Final'})),'final');
 assert.equal(gameLiveStatus({dates:[]}), 'unknown');
 for(const detailedState of ['Postponed','Cancelled','Suspended','Delayed Start']){
  assert.equal(gameLiveStatus(fixture({abstractGameState:'Preview',detailedState})),'unavailable');
  assert.equal(gameLiveStatus(fixture({abstractGameState:'Live',detailedState})),'unavailable');
 }
 assert.equal(gameLiveStatus({dates:[{games:[{gamePk:849803,seriesDescription:'World Series',status:{abstractGameState:'Live'}}]}]}),'unknown');
});
test('homepage loads the independent notification module after carousel, keeping original cards',()=>{
 const html=source('index.html'),ui=source('quick-ads.mjs'),css=source('quick-ads.css');
 assert.match(html,/oracle-card-deck\.js\?v=/);
 assert.match(html,/quick-ads\.mjs\?v=20261029-house1/);
 assert.match(html,/quick-ads\.css\?v=20261028-game5b/);
 assert.ok(html.indexOf('quick-ads.mjs?v=20261029-house1')>html.indexOf('oracle-card-deck.js?v='));
 assert.match(ui,/quantaphi:switchboard-change/);
 assert.match(ui,/\['scheduled','live'\]\.includes\(status\)/);
 assert.match(ui,/Dismiss Quick Ads for 10 minutes/);
 assert.match(css,/prefers-reduced-motion/);
});
