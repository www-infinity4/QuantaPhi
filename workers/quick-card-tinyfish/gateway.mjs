/* TinyFish public website research adapter for continuity-session-coordinator.
 * Mount behind POST /v1/quick-cards/tinyfish and forward from first-party site.
 * Uses existing coordinator TINYFISH_API_KEY and TINYFISH_BRIDGE_TOKEN secrets.
 * Does not permit account access, ChatGPT conversation automation or writing.
 */
export const WEBSITE_CARDS=Object.freeze({
 starmaker:'https://www.starmakerstudios.com/en/songs',
 youtube:'https://www.youtube.com/',
 reddit:'https://www.reddit.com/r/popular/',
 x:'https://x.com/explore',
 tiktok:'https://www.tiktok.com/explore',
 cnn:'https://www.cnn.com/',
 'fox-news':'https://www.foxnews.com/',
 'yahoo-news':'https://news.yahoo.com/',
 'tv-guide':'https://www.tvguide.com/',
 'fox-one':'https://www.fox.com/',
 'fox-one-live-news':'https://www.fox.com/stream/fox-news',
 facebook:'https://www.facebook.com/',
 instagram:'https://www.instagram.com/',

 'vamworld':"https://vamworld.com/",
 'pcgs':"https://www.pcgs.com/coinfacts",
 'ngc':"https://www.ngccoin.com/coin-explorer/",
 'heritage':"https://coins.ha.com/",
 'topps':"https://www.topps.com/",
 'beckett':"https://www.beckett.com/",
 'christies':"https://www.christies.com/",
 'morrison-hotel-gallery':"https://morrisonhotelgallery.com/",
 'rolling-stone':"https://www.rollingstone.com/",
 'coinworld':"https://www.coinworld.com/",
 'coinage':"https://www.coinagemag.com/",
 'shoplc-premium':"https://www.shoplc.com/collections/chairmans-collection",
 'sonic':"https://pages-a.sonicdrivein.com/deals/",
 'burger-king':"https://www.bk.com/",
 'mcdonalds':"https://www.mcdonalds.com/us/en-us/deals.html",
 'loc':"https://www.loc.gov/collections/",
 'nasa-library':"https://images.nasa.gov/",
 'pepe-brooke':"https://www.pepejeans.com/uk/en_gb/pd/iconic-brooke---low-rise-slim-fit-jeans-PL20506284UA.html",
 'pepe-vapour':"https://www.pepejeans.in/vapour-dark-blue-low-rise-tapered-jeans/PM207785J671.html",
 'guess-g11-light':"https://www.guess.com/en-us/guess-jeans/denim/women/jeans/g11-wide-leg-jeans-blue/W4BA0YD5CCA-GJRV.html",
 'guess-g11-dark':"https://www.guess.com/en-us/guess-jeans/denim/women/jeans/g11-wide-leg-jeans-blue/W5RA0YD5M42-GJHR.html",
 'levis-501-dark':"https://www.levi.com/US/en_US/clothing/men/jeans/straight/501-original-fit-mens-jeans/p/005013373",
 'levis-501-medium':"https://www.levi.com/US/en_US/clothing/men/jeans/straight/501-original-fit-mens-jeans/p/005013306",
 'packers-lions-2026':"https://www.packers.com/game-day/2026/reg-week7/packers-at-lions/",
 'fox-nfl-watch':"https://www.foxsports.com/nfl",
 'lions-interception-watch':"https://www.detroitlions.com/game-day/2026/reg-week7/packers-vs-lions/",
 'packers-next-schedule':"https://www.packers.com/schedule/",
 'lions-next-schedule':"https://www.detroitlions.com/schedule/",
 'world-series-game3-2026':"https://www.mlb.com/postseason",
 'world-series-pitchers-2026':"https://www.mlb.com/brewers/news/brewers-rays-world-series-game-3-starting-lineups-and-pitching-matchup",
 'world-series-lineups-2026':"https://www.mlb.com/brewers/news/brewers-rays-world-series-game-3-starting-lineups-and-pitching-matchup",
 'world-series-game2-highlights':"https://www.mlb.com/video/rays-vs-brewers-game-2-highlights",
 'world-series-game1-recap':"https://www.mlb.com/postseason",
 'world-series-future-games':"https://www.mlb.com/postseason",
 'hidden-valley-ranch':"https://www.hiddenvalley.com/",
 'kohls-coupons':"https://www.kohls.com/sale-event/todays-deals.jsp",
 'honda-vehicles':"https://automobiles.honda.com/vehicles",
 'oakley-meta':"https://www.oakley.com/en-us/oakley-meta-faq",
 'gmc-trucks':"https://www.gmc.com/trucks",
 'gmc-sierra-2026':"https://www.gmc.com/trucks/sierra/1500",
 'gmc-denali-2026':"https://www.gmc.com/trucks/sierra/1500/denali",
 'carhartt-shop':"https://www.carhartt.com/",
 'des-moines-register':"https://www.desmoinesregister.com/",
 'miller-meeks-ia1':"https://millermeeks.house.gov/",
 'zach-nunn-ia3':"https://nunn.house.gov/",
 'hurley-surfwear':"https://www.hurley.com/",
 'colorectal-screening':"https://www.cancer.gov/types/colorectal/screening-fact-sheet",
 'burger-king-chicken-2026':"https://news.bk.com/blog-posts/burger-king-r-expands-its-iconic-original-chicken-sandwich-lineup-with-two-bold-new-flavors",
 'royal-caribbean-cruises':"https://www.royalcaribbean.com/",
 'kraft-mac-cheese':"https://www.kraftheinz.com/kraft-mac-and-cheese",
 'tucker-kraft-plays':"https://www.packers.com/team/players-roster/",
 'ai-game-announcer':"https://www.nfl.com/schedules/",
});
const HEADERS={'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Vary':'Origin'};
const APPROVED=new Set(['https://quantaphi.org','https://www.quantaphi.org']);
const json=(body,status=200,origin='')=>Response.json(body,{status,headers:{...HEADERS,...(APPROVED.has(origin)?{'Access-Control-Allow-Origin':origin}: {})}});
export function extractAgentResult(raw){
 const chunks=String(raw||'').split(/\r?\n/);
 let complete=null;
 for(const chunk of chunks){
  if(!chunk.startsWith('data:'))continue;
  let event;try{event=JSON.parse(chunk.slice(5).trim())}catch{continue}
  if(event.type==='COMPLETE')complete=event;
 }
 if(!complete||complete.status!=='COMPLETED')return null;
 const payload=complete.resultJson??complete.result;
 if(payload==null)return null;
 const parsed=typeof payload==='string'?payload:JSON.stringify(payload);
 return parsed.trim().slice(0,5000)||null;
}
export function validateCardBrowse(body){
 if(!body||typeof body!=='object'||Array.isArray(body))return null;
 const cardId=String(body.cardId||'');
 if(!Object.hasOwn(WEBSITE_CARDS,cardId))return null;
 const query=typeof body.query==='string'?body.query.trim():'';
 if(query.length<3||query.length>240||/[\x00-\x08\x0e-\x1f]/.test(query))return null;
 return {cardId,query,sourceUrl:WEBSITE_CARDS[cardId]};
}
async function acquireQuota(env,request){
 if(!env.WORK_DB||!env.TINYFISH_BRIDGE_TOKEN)return false;
 const ip=request.headers.get('CF-Connecting-IP')||'unknown';
 const raw=new TextEncoder().encode(env.TINYFISH_BRIDGE_TOKEN+'|'+ip);
 const id=[...new Uint8Array(await crypto.subtle.digest('SHA-256',raw))].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,30);
 const hour=Math.floor(Date.now()/3600000),day=Math.floor(Date.now()/86400000);
 await env.WORK_DB.prepare('CREATE TABLE IF NOT EXISTS tinyfish_card_quota (bucket TEXT PRIMARY KEY,hits INTEGER NOT NULL)').run();
 const bump=async (key,cap)=>{
  const row=await env.WORK_DB.prepare('INSERT INTO tinyfish_card_quota (bucket,hits) VALUES (?,1) ON CONFLICT(bucket) DO UPDATE SET hits=hits+1 WHERE hits<? RETURNING hits').bind(key,cap).first();
  return Boolean(row?.hits);
 };
 if(!await bump('ip:'+hour+':'+id,4))return false;
 return bump('global:'+day,80);
}
export async function handleTinyfishCard(request,env,fetcher=fetch){
 const origin=request.headers.get('Origin')||'';
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{
  ...HEADERS,...(APPROVED.has(origin)?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type'}:{})}});
 if(request.method!=='POST')return json({ok:false,error:'method_not_allowed'},405,origin);
 if(!APPROVED.has(origin))return json({ok:false,error:'origin_not_allowed'},403,origin);
 if(!String(request.headers.get('Content-Type')||'').startsWith('application/json'))return json({ok:false,error:'content_type_required'},415,origin);
 const size=Number(request.headers.get('Content-Length')||'0');
 if(size>2048)return json({ok:false,error:'body_too_large'},413,origin);
 let body;try{body=await request.json()}catch{return json({ok:false,error:'invalid_json'},400,origin)}
 const data=validateCardBrowse(body);
 if(!data)return json({ok:false,error:'unknown_card_or_query'},400,origin);
 if(!env.TINYFISH_API_KEY)return json({ok:false,error:'gateway_unavailable'},503,origin);
 try{if(!await acquireQuota(env,request))return json({ok:false,error:'usage_limit_reached'},429,origin)}
 catch{return json({ok:false,error:'rate_limit_unavailable'},503,origin)}
 const goal='Read only PUBLIC web pages belonging to this website. Do not log in, submit user data, post, purchase, message, or bypass access controls. '+ 
  'Answer the visitor question: '+JSON.stringify(data.query)+'. Return an accurate concise JSON object with an answer and up to three original public source links; if none available, clearly say so.';
 try{
  const upstream=await fetcher('https://agent.tinyfish.ai/v1/automation/run-sse',{
   method:'POST',headers:{'X-API-Key':env.TINYFISH_API_KEY,'Content-Type':'application/json'},
   body:JSON.stringify({url:data.sourceUrl,goal,browser_profile:'lite'}),signal:AbortSignal.timeout(90000)});
  if(!upstream.ok)return json({ok:false,error:'tinyfish_upstream_unavailable'},502,origin);
  const text=await upstream.text();
  if(text.length>700000)return json({ok:false,error:'tinyfish_response_too_large'},502,origin);
  const result=extractAgentResult(text);
  if(!result)return json({ok:false,error:'tinyfish_no_verified_result'},502,origin);
  return json({ok:true,provider:'TinyFish',cardId:data.cardId,sourceUrl:data.sourceUrl,checkedAt:new Date().toISOString(),result},200,origin);
 }catch{return json({ok:false,error:'tinyfish_request_failed'},502,origin)}
}
