import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 GAME_PK,TEAMS,MLB_URL,FOX_WATCH_URL,REFRESH_MS,GAME_START,CAMPAIGN_START,TONIGHT_END,
 game4FromSchedule,scoreText,isNotificationWindow,pregameReminderSlot
} from '../world-series-score.mjs';
const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const schedule=(status,away=0,home=0,linescore={})=>({
 dates:[{games:[{gamePk:GAME_PK,gameDate:'2026-10-29T00:00:00Z',
 status,seriesDescription:'World Series',
 teams:{away:{team:{id:TEAMS.away.id},score:away},home:{team:{id:TEAMS.home.id},score:home}},
 linescore}]}]
});
test('verified MLB Game 5 IDs and logo endpoints, FOX direct watch',()=>{
 assert.equal(GAME_PK,849799);
 assert.equal(TEAMS.away.id,158);assert.equal(TEAMS.home.id,139);
 assert.match(TEAMS.away.logo,/mlbstatic\.com\/team-logos\/158\.svg/);
 assert.match(TEAMS.home.logo,/mlbstatic\.com\/team-logos\/139\.svg/);
 assert.equal(new URL(FOX_WATCH_URL).hostname,'www.fox.com');
 assert.equal(new URL(MLB_URL).hostname,'statsapi.mlb.com');
});
test('score shows actual MLB values, including genuine 0 to 0 before first pitch',()=>{
 const game=game4FromSchedule(schedule({abstractGameState:'Preview',detailedState:'Pre-Game'},0,0));
 assert.equal(game.status,'pregame');
 assert.equal(game.away,0);assert.equal(game.home,0);
 assert.equal(scoreText(game),'0 – 0');
});
test('live data reflects updates with real inning not a hardcoded zero',()=>{
 const game=game4FromSchedule(schedule({abstractGameState:'Live',detailedState:'In Progress'},2,5,{currentInningOrdinal:'5th',inningHalf:'Bottom'}));
 assert.equal(game.status,'live');assert.equal(game.away,2);assert.equal(game.home,5);
 assert.equal(game.inning,'Bottom 5th');assert.equal(scoreText(game),'2 – 5');
});
test('unverified scores never default to zero and unrelated games are discarded',()=>{
 let game=game4FromSchedule(schedule({abstractGameState:'Live',detailedState:'In Progress'},null,undefined));
 assert.equal(game.away,null);assert.equal(game.home,null);assert.equal(scoreText(game),'— – —');
 const nonMatch=schedule({abstractGameState:'Live'},4,1);nonMatch.dates[0].games[0].gamePk=123;
 assert.equal(game4FromSchedule(nonMatch),null);
 assert.equal(game4FromSchedule(null),null);
});
test('final status and five-minute campaign expiry remain intact',()=>{
 const final=game4FromSchedule(schedule({abstractGameState:'Final',detailedState:'Final'},7,3));
 assert.equal(final.status,'final');assert.equal(scoreText(final),'7 – 3');
 assert.equal(REFRESH_MS,300000);
 assert.equal(isNotificationWindow(CAMPAIGN_START-1),false);
 assert.equal(isNotificationWindow(GAME_START-1),true);
 assert.equal(isNotificationWindow(GAME_START),true);
 assert.equal(isNotificationWindow(TONIGHT_END),true);
 assert.equal(isNotificationWindow(TONIGHT_END+1),false);
});
test('existing TV players remain while FOX channels extend the same TV grid',()=>{
 const html=load('index.html'),tv=load('phi-channel-cards.js'),newTv=load('fox-infinity-tv.mjs');
 assert.match(tv,/StarQuest/);assert.match(tv,/Omni TV/);assert.match(tv,/Chiller/);assert.match(tv,/ShopLC/);
 assert.match(html,/id="phiChannelCards"/);
 assert.match(html,/fox-infinity-tv\.mjs\?v=20261028-game5/);
 assert.match(html,/world-series-updates\.mjs\?v=20261028-game5/);
 assert.match(html,/fox-infinity-tv\.css\?v=20261028-game5/);
 assert.match(newTv,/#phiChannelCards \.channelphi-grid/);
 for(const word of ['FOX · World Series','FOX One · Live TV','FOX Sports','FOX News'])assert.ok(newTv.includes(word));
 assert.match(newTv,/Try FOX in Infinity Viewer/);
 assert.match(newTv,/closeFrame\(\)/);
});
test('five-minute notifications use live scores and full FOX Infinity Viewer URL, never illegal stream',()=>{
 const updates=load('world-series-updates.mjs'),viewer=load('infinity-tv/fox.html');
 const quickAds=load('quick-ads.mjs'),styles=load('fox-infinity-tv.css');
 assert.match(updates,/setInterval\(\(\)=>\{/);
 assert.match(updates,/REFRESH_MS/);
 assert.match(updates,/game\.status!=='live'/);
 assert.match(updates,/world-series-toast/);
 assert.match(updates,/infinity-tv\/fox\.html\?channel=world-series/);
 assert.match(quickAds,/scoreAdSuppressedUntil/);
 assert.match(viewer,/id="foxInfinityViewer"/);
 assert.match(styles,/prefers-reduced-motion:reduce/);
});

test('pregame reminder cadence advances every fifteen minutes and stops at first pitch',()=>{
 const afternoon=Date.parse('2026-10-28T14:00:00-05:00');
 assert.equal(pregameReminderSlot(afternoon),pregameReminderSlot(afternoon+899999));
 assert.equal(pregameReminderSlot(afternoon+900000),pregameReminderSlot(afternoon)+1);
 assert.equal(pregameReminderSlot(GAME_START),null);
 assert.equal(pregameReminderSlot(CAMPAIGN_START-1),null);
});
