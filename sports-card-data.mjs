/* Current provider data, shared by the main carousel and Trending explorer. */
const shorten=(v,n=120)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,n);
export function sportsUrl(value,hosts=['espn.com','espncdn.com','mlb.com','mlbstatic.com']){
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&hosts.some(h=>u.hostname===h||u.hostname.endsWith('.'+h))?u.href:null}catch{return null}
}
const numeric=v=>v!==null&&v!==undefined&&/^\d+(?:\.\d+)?$/.test(String(v))?String(v):null;
export function espnGames(data,league='nba'){
 return (Array.isArray(data?.events)?data.events:[]).slice(0,30).flatMap(event=>{
  const competition=event.competitions?.[0];if(!competition||!Array.isArray(competition.competitors)||competition.competitors.length!==2)return [];
  const state=event.status?.type?.state||competition.status?.type?.state||'pre';
  const teams=competition.competitors.map(c=>({id:String(c.team?.id||''),name:shorten(c.team?.displayName||c.team?.name,70),
   abbreviation:shorten(c.team?.abbreviation,8),logo:sportsUrl(c.team?.logo),score:state==='pre'?null:numeric(c.score),
   record:shorten(c.records?.find(x=>x.type==='total')?.summary||c.records?.[0]?.summary,50),
   stats:(c.statistics||[]).filter(s=>s.displayValue!==undefined&&(state==='pre'?/^avg/.test(s.name||''):!/^avg/.test(s.name||''))).filter((s,i,all)=>all.findIndex(x=>(x.abbreviation||x.name)===(s.abbreviation||s.name))===i).slice(0,3).map(s=>shorten(s.abbreviation||s.shortDisplayName||s.name,22)+' '+shorten(s.displayValue,30)),
   statContext:state==='pre'?'Season averages':'Game stats',
   leader:(c.leaders||[]).slice(0,1).map(l=>{const p=l.leaders?.[0];return p?shorten(p.athlete?.displayName,55)+' · '+shorten(p.displayValue,45):''}).filter(Boolean).join('')
  })).sort((a,b)=>Number(competition.competitors.find(c=>String(c.team?.id)===a.id)?.homeAway==='home')-Number(competition.competitors.find(c=>String(c.team?.id)===b.id)?.homeAway==='home'));
  const live=state==='in',finished=state==='post';
  const label=shorten(event.status?.type?.shortDetail||event.status?.type?.detail||event.status?.type?.description||'Scheduled');
  return [{id:String(event.id),teams,live,finished,status:label,badge:/postponed|canceled|cancelled|delayed/i.test(label)?'UPDATE':live?'LIVE':finished?'FINAL':'SCHEDULED',date:event.date,
   venue:shorten(competition.venue?.fullName),broadcast:shorten((competition.broadcasts||[]).flatMap(b=>b.names||[]).join(' · ')),
   detail:shorten(competition.headlines?.[0]?.shortLinkText||competition.notes?.[0]?.headline||''),
   url:(event.links||[]).map(l=>sportsUrl(l.href,['espn.com'])).find(Boolean)||'https://www.espn.com/'+league+'/scoreboard'}];
 });
}
export function mlbGames(data){
 return (data?.dates||[]).flatMap(d=>d.games||[]).slice(0,30).map(game=>{
  const line=game.linescore||{};
  const teams=['away','home'].map(side=>{const c=game.teams?.[side]||{},stats=line.teams?.[side]||{},id=Number(c.team?.id);
   return {id:String(id||''),name:shorten(c.team?.name,70),abbreviation:shorten(c.team?.abbreviation,8),
    logo:Number.isInteger(id)&&id>0?'https://www.mlbstatic.com/team-logos/'+id+'.svg':null,
    score:numeric(c.score),record:c.leagueRecord?c.leagueRecord.wins+'–'+c.leagueRecord.losses:'',
    stats:[['R',stats.runs],['H',stats.hits],['E',stats.errors]].filter(([,v])=>numeric(v)!==null).map(([k,v])=>k+' '+v),
    leader:c.probablePitcher?.fullName?'Pitching · '+shorten(c.probablePitcher.fullName,65):''};
  });
  const state=game.status?.abstractGameState,live=state==='Live',finished=state==='Final';
  const inning=live&&line.currentInningOrdinal?' · '+shorten(line.inningHalf,10)+' '+shorten(line.currentInningOrdinal,10):'';
  const count=live?['balls','strikes','outs'].filter(k=>numeric(line[k])!==null).map(k=>line[k]+' '+k).join(' · '):'';
  return {id:String(game.gamePk),teams,live,finished,date:game.gameDate,
   status:shorten(game.status?.detailedState||state||'Scheduled')+inning,series:shorten(game.seriesDescription),
   venue:shorten(game.venue?.name),broadcast:shorten((game.broadcasts||[]).map(b=>b.name).filter(Boolean).join(' · ')),
   detail:count||shorten(game.seriesGameNumber?'Series game '+game.seriesGameNumber:''),
   url:Number.isInteger(game.gamePk)&&game.gamePk>0?'https://www.mlb.com/gameday/'+game.gamePk:'https://www.mlb.com/scores'};
 });
}
export function scoreboardUrl(league,date){
 if(!['nba','nfl','mlb'].includes(league)||date&&!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('unsupported_scoreboard');
 if(league==='mlb')return 'https://statsapi.mlb.com/api/v1/schedule?'+new URLSearchParams({sportId:'1',date,hydrate:'team,linescore,probablePitcher,broadcasts'});
 return 'https://site.api.espn.com/apis/site/v2/sports/'+(league==='nfl'?'football/nfl':'basketball/nba')+'/scoreboard'+(date?'?dates='+date.replace(/-/g,''):'');
}
const cached=new Map();
export async function fetchScoreboard(league,date,{signal,fetcher=fetch}={}){
 const url=scoreboardUrl(league,date),previous=cached.get(url);
 if(previous&&Date.now()-previous.checked<60000)return previous;
 const response=await fetcher(url,{signal:signal||AbortSignal.timeout(12000),cache:'no-store',credentials:'omit',headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('Provider returned '+response.status);
 const data=await response.json(),games=league==='mlb'?mlbGames(data):espnGames(data,league);
 const result={games,checked:Date.now()};cached.set(url,result);return result;
}
const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
export function renderSportsGame(game){
 const card=el('article','gt-game gt-rich-game'),top=el('header','gt-game-top');
 top.append(el('strong','gt-state'+(game.live?' gt-live':''),game.badge||(game.live?'LIVE':game.finished?'FINAL':'SCHEDULED')),el('span','gt-series',game.series||'MATCH CENTER'));
 const match=el('div','gt-match');
 for(const team of game.teams){const item=el('div','gt-team');
  if(team.logo){const img=el('img','gt-team-logo');img.src=team.logo;img.alt=team.name+' logo';img.decoding='async';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.remove(),{once:true});item.append(img)}
  item.append(el('strong','',team.name),el('span','gt-record',team.record),el('span','gt-score',team.score??'—'));
  if(team.stats.length)item.append(el('p','gt-team-stats',(team.statContext?team.statContext+' · ':'')+team.stats.join(' · ')));
  if(team.leader)item.append(el('p','gt-leader',team.leader));match.append(item);
 }
 card.append(top,match,el('p','gt-game-status',game.status));
 const when=Date.parse(game.date);if(Number.isFinite(when))card.append(el('p','gt-fine',new Date(when).toLocaleString(undefined,{timeZone:'America/Chicago',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' Central'));
 if(game.venue||game.broadcast)card.append(el('p','gt-fine',[game.venue,game.broadcast].filter(Boolean).join(' · ')));
 if(game.detail)card.append(el('p','gt-game-detail',game.detail));
 const link=el('a','gt-link','Full stats & play-by-play ↗');link.href=game.url;link.target='_blank';link.rel='noopener noreferrer';card.append(link);return card;
}
export function mountCurrentSports(host,card){
 const league=card.event?.toLowerCase();if(!['mlb','nfl'].includes(league))return;
 const panel=el('section','vbs-current-scores'),title=el('h4','vbs-news-title','Current '+league.toUpperCase()+' scoreboard');
 const status=el('p','gt-status','Open this card to check the current source scoreboard.'),list=el('div','gt-games'),refresh=el('button','gt-control','Refresh scores');refresh.type='button';
 panel.append(title,status,list,refresh);host.querySelector('.vbs-info')?.prepend(panel);
 let busy=false,last=0;const visible=()=>!document.hidden&&host.getClientRects().length>0;
 async function load(){if(busy||Date.now()-last<60000)return;busy=true;refresh.disabled=true;
  try{const day=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   const data=await fetchScoreboard(league,league==='mlb'?day:null);
   if(!visible())return;
   list.replaceChildren(...data.games.slice(0,6).map(renderSportsGame));last=data.checked;
   status.textContent=(data.games.length?data.games.length+' games returned':'No games returned')+' · source checked '+new Date(data.checked).toLocaleTimeString()+' · '+(league==='mlb'?'MLB':'ESPN')+' data may be delayed';
  }catch{status.textContent='Scores unavailable. The official scoreboard links below remain available.'}
  finally{busy=false;refresh.disabled=false}
 }
 host.addEventListener('oracle:activate',()=>void load());refresh.addEventListener('click',()=>{last=0;void load()});
 const timer=setInterval(()=>{if(!host.isConnected){clearInterval(timer);return}if(visible())void load()},300000);
 document.addEventListener('visibilitychange',()=>{if(visible())void load()});
}
