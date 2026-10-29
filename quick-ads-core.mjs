import {GAME_START,CAMPAIGN_START,TONIGHT_END,GAME_PK} from './world-series-score.mjs?v=20261028-game5b';
export {GAME_START,CAMPAIGN_START};
/* QuantaPhi independent Quick Ads: bounded game campaign plus first-party house successor; no paid-sponsor assertions.
 * Public outbound destinations are a reviewed allowlist; no unapproved scraping,
 * alcohol, gambling, cookies, wallet reads or API keys. */
export const GAME_END=TONIGHT_END;
const ad=(id,name,tagline,category,href,tone,primary=false)=>Object.freeze({
 id,name,tagline,category,href,tone,primary
});
// Prospective independent site spotlights, NOT QuantaPhi's paid advertisers.
// Brands under age-restricted / regulated advertising require separate review.
export const QUICK_ADS=Object.freeze([
 ad('capital-one','Capital One','Explore banking, cards and travel rewards','finance','https://www.capitalone.com/','#064999',true),
 ad('t-mobile','T-Mobile','See wireless plans and connected devices','technology','https://www.t-mobile.com/','#de147d',true),
 ad('google-cloud','Google Cloud','Discover tools for building with AI','technology','https://cloud.google.com/','#3579d4',true),
 ad('apple-tv','Apple TV','Find series, films and streaming originals','media','https://tv.apple.com/','#202930',true),
 ad('mastercard','Mastercard','Explore ways to pay and manage money','finance','https://www.mastercard.com/','#d74d19',true),
 ad('att','AT&T','Find internet, wireless and device plans','technology','https://www.att.com/','#0079bb',true),
 ad('starbucks','Starbucks','Explore drinks, food and rewards','shopping','https://www.starbucks.com/','#006b4d',true),
 ad('liberty-mutual','Liberty Mutual','Compare insurance coverage choices','finance','https://www.libertymutual.com/','#174679',true),
 ad('progressive','Progressive','Explore auto and home insurance','finance','https://www.progressive.com/','#1769b3',true),
 ad('fox-nation','FOX Nation','Explore documentaries and entertainment','media','https://nation.foxnews.com/','#204e84',true),
 ad('fox-shows','FOX','Explore FOX primetime and current shows','media','https://www.fox.com/','#194874',true),
 ad('mlb-shop','MLB Shop','Browse officially licensed team gear','sports','https://www.mlbshop.com/','#06457d',true),
 ad('mlb','MLB','World Series scores, recaps and highlights','sports','https://www.mlb.com/postseason','#103b69'),
 ad('fox-sports','FOX Sports','Watch highlights and World Series coverage','sports','https://www.foxsports.com/mlb','#164b88'),
 ad('youtube','YouTube','Watch the latest sports and entertainment videos','media','https://www.youtube.com/','#d82332'),
 ad('google','Google','Find more websites and useful answers','technology','https://www.google.com/','#2361ad'),
 ad('best-buy','Best Buy','Shop electronics and useful accessories','technology','https://www.bestbuy.com/','#113a84'),
 ad('ebay','eBay','Discover collectibles and vintage finds','shopping','https://www.ebay.com/','#d44636'),
 ad('walmart','Walmart','Explore groceries and everyday essentials','shopping','https://www.walmart.com/','#1378bf'),
 ad('apple-iphone','Apple iPhone','Explore iPhone models at Apple','technology','https://www.apple.com/iphone/','#202930'),
 ad('helzberg','Helzberg Diamonds','Explore jewelry at the official Helzberg store','shopping','https://www.helzberg.com/','#843e6c'),
 ad('infinity-affiliates','Infinity Affiliates','Explore Infinity Accepted brands and product affiliations','shopping','https://quantaphi.org/infinity-affiliates.html','#135e9d')
]);
// Verified MLB Game 5 final (October 28, 2026) ends the event campaign.
// The successor promotes only QuantaPhi's own already-published catalog and
// review page; accepted brands are not sponsors, affiliates or warranties.
export const HOUSE_START=GAME_END+1;
export const HOUSE_ADS=Object.freeze([
 ad('infinity-accepted-house','Infinity Accepted','Browse 116 owner-curated brand cards and official product sources','shopping','https://quantaphi.org/infinity-accepted.html','#135e9d'),
 ad('infinity-affiliates-house','Infinity Affiliates','Match a product to an accepted brand and request independent review','shopping','https://quantaphi.org/infinity-affiliates.html','#0d6175')
]);
export function quickAdCampaign(now=Date.now()){
 if(!Number.isFinite(now)||now<CAMPAIGN_START)return 'inactive';
 return now<=GAME_END?'world-series':'infinity-house';
}
export function inGameWindow(now=Date.now()){
 return Number.isFinite(now)&&now>=CAMPAIGN_START&&now<=GAME_END;
}
export function isOfficialUrl(href){
 try{const u=new URL(href);return u.protocol==='https:'&&!u.username&&!u.password&&u.hostname.includes('.');}
 catch{return false;}
}
export function gameLiveStatus(payload){
 const games=(payload?.dates||[]).flatMap(d=>Array.isArray(d.games)?d.games:[]);
 const game=games.find(g=>Number(g?.gamePk)===GAME_PK);
 if(!game)return 'unknown';
 const state=String(game.status?.abstractGameState||'').toLowerCase();
 const detailed=String(game.status?.detailedState||'').toLowerCase();
 // MLB can retain Preview/Live while the more-specific status stops play.
 if(/postpon|cancel|suspend|delay/.test(detailed))return 'unavailable';
 if(state==='live'||detailed==='in progress'||detailed==='manager challenge')return 'live';
 if(state==='final'||/final|completed|game over/.test(detailed))return 'final';
 if(state==='preview'||/scheduled|warmup|pre-game/.test(detailed))return 'scheduled';
 return 'unknown';
}
export function eligibleQuickAds(now=Date.now()){
 const campaign=quickAdCampaign(now);
 const ads=campaign==='world-series'?QUICK_ADS:campaign==='infinity-house'?HOUSE_ADS:[];
 return ads.filter(a=>isOfficialUrl(a.href));
}
// Session-first rotation: never replay the same ad while a different unseen one
// exists, then restart the queue with adjacent/topic relevance and view penalty.
export function chooseQuickAd(context={},viewCounts={},recent=[],now=Date.now()){
 const eligible=eligibleQuickAds(now);if(!eligible.length)return null;
 const unseen=eligible.filter(a=>!(Number(viewCounts[a.id])>0));
 let pool=unseen.length?unseen:eligible;
 const withoutRecent=pool.filter(a=>!recent.includes(a.id));
 if(withoutRecent.length)pool=withoutRecent;
 const topic=String(context.category||'').toLowerCase();
 const card=String(context.title||'').toLowerCase();
 const media=/music|video|radio|tv|film|entertain|media/.test(topic+' '+card);
 const sports=/sport|mlb|baseball|world series|brewers|rays/.test(topic+' '+card);
 const tech=/ai|technology|science|research|software|coding/.test(topic+' '+card);
 const shopping=/shop|store|product|coin|card|collectible|grocery/.test(topic+' '+card);
 const target=sports?'sports':tech?'technology':shopping?'shopping':media?'media':topic.includes('finance')?'finance':null;
 const priority=pool.map((a,i)=>({a,score:
  (a.category===target?6:0)+(sports&&a.primary?2:0)
  -(Number(viewCounts[a.id])||0)*2+
  // Smoothly vary ties using carousel context rather than a fixed advert order.
  ((card.length+i*7+String(context.id||'').length)%5)/10
 })).sort((x,y)=>y.score-x.score||x.a.id.localeCompare(y.a.id));
 return priority[0]?.a||null;
}
