import test from 'node:test';import assert from 'node:assert/strict';
import {espnGames,mlbGames,scoreboardUrl,fetchScoreboard,sportsUrl} from '../sports-card-data.mjs';
test('NBA and NFL provider data retain logos, records, real zero scores, leaders and broadcasters',()=>{
 const games=espnGames({events:[{id:'1',date:'2026-10-31T00:00:00Z',status:{type:{state:'in',shortDetail:'Q2 4:00'}},competitions:[{
  venue:{fullName:'Source Arena'},broadcasts:[{names:['FOX']}],competitors:[
   {homeAway:'home',score:'0',team:{id:'1',displayName:'Home',logo:'https://a.espncdn.com/h.png'},records:[{type:'total',summary:'3-1'}],statistics:[{abbreviation:'FG',displayValue:'0-1'}]},
   {homeAway:'away',score:'7',team:{id:'2',displayName:'Away',logo:'https://attacker.test/fake.png'},leaders:[{leaders:[{athlete:{displayName:'A Player'},displayValue:'7 PTS'}]}]}
  ]}]}]});
 assert.equal(games[0].live,true);assert.equal(games[0].teams[0].name,'Away');assert.equal(games[0].teams[1].score,'0');
 assert.equal(games[0].teams[0].logo,null);assert.equal(games[0].teams[1].record,'3-1');assert.match(games[0].teams[0].leader,/A Player/);assert.equal(games[0].broadcast,'FOX');
});
test('MLB exact source innings, R/H/E, pitchers and team image identities stay together',()=>{
 const g=mlbGames({dates:[{games:[{gamePk:123,status:{abstractGameState:'Live',detailedState:'In Progress'},seriesDescription:'World Series',
  teams:{away:{team:{id:158,name:'Milwaukee'},score:0,probablePitcher:{fullName:'Source Pitcher'}},home:{team:{id:139,name:'Tampa Bay'},score:2}},
  linescore:{currentInningOrdinal:'3rd',inningHalf:'Top',balls:1,strikes:2,outs:0,teams:{away:{runs:0,hits:1,errors:0}}}}]}]})[0];
 assert.equal(g.teams[0].score,'0');assert.match(g.status,/Top 3rd/);assert.deepEqual(g.teams[0].stats,['R 0','H 1','E 0']);assert.match(g.detail,/0 outs/);
 assert.equal(g.teams[0].logo,'https://www.mlbstatic.com/team-logos/158.svg');assert.match(g.teams[0].leader,/Source Pitcher/);
 const postponed=mlbGames({dates:[{games:[{gamePk:124,status:{abstractGameState:'Preview',detailedState:'Postponed'}}]}]})[0];
 assert.equal(postponed.badge,'UPDATE');assert.equal(postponed.live,false);
});
test('invalid sources and dates fail, HTTP errors never fabricate a scoreboard',async()=>{
 assert.equal(sportsUrl('https://espn.com.attacker.test/a'),null);assert.throws(()=>scoreboardUrl('other','2026-10-31'));
 assert.match(scoreboardUrl('mlb','2026-10-31'),/probablePitcher/);assert.match(scoreboardUrl('nba','2026-10-31'),/dates=20261031/);
 await assert.rejects(fetchScoreboard('nfl',null,{fetcher:async()=>({ok:false,status:503})}),/503/);
 assert.deepEqual(espnGames({}),[]);assert.deepEqual(mlbGames({}),[]);
});
