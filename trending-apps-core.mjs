/* Source-backed trending Android apps; unknown Google queries never invent an app. */
export const APPS=Object.freeze([
 {id:'termux',name:'Termux',feature:'Android Linux environment and command-line tools',url:'https://f-droid.org/packages/com.termux/',logoHost:'f-droid.org',terminal:true,aliases:['termux','termux app','termux terminal','termux android']},
 {id:'firefox',name:'Firefox for Android',feature:'Independent mobile browser from Mozilla',url:'https://www.mozilla.org/en-US/firefox/browsers/mobile/android/',logoHost:'mozilla.org',aliases:['firefox android','firefox mobile','firefox browser','mozilla firefox app']},
 {id:'vlc',name:'VLC for Android',feature:'Open-source video and audio player',url:'https://www.videolan.org/vlc/download-android.html',logoHost:'videolan.org',aliases:['vlc android','vlc player','vlc media player','vlc app']},
 {id:'signal',name:'Signal',feature:'Private messaging application',url:'https://signal.org/download/',logoHost:'signal.org',aliases:['signal messenger','signal app','signal private messenger']},
 {id:'fdroid',name:'F-Droid',feature:'Free and open-source Android app catalog',url:'https://f-droid.org/',logoHost:'f-droid.org',aliases:['f-droid','f droid','f-droid app','fdroid']},
 {id:'kde-connect',name:'KDE Connect',feature:'Connect Android with your computer',url:'https://kdeconnect.kde.org/',logoHost:'kde.org',aliases:['kde connect','kde connect android','kde connect app']}
]);
const normalized=text=>String(text||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const BUCKET=/^\d[\d,]*(?:\.\d+)?[KMB]?\+$/i;
const SOURCE='https://trends.google.com/trending/rss?geo=US';
const HOURS=3600000;
export const TRENDS_FEEDS=Object.freeze(['/data/google-trends-latest.json',
 'https://raw.githubusercontent.com/www-infinity4/QuantaPhi/trends-rss-data/data/google-trends-latest.json']);
export function validAppTrends(feed,now=Date.now()){
 if(feed?.schema_version!==1||feed?.source!=='Google Trends Trending Now RSS'||feed?.source_url!==SOURCE||feed?.region!=='US'||!Array.isArray(feed?.topics))return false;
 const checked=Date.parse(feed.checked_at);
 return Number.isFinite(checked)&&checked<=now+5*60000&&now-checked>=0&&now-checked<=48*HOURS;
}
export function trendForApp(id,topics,now=Date.now()){
 const app=APPS.find(row=>row.id===id);
 if(!app||!Array.isArray(topics))return null;
 const aliases=new Set(app.aliases.map(normalized));
 for(const row of topics.slice(0,100)){
  if(!aliases.has(normalized(row?.query))||!BUCKET.test(String(row.approx_searches||'')))continue;
  const published=Date.parse(row.published_at);
  if(!Number.isFinite(published)||published>now+5*60000||now-published>48*HOURS)continue;
  return {query:row.query,approx_searches:row.approx_searches,published_at:row.published_at};
 }
 return null;
}
export function selectTrendingApps(feed,now=Date.now()){
 const valid=validAppTrends(feed,now);
 return APPS.map(row=>{
  const source=valid?trendForApp(row.id,feed.topics,now):null;
  return {...row,trend:source?'verified':'featured',trendSource:source||null,checked_at:valid?feed.checked_at:null};
 }).sort((a,b)=>Number(b.trend==='verified')-Number(a.trend==='verified')||
    Number(b.terminal===true)-Number(a.terminal===true)||APPS.indexOf(APPS.find(v=>v.id===a.id))-APPS.indexOf(APPS.find(v=>v.id===b.id)));
}
/* The HTML code pad is not connected to Android privileged Termux. */
export function sanitizeDraft(value){
 return String(value||'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g,'').replace(/\r\n?/g,'\n').slice(0,7000).trim();
}
export const terminalDraftResult=()=>({state:'not_executed',label:'Not executed in Termux'});
