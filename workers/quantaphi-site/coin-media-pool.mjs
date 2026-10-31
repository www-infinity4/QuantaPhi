// Public-only, keyless media discovery. Never proxy video/audio, assume paid playback, or mint coins.
// Channel feeds are recent upload inventories, not the full YouTube search index.
const CHANNELS=Object.freeze([
 {id:'UC4eYXhJI4-7wSWc8UNRwD4A',name:'NPR Music',kind:'music'},
 {id:'UCAuUUnT6oDeKwE6v1NGQxug',name:'TED',kind:'science'}
]);
const FEATURED=Object.freeze([
 {id:'vXlUZlrh7AA',kind:'movies',title:'New movie trailers · Rotten Tomatoes Trailers (July 2026)',channel:'Rotten Tomatoes Trailers',published:'2026-07-13T00:00:00Z'},
 {id:'6gNEQE0AFf8',kind:'movies',title:'New movie trailers · Rotten Tomatoes Trailers (May 2026)',channel:'Rotten Tomatoes Trailers',published:'2026-05-26T00:00:00Z'}
]);
const decode=s=>String(s).replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos);/gi,(_,x)=>{
 if(x[0]==='#'){const n=x[1].toLowerCase()==='x'?parseInt(x.slice(2),16):parseInt(x.slice(1),10);return n>=32&&n<=0x10ffff?String.fromCodePoint(n):'';}
 return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[x.toLowerCase()]||'';
});
export function parseYouTubeFeed(xml,channel){
 if(typeof xml!=='string'||xml.length>1500000||!/<feed\b/.test(xml))return [];
 return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].slice(0,20).map(([,part])=>{
  const id=part.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/)?.[1];
  const title=decode(part.match(/<title>([\s\S]*?)<\/title>/)?.[1]||'').replace(/<[^>]*>/g,'').trim().slice(0,160);
  const published=part.match(/<published>([^<]+)<\/published>/)?.[1]||'';
  return id&&title&&Number.isFinite(Date.parse(published))?{id,kind:channel.kind,title,channel:channel.name,published}:null;
 }).filter(Boolean);
}
export function mediaSearchUrl(query,kind='all'){
 const intent={music:'official music video',movies:'official movie trailer or free movie',science:'science documentary'};
 const words=String(query||'').trim().slice(0,100);
 return 'https://www.youtube.com/results?search_query='+encodeURIComponent([words,intent[kind]||''].filter(Boolean).join(' '));
}
export async function coinMediaRoute(request,{fetcher=fetch}={}){
 if(request.method!=='GET')return Response.json({ok:false,error:'method_not_allowed'},{status:405,headers:{Allow:'GET'}});
 const url=new URL(request.url),kind=url.searchParams.get('kind')||'all';
 if(!['all','music','movies','science'].includes(kind))return Response.json({ok:false,error:'invalid_kind'},{status:400});
 const requested=CHANNELS.filter(ch=>kind==='all'||ch.kind===kind);
 const results=await Promise.allSettled(requested.map(async channel=>{
  const upstream=await fetcher('https://www.youtube.com/feeds/videos.xml?channel_id='+channel.id,{
   headers:{Accept:'application/atom+xml, application/xml;q=0.9'},
   signal:AbortSignal.timeout(6500)
  });
  if(!upstream.ok)throw Error('feed_unavailable');
  const xml=await upstream.text();
  return parseYouTubeFeed(xml,channel);
 }));
 const items=[...(kind==='all'||kind==='movies'?FEATURED:[]),...results.flatMap(x=>x.status==='fulfilled'?x.value:[])];
 const unique=[...new Map(items.map(item=>[item.id,item])).values()]
  .sort((a,b)=>Date.parse(b.published)-Date.parse(a.published)).slice(0,40);
 const failures=results.filter(x=>x.status!=='fulfilled').length;
 return Response.json({ok:true,kind,items:unique,count:unique.length,
  source:'official-publisher-links-and-public-channel-feeds',feedChannels:requested.length,
  feedsAvailable:requested.length-failures,partial:failures>0,
  note:'Only recent public uploads and separately cited trailers. Not a full YouTube search, playback rights or verified embedding permission.',
  searchUrl:mediaSearchUrl('',kind)},{
   headers:{'Cache-Control':'public, max-age=300, s-maxage=600','X-Content-Type-Options':'nosniff'}
  });
}
