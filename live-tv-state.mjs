/* A schedule entry alone is never proof that a game is on air. */
export const LIVE_FRESH_MS=600000;
export const LIVE_GAME_MAX_MS=18*60*60*1000;
export const KYOU=Object.freeze({
 name:'KYOU · FOX 15.1',city:'Ottumwa, Iowa',
 logo:'https://webpubcontent.gray.tv/gray/arc-fusion-assets/images/logo-off-site/kyou.png?d=602&mxId=00000000',
 home:'https://www.kyoutv.com/',live:'https://www.kyoutv.com/livestream/',
 schedule:'https://www.kyoutv.com/programming/schedule/',guide:'https://www.kyoutv.com/page/channel-guide/'
});
// Attribution is requested from the station; it is not a verified audience or
// ad-impression receipt. Do not include visitor/wallet identifiers in referrals.
export function kyouReferralUrl(destination){
 if(!['home','live','schedule','guide'].includes(destination))return null;
 const url=new URL(KYOU[destination]);
 url.searchParams.set('utm_source','quantaphi');
 url.searchParams.set('utm_medium','referral');
 url.searchParams.set('utm_campaign','kyou_station_card');
 return url.href;
}
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
