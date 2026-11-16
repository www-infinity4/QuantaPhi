/* Owner-selected game-night placement. A front-page position is not proof of
 * live broadcast access; the verified scoreboard remains a separate signal. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.QuantaTVFrontPriority=api;})(globalThis,function(){
 'use strict';
 const GAME_PK=849799,START=Date.parse('2026-10-28T19:00:00-05:00'),END=START+18*60*60*1000;
 const KEY='quantaphi:tv-front-final:'+GAME_PK;
 function readFinal(storage){try{const saved=JSON.parse(storage?.getItem(KEY)||'null');return saved?.gamePk===GAME_PK&&saved?.status==='final'}catch{return false}}
 function remember(game,storage){
  if(!game||game.stale)return;
  try{if(game.status==='final')storage?.setItem(KEY,JSON.stringify({gamePk:GAME_PK,status:'final'}));else if(game.status==='live')storage?.removeItem(KEY)}catch{}
 }
 function shouldPin(game,now=Date.now(),finalSeen=false){
  if(!Number.isFinite(now)||now<START||now>END)return false;
  if(game?.status==='final'||game?.status==='unavailable')return false;
  if(game?.status==='live'&&!game.stale)return true;
  return !finalSeen;
 }
 return Object.freeze({GAME_PK,START,END,KEY,readFinal,remember,shouldPin});
});
