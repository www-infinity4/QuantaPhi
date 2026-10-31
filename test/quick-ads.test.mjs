import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GAME_START,CAMPAIGN_START,GAME_END,HOUSE_START,QUICK_ADS,HOUSE_ADS,quickAdCampaign,restoreQuickAdState,quickAdPacingAllows,inGameWindow,isOfficialUrl,gameLiveStatus,eligibleQuickAds,chooseQuickAd} from '../quick-ads-core.mjs';
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
  assert.equal(isOfficialUrl(ad.href,ad.id),true,'house spots require the same exact reviewed destinations as merchants');
  const url=new URL(ad.href);
  assert.equal(url.origin,'https://quantaphi.org','house campaign cannot send traffic to merchants');
  assert.ok(['/infinity-accepted.html','/infinity-affiliates.html'].includes(url.pathname));
  assert.equal(url.search,'');
  assert.equal(url.hash,'');
  assert.ok(!/paid|sponsor|commission|partner/i.test(ad.tagline));
 }
 assert.equal(isOfficialUrl(HOUSE_ADS[0].href,HOUSE_ADS[1].id),false,'one house destination cannot borrow another spot identity');
 assert.equal(isOfficialUrl(HOUSE_ADS[0].href+'?redirect=https://example.org',HOUSE_ADS[0].id),false);
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
test('house successor retains prior dismissal and pacing but not expired game view cap',()=>{
 const legacy={dismissedUntil:HOUSE_START+600000,lastAt:HOUSE_START-5000,total:30,counts:{helzberg:30},recent:['helzberg']};
 const fresh=restoreQuickAdState({},legacy);
 assert.equal(fresh.dismissedUntil,legacy.dismissedUntil);
 assert.equal(fresh.lastAt,legacy.lastAt);
 assert.equal(fresh.total,0,'old game cap must not disable the new house campaign');
 assert.deepEqual(fresh.counts,{});
 assert.deepEqual(fresh.recent,[]);
 assert.equal(quickAdPacingAllows(HOUSE_START,fresh),false,'old dismissal survives a JS upgrade');
 assert.equal(quickAdPacingAllows(legacy.dismissedUntil,fresh),true,'spotlight may resume when dismissal expires');
 const current={dismissedUntil:HOUSE_START+900000,lastAt:HOUSE_START+3000,total:2,counts:{'infinity-accepted-house':2},recent:['infinity-accepted-house']};
 const resumed=restoreQuickAdState(current,legacy);
 assert.equal(resumed.dismissedUntil,current.dismissedUntil);
 assert.equal(resumed.lastAt,current.lastAt);
 assert.equal(resumed.total,2);
 assert.deepEqual(resumed.counts,current.counts);
 assert.deepEqual(resumed.recent,current.recent);
 assert.equal(quickAdPacingAllows(HOUSE_START+20000,{lastAt:HOUSE_START},0),false,'24-second limit');
 assert.equal(quickAdPacingAllows(HOUSE_START+24000,{lastAt:HOUSE_START},0),true);
 assert.equal(quickAdPacingAllows(HOUSE_START+24000,{lastAt:HOUSE_START},HOUSE_START+30000),false,'score notice suppresses popups');
 assert.equal(quickAdPacingAllows(HOUSE_START+24000,{lastAt:HOUSE_START,total:30}),false,'per-campaign cap');
 assert.equal(quickAdPacingAllows(Number.NaN,fresh),false);
 assert.equal(restoreQuickAdState(null,{dismissedUntil:-1,lastAt:Infinity,total:30}).total,0);
 const ui=source('quick-ads.mjs');
 assert.match(ui,/LEGACY_KEY='quantaphi:worldseries-quickads:20261028:v1'/);
 assert.match(ui,/restoreQuickAdState\(read\(KEY\),read\(LEGACY_KEY\)\)/);
 const before=ui.indexOf('const status=await live();');
 const after=ui.indexOf('quickAdPacingAllows(Date.now(),state,scoreAdSuppressedUntil)',before);
 assert.ok(before>0&&after>before,'recheck dismissal and pacing after the asynchronous MLB request');
});
test('prospective independent-site ads have unique ids and legitimate HTTPS destinations',()=>{
 assert.ok(QUICK_ADS.length>=15);
 assert.equal(new Set(QUICK_ADS.map(a=>a.id)).size,QUICK_ADS.length);
 for(const ad of QUICK_ADS){
  assert.ok(ad.name&&ad.tagline&&ad.category&&/^#[a-fA-F0-9]{6}$/.test(ad.tone));
  assert.equal(isOfficialUrl(ad.href,ad.id),true);
 }
 assert.equal(isOfficialUrl('javascript:alert(1)','google'),false);
 assert.equal(isOfficialUrl('https://user:pass@example.com','google'),false);
 // Official brand association must be checked independently of HTTPS syntax.
 assert.equal(isOfficialUrl('https://www.google.com/','google'),true);
 assert.equal(isOfficialUrl('https://www.google.com/','apple-iphone'),false);
 assert.equal(isOfficialUrl('https://google.com.evil.example/','google'),false);
 assert.equal(isOfficialUrl('https://www.google.com/?redirect=https://evil.example','google'),false);
 assert.equal(isOfficialUrl('https://www.google.com/#other','google'),false);
 assert.equal(isOfficialUrl('https://www.google.com/','unreviewed-brand'),false);
 assert.equal(isOfficialUrl('https://www.google.com/'),false);
 assert.equal(isOfficialUrl('https://www.google.com/','__proto__'),false);
 assert.match(source('quick-ads.mjs'),/Independent website spotlight · not a paid ad/);
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
 assert.match(html,/quick-ads\.mjs\?v=20261029-house2/);
 assert.match(html,/quick-ads\.css\?v=20261028-game5b/);
 assert.ok(html.indexOf('quick-ads.mjs?v=20261029-house2')>html.indexOf('oracle-card-deck.js?v='));
 assert.match(ui,/quantaphi:switchboard-change/);
 assert.match(ui,/\['scheduled','live','house'\]\.includes\(status\)/);
 assert.match(ui,/Dismiss Quick Ads for 10 minutes/);
 assert.match(css,/prefers-reduced-motion/);
});
