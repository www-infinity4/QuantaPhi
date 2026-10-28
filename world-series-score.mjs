/* Verified schedule-based World Series Game 4 data. Never manufacture a score.
 * Independent QuantaPhi game center; broadcaster rights remain with FOX.
 */
export const GAME_PK=849803;
export const MLB_URL='https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=10/27/2026&hydrate=linescore';
export const FOX_WATCH_URL='https://www.fox.com/sports/baseball/mlb/watch-milwaukee-brewers-vs-tampa-bay-rays-game-4-world-series-oct-27-2026';
export const FOX_LIVE_URL='https://www.fox.com/';
export const FOX_NEWS_URL='https://www.fox.com/stream/fox-news';
export const FOX_SPORTS_URL='https://www.foxsports.com/mlb';
export const GAME_START=Date.parse('2026-10-27T19:00:00-05:00');
export const TONIGHT_END=Date.parse('2026-10-27T23:59:59-05:00');
export const REFRESH_MS=300000;
export const TEAMS=Object.freeze({
  away:Object.freeze({id:158,abbr:'MIL',name:'Milwaukee Brewers',logo:'https://www.mlbstatic.com/team-logos/158.svg'}),
  home:Object.freeze({id:139,abbr:'TB',name:'Tampa Bay Rays',logo:'https://www.mlbstatic.com/team-logos/139.svg'})
});
export function game4FromSchedule(payload){
 const games=(Array.isArray(payload?.dates)?payload.dates:[]).flatMap(d=>Array.isArray(d.games)?d.games:[]);
 const game=games.find(g=>Number(g?.gamePk)===GAME_PK
  &&Number(g?.teams?.away?.team?.id)===TEAMS.away.id
  &&Number(g?.teams?.home?.team?.id)===TEAMS.home.id);
 if(!game)return null;
 const abstract=String(game.status?.abstractGameState||'').toLowerCase();
 const detailed=String(game.status?.detailedState||'');
 const isFinal=abstract==='final'||/final|completed|game over/i.test(detailed);
 const isLive=abstract==='live'||/in progress|manager challenge|mid.*inning/i.test(detailed);
 const away=Number(game.teams.away.score),home=Number(game.teams.home.score);
 const validScore=v=>Number.isInteger(v)&&v>=0&&v<=200;
 const status=isFinal?'final':isLive?'live':abstract==='preview'?'pregame':'unknown';
 const hasScore=validScore(away)&&validScore(home);
 const linescore=game.linescore||{};
 const ordinal=typeof linescore.currentInningOrdinal==='string'?linescore.currentInningOrdinal:'';
 const half=typeof linescore.inningHalf==='string'?linescore.inningHalf:'';
 const inning=status==='live'&&ordinal?[half,ordinal].filter(Boolean).join(' '):'';
 return {
  gamePk:GAME_PK,away:hasScore?away:null,home:hasScore?home:null,
  status,detail:detailed||'Status unavailable',inning,
  start:game.gameDate||new Date(GAME_START).toISOString(),
  fetchedAt:null
 };
}
export const isNotificationWindow=(now=Date.now())=>Number.isFinite(now)&&now>=GAME_START&&now<=TONIGHT_END;
export const scoreText=game=>game&&game.away!==null&&game.home!==null?game.away+' – '+game.home:'— – —';
let lastResult=null,lastAttempt=0,pending=null;
export async function fetchWorldSeries({force=false}={}){
 const now=Date.now();
 if(!force&&lastResult&&now-lastAttempt<REFRESH_MS)return lastResult;
 if(pending)return pending;
 lastAttempt=now;
 pending=(async()=>{
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),8500);
  try{
   const response=await fetch(MLB_URL,{signal:controller.signal,cache:'no-store',credentials:'omit'});
   if(!response.ok)throw new Error('MLB feed unavailable');
   const game=game4FromSchedule(await response.json());
   if(!game)throw new Error('Game 4 not present in verified MLB schedule');
   lastResult={...game,fetchedAt:new Date().toISOString(),source:'MLB Stats API'};
  }catch{
   // A previously sourced score remains readable with its timestamp, never
   // passed off as fresh. Nothing defaults to 0-0 after a feed failure.
   lastResult=lastResult?{...lastResult,stale:true}:null;
  }finally{clearTimeout(timeout);pending=null;}
  return lastResult;
 })();
 return pending;
}
