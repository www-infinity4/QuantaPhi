/* A schedule entry alone is never proof that a game is on air. */
export const LIVE_FRESH_MS=600000;
export const LIVE_GAME_MAX_MS=18*60*60*1000;
export function isLiveGame(game,now=Date.now()){
 if(!game||game.status!=='live'||game.stale||!Number.isFinite(now))return false;
 const checked=Date.parse(game.fetchedAt),start=Date.parse(game.start);
 return Number.isFinite(checked)&&Number.isFinite(start)&&
  checked<=now&&now-checked<=LIVE_FRESH_MS&&start<=now&&now-start<=LIVE_GAME_MAX_MS;
}
// Route to the publisher's current live program instead of retaining an old
// video ID after a daily stream ends. Provider errors remain visible in-player.
export function liveNewsEmbed(origin){
 const url=new URL('https://www.youtube-nocookie.com/embed/live_stream');
 url.searchParams.set('channel','UCJg9wBPyKMNA5sRDnvzmkdg');
 for(const [key,value] of Object.entries({autoplay:'1',mute:'1',playsinline:'1',controls:'1',enablejsapi:'1'}))url.searchParams.set(key,value);
 const parent=new URL(origin);
 if(!['https:','http:'].includes(parent.protocol))throw new Error('HTTP parent required');
 url.searchParams.set('origin',parent.origin);
 return url.href;
}
