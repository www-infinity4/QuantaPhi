import test from 'node:test';
import assert from 'node:assert/strict';
import {isLiveGame,liveNewsEmbed,LIVE_FRESH_MS,LIVE_GAME_MAX_MS} from '../live-tv-state.mjs';
import {gameFromSchedule,GAME_PK,TEAMS} from '../world-series-score.mjs';
const now=Date.parse('2026-10-29T01:00:00Z');
const live={status:'live',start:'2026-10-29T00:00:00Z',fetchedAt:new Date(now).toISOString()};
test('only a fresh, currently running game is pinned, including play after midnight',()=>{
 assert.equal(isLiveGame(live,now),true);
 assert.equal(isLiveGame({...live,start:'2026-10-28T23:30:00Z'},now),true);
 for(const status of ['pregame','final','unavailable','unknown'])assert.equal(isLiveGame({...live,status},now),false);
 for(const value of [null,{}, {...live,stale:true},{...live,start:'invalid'},{...live,fetchedAt:null},{...live,fetchedAt:'invalid'}])assert.equal(isLiveGame(value,now),false);
});
test('live pins expire after feed failure, reject future checks and never revive yesterday’s game',()=>{
 assert.equal(isLiveGame(live,now+LIVE_FRESH_MS),true);
 assert.equal(isLiveGame(live,now+LIVE_FRESH_MS+1),false);
 assert.equal(isLiveGame(live,now-1),false);
 assert.equal(isLiveGame({...live,start:new Date(now+1).toISOString()},now),false);
 assert.equal(isLiveGame({...live,start:new Date(now-LIVE_GAME_MAX_MS-1).toISOString()},now),false);
 assert.equal(isLiveGame(live,NaN),false);
});
test('the MLB detailed delay/postponement guard also suppresses carousel priority',()=>{
 for(const detailedState of ['Postponed','Cancelled','Suspended','Delayed Start']){
  const schedule={dates:[{games:[{gamePk:GAME_PK,gameDate:live.start,status:{abstractGameState:'Live',detailedState},teams:{away:{team:{id:TEAMS.away.id},score:2},home:{team:{id:TEAMS.home.id},score:1}}}]}]};
  assert.equal(isLiveGame({...gameFromSchedule(schedule),fetchedAt:live.fetchedAt},now),false);
 }
});
test('live news requests the official channel inline, muted, with controls and a parent origin',()=>{
 const u=new URL(liveNewsEmbed('https://quantaphi.org/'));
 assert.equal(u.origin,'https://www.youtube-nocookie.com');
 assert.equal(u.pathname,'/embed/live_stream');
 assert.equal(u.searchParams.get('channel'),'UCJg9wBPyKMNA5sRDnvzmkdg');
 for(const key of ['autoplay','mute','playsinline','controls','enablejsapi'])assert.equal(u.searchParams.get(key),'1');
 assert.equal(u.searchParams.get('origin'),'https://quantaphi.org');
 assert.throws(()=>liveNewsEmbed('file:///tmp/site.html'));
});
test('concurrent scoreboard consumers await the new final result instead of cached live data',async t=>{
 let clock=now,requests=0,finish;
 const payload=status=>({dates:[{games:[{gamePk:GAME_PK,gameDate:live.start,status:{abstractGameState:status,detailedState:status==='Live'?'In Progress':'Final'},teams:{away:{team:{id:TEAMS.away.id},score:2},home:{team:{id:TEAMS.home.id},score:1}}}]}]});
 t.mock.method(Date,'now',()=>clock);
 t.mock.method(globalThis,'fetch',()=>{
  requests++;
  if(requests===1)return Promise.resolve({ok:true,json:async()=>payload('Live')});
  return new Promise(resolve=>{finish=()=>resolve({ok:true,json:async()=>payload('Final')})});
 });
 const {fetchWorldSeries,REFRESH_MS}=await import('../world-series-score.mjs?live-tv-concurrency-test');
 assert.equal((await fetchWorldSeries()).status,'live');
 clock+=REFRESH_MS+1;
 const notification=fetchWorldSeries({force:true}),carousel=fetchWorldSeries();
 assert.equal(requests,2);finish();
 const results=await Promise.all([notification,carousel]);
 assert.deepEqual(results.map(r=>r.status),['final','final']);
 assert.equal(requests,2);
});
