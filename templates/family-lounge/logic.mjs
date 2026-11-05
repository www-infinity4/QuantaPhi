/* Reusable family-lounge template: source-declared channels, search intents,
   opt-in-only relevance ranking and verified seven-day NOAA/NWS weather parsing.
   Zero wallet or account access. No paid-ad, casting, or view claims. */
export const IOWA_CITIES=Object.freeze({
  ottumwa:{name:'Ottumwa',lat:41.0196,lon:-92.4110},
  oskaloosa:{name:'Oskaloosa',lat:41.2964,lon:-92.6444},
  desmoines:{name:'Des Moines',lat:41.5868,lon:-93.6250},
  iowacity:{name:'Iowa City',lat:41.6611,lon:-91.5302}
});
export const CHANNELS=Object.freeze([
  {id:'westerns',title:'Western Movies',kind:'movies',mode:'embedded',category:'westerns',url:'https://archive.org/details/BlueSteel',note:'Public-domain movies in the page player'},
  {id:'fox',title:'LiveNOW from FOX',kind:'tv',mode:'provider',category:'news',url:'https://www.livenowfox.com/live',note:'Free official live news · broadcaster player'},
  {id:'cbs',title:'CBS News 24/7',kind:'tv',mode:'provider',category:'news',url:'https://www.cbsnews.com/live/',note:'Free official live news · broadcaster player'},
  {id:'abc',title:'ABC News Live',kind:'tv',mode:'provider',category:'news',url:'https://abcnews.com/live',note:'Free official live news · broadcaster player'},
  {id:'cnn',title:'CNN',kind:'tv',mode:'provider',category:'news',url:'https://www.cnn.com/',login:true,note:'CNN All Access or supported TV-provider sign-in'},
  {id:'nasa',title:'NASA+',kind:'tv',mode:'provider',category:'science',url:'https://plus.nasa.gov/',note:'Official NASA streaming and documentaries'},
  {id:'pbs',title:'PBS',kind:'tv',mode:'provider',category:'documentary',url:'https://www.pbs.org/livestream/',note:'PBS streams depend on station and program'},
  {id:'pluto',title:'Pluto TV',kind:'tv',mode:'provider',category:'entertainment',url:'https://pluto.tv/',note:'Free ad-supported TV · official app or website'},
  {id:'tubi',title:'Tubi',kind:'tv',mode:'provider',category:'entertainment',url:'https://tubitv.com/live',note:'Free live channels · official app or website'},
  {id:'netflix',title:'Netflix',kind:'tv',mode:'provider',category:'entertainment',url:'https://www.netflix.com/browse',login:true,note:'Personal Netflix sign-in needed; playback and Cast stay with Netflix'}
]);
export const OFFERS=Object.freeze([
  {id:'hardees',title:"Hardee's",category:'food',url:'https://www.hardees.com/',description:'See the restaurant’s current menu and offers at the official source. Local availability varies.',advertiserPaid:false},
  {id:'mcdonalds',title:"McDonald's",category:'food',url:'https://www.mcdonalds.com/us/en-us/deals.html',description:'See current McValue and app offers at the official source. Participation varies.',advertiserPaid:false},
  {id:'wendys',title:"Wendy's",category:'food',url:'https://www.wendys.com/',description:'Check the official restaurant site or app for current offers.',advertiserPaid:false},
  {id:'netflix',title:'Netflix Top 10',category:'entertainment',url:'https://www.netflix.com/tudum/top10',description:'Explore Netflix’s own ranked charts, then sign in to watch on Netflix.',advertiserPaid:false},
  {id:'fox',title:'LiveNOW from FOX',category:'news',url:'https://www.livenowfox.com/live',description:'Watch live news from the broadcaster’s own free player.',advertiserPaid:false},
  {id:'nasa',title:'NASA+',category:'science',url:'https://plus.nasa.gov/',description:'Find official NASA streams, space coverage, and science programs.',advertiserPaid:false},
  {id:'chicks',title:'The Chicks',category:'music',url:'https://thechicks.com/',description:'Explore the group’s official website. Album playback depends on a licensed music service.',advertiserPaid:false},
  {id:'radio',title:'Infinity Radio',category:'music',url:'https://quantaphi.org/infinity-radio/',description:'Listen through the existing Infinity Radio catalog.',advertiserPaid:false}
]);
const exactWords=(s,re)=>re.test(s);
export function routeFamilyRequest(value){
  if(typeof value!=='string')return null;
  const raw=value.trim().slice(0,300);
  if(!raw)return null;
  const q=raw.toLowerCase().replace(/^(?:hey |ok |okay )?bubbles[,:\s]*/,'').trim();
  if(/\b(?:hardees|hardee'?s?|hardess)\b/.test(q)&&/\b(?:deals?|offers?|coupons?|specials?|what'?s)\b/.test(q))return {type:'deals',term:'hardees'};
  if(/\b(?:mcdonald'?s?|mcds|mickey d'?s)\b/.test(q)&&/\b(?:deals?|offers?|coupons?|specials?)\b/.test(q))return {type:'deals',term:'mcdonalds'};
  if(/\b(?:wendy'?s?)\b/.test(q)&&/\b(?:deals?|offers?|coupons?|specials?)\b/.test(q))return {type:'deals',term:'wendys'};
  if(/\b(?:weather|forecast|temperature)\b/.test(q))return {type:'weather'};
  if(/\b(?:infinity radio|play radio|turn on radio|music station)\b/.test(q))return {type:'radio'};
  const names=[
    ['netflix',/\bnetflix\b/],['cnn',/\bcnn\b/],['fox',/\bfox\b/],['cbs',/\bcbs\b/],['abc',/\babc\b/],['nasa',/\bnasa\b/],
    ['pluto',/\bpluto\b/],['tubi',/\btubi\b/],['pbs',/\bpbs\b/],['westerns',/\b(?:westerns?|blue steel|star packer)\b/]
  ];
  if(!/^(?:search|look up|find out|tell me about)\b/.test(q)){
    const found=names.find(([,rx])=>rx.test(q));
    if(found)return {type:'channel',id:found[0]};
  }
  const clean=q.replace(/^(?:search(?: for)?|look up|find out about|find|tell me about)\s*/,'').trim().slice(0,140);
  return clean?{type:'search',query:clean}:null;
}
export function sourceCardForIntent(intent){
  const id=intent==='hardees'?'hardees':intent==='mcdonalds'?'mcdonalds':intent==='wendys'?'wendys':null;
  if(!id)return [];
  return [OFFERS.find(x=>x.id===id),...OFFERS.filter(x=>['hardees','mcdonalds','wendys'].includes(x.id)&&x.id!==id)];
}
export function rankDiscovery(rows,context={}){
  if(!Array.isArray(rows))return [];
  const interests=Array.isArray(context.interests)?context.interests.filter(x=>typeof x==='string'):[];
  const topic=typeof context.topic==='string'?context.topic:'';
  return rows.map((row,i)=>({row,i,score:(row.id===topic?20:0)+(interests.includes(row.category)?5:0)}))
    .sort((a,b)=>b.score-a.score||a.i-b.i).map(x=>x.row);
}
export function normalizeName(name){
  const str=String(name||'').trim().replace(/\s+/g,' ');
  return str&&/^[\p{L}\p{N} .'-]{1,120}$/u.test(str)?str.slice(0,32):'Bubbles';
}
const inCentral=(value)=>{
  const d=new Date(value);
  return Number.isNaN(d.valueOf())?null:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Chicago',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
};
const verifiedNwsIcon=value=>{
  if(typeof value!=='string')return '';
  try{
    const url=new URL(value);
    return url.protocol==='https:'&&url.hostname==='api.weather.gov'&&url.pathname.startsWith('/icons/')&&!url.username&&!url.password&&!url.port?url.href:'';
  }catch{return ''}
};
export function forecastSevenDays(periods,now=new Date()){
  if(!Array.isArray(periods))return [];
  const today=inCentral(now); if(!today)return [];
  const days=new Map();
  for(const p of periods){
    const day=inCentral(p?.startTime);
    if(!day||day<today||!Number.isFinite(p?.temperature))continue;
    if(!days.has(day))days.set(day,{date:day,high:null,low:null,summary:'',precip:null,icon:''});
    const row=days.get(day);
    if(p.isDaytime){row.high=p.temperature;row.summary=String(p.shortForecast||'').slice(0,80)}
    else {row.low=p.temperature;if(!row.summary)row.summary=String(p.shortForecast||'').slice(0,80)}
    const icon=verifiedNwsIcon(p?.icon);
    if(icon&&(p.isDaytime||!row.icon))row.icon=icon;
    const prob=p?.probabilityOfPrecipitation?.value;
    if(Number.isFinite(prob))row.precip=Math.max(row.precip??0,Math.min(100,Math.max(0,prob)));
  }
  return [...days.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,7);
}
const TREND_TERMS=Object.freeze({
  music:/\b(?:chicks|dixie chicks|music|album|tour|singer|concert|country)\b/i,
  news:/\b(?:news|cnn|fox|cbs|abc|weather)\b/i,
  science:/\b(?:nasa|space|science|mars|moon|telescope)\b/i,
  food:/\b(?:hardee|wendy|mcdonald|food|restaurant|burger)\b/i,
  westerns:/\b(?:western|cowboy|wayne|classic film)\b/i,
  entertainment:/\b(?:netflix|tv|film|movie|series)\b/i
});
export function filteredTrends(payload,interests,clock=new Date()){
  if(payload?.schema_version!==1||payload?.source_url!=='https://trends.google.com/trending/rss?geo=US'||!Array.isArray(payload.topics)||!Array.isArray(interests)||!interests.length)return [];
  const when=new Date(payload.checked_at||payload.generated_at||payload.fetched_at||payload.updated_at||'');
  const now=new Date(clock); const age=now.getTime()-when.getTime();
  if(!Number.isFinite(age)||age<0||age>48*3600000)return [];
  const patterns=interests.map(x=>TREND_TERMS[x]).filter(Boolean);
  if(!patterns.length)return [];
  return payload.topics.filter(x=>typeof x?.query==='string'&&x.query.length<=120&&patterns.some(rx=>rx.test(x.query)))
    .slice(0,8).map(x=>({query:x.query,source:'Google Trends',observedAt:when.toISOString(),url:'https://trends.google.com/trending?geo=US'}));
}
