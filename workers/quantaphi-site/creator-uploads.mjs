/* Read-only keyless YouTube Atom RSS adapter. Validates channel IDs and
 * performs requests against a fixed HTTPS host; cannot proxy arbitrary URLs.
 * YouTube RSS is a recent-upload window, not full channel history. */
const CHANNEL=/^UC[A-Za-z0-9_-]{22}$/;
const VIDEO=/^[A-Za-z0-9_-]{11}$/;
const one=(text,tag)=>{const m=text.match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)<\\/'+tag+'>','i'));return m?.[1]?.trim()||'';};
// YouTube Atom uses either the full UC ID or its exact prefix-free suffix.
// Compare the channel field itself; a matching ID elsewhere is not proof.
const matchesChannel=(xml,channelId)=>{
 const value=one(xml,'yt:channelId');
 return value===channelId||value===channelId.slice(2);
};
const decode=text=>String(text).replace(/&(?:amp|lt|gt|quot|apos|#(\d+)|#x([\da-f]+));/gi,(s,decimal,hex)=>{
 const named={'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&apos;':"'"};
 if(named[s.toLowerCase()])return named[s.toLowerCase()];
 const n=decimal?Number(decimal):parseInt(hex,16);
 return Number.isInteger(n)&&n>0&&n<=0x10ffff&&!(n>=0xd800&&n<=0xdfff)?String.fromCodePoint(n):'';
});
export function parseCreatorUploads(xml,channelId){
 if(typeof xml!=='string'||xml.length>300000||!CHANNEL.test(channelId))return [];
 if(!matchesChannel(xml,channelId))return [];
 const entries=xml.match(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi)||[];
 const found=[],seen=new Set();
 for(const entry of entries.slice(0,30)){
  const videoId=one(entry,'yt:videoId'),title=decode(one(entry,'title'))
    .replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,160);
  const date=one(entry,'published');
  if(!VIDEO.test(videoId)||!title||seen.has(videoId))continue;
  seen.add(videoId);
  found.push({videoId,channelId,title,
   publishedAt:date&&Number.isFinite(Date.parse(date))?date:null,
   sourceUrl:'https://www.youtube.com/watch?v='+videoId,origin:'rss'});
  if(found.length>=15)break;
 }
 return found;
}
const response=(data,status=200)=>Response.json(data,{status,headers:{
 'Cache-Control':status===200?'public, max-age=300':'no-store',
 'X-Content-Type-Options':'nosniff'
}});
export async function creatorUploadsApi(request,fetcher=fetch){
 if(request.method!=='GET')return response({ok:false,error:'Method not allowed'},405);
 const url=new URL(request.url),channelId=url.searchParams.get('channel')||'';
 if(!CHANNEL.test(channelId))return response({ok:false,error:'Valid YouTube channel ID required'},400);
 const feed='https://www.youtube.com/feeds/videos.xml?channel_id='+channelId;
 try{
  const upstream=await fetcher(feed,{method:'GET',headers:{Accept:'application/atom+xml'},redirect:'error',
   signal:AbortSignal.timeout(6500)});
  if(!upstream.ok)return response({ok:false,error:'YouTube uploads feed unavailable'},502);
  const length=Number(upstream.headers.get('Content-Length')||0);
  if(length>300000)return response({ok:false,error:'Feed too large'},502);
  const body=await upstream.text();
  if(body.length>300000)return response({ok:false,error:'Feed too large'},502);
  const videos=parseCreatorUploads(body,channelId);
  if(!body.includes('<feed')||!matchesChannel(body,channelId))
   return response({ok:false,error:'YouTube feed did not match channel'},502);
  return response({ok:true,channelId,complete:false,source:'YouTube public uploads RSS',
   checkedAt:new Date().toISOString(),videos});
 }catch{return response({ok:false,error:'YouTube uploads feed could not be loaded'},503)}
}
