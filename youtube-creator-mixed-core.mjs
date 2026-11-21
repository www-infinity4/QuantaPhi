import {YOUTUBE_CHANNEL,YOUTUBE_VIDEO_DATABASE} from './youtube-creator-catalog.mjs';
import {JULIE_DERU_CHANNEL,JULIE_DERU_VIDEO_DATABASE} from './julie-deru-catalog.mjs';

/* Known publisher identities + inspected starting links. Official keyless RSS
 * supplies recent uploads, not a complete historical channel archive. */
const canonical=id=>'https://www.youtube.com/watch?v='+id;
const seed=(channelId,videoId,title)=>Object.freeze({
 channelId,videoId,title,sourceUrl:canonical(videoId),publishedAt:null,origin:'reviewed'
});
export const CREATOR_CHANNELS=Object.freeze([
 Object.freeze({key:'gana',name:'GANA Tribe · Mama Cabbage',channelId:'UC6ySmwN_K8fGGD2EKLQdEGA',
  url:'https://www.youtube.com/@ganatribe',seed:Object.freeze([
   seed('UC6ySmwN_K8fGGD2EKLQdEGA','OqRb8RKNgQQ','Everyone Needed Mama - and Her Ice Cream'),
   seed('UC6ySmwN_K8fGGD2EKLQdEGA','PyUwXoTabPA','REFRESHING! 6-2-2014')
  ])}),
 Object.freeze({key:'abbe',name:YOUTUBE_CHANNEL.name,channelId:YOUTUBE_CHANNEL.channelId,
  url:YOUTUBE_CHANNEL.profileUrl,
  seed:Object.freeze(YOUTUBE_VIDEO_DATABASE.videos.map(v=>seed(v.channelId,v.videoId,v.title)))}),
 Object.freeze({key:'julie',name:JULIE_DERU_CHANNEL.name,channelId:JULIE_DERU_CHANNEL.channelId,
  url:JULIE_DERU_CHANNEL.profileUrl,
  seed:Object.freeze(JULIE_DERU_VIDEO_DATABASE.videos.map(v=>seed(v.channelId,v.videoId,v.title)))})
]);
const VIDEO_ID=/^[A-Za-z0-9_-]{11}$/;
const CHANNEL_ID=/^UC[A-Za-z0-9_-]{22}$/;
export function parseCreatorInput(input){
 if(typeof input!=='string'||input.length>320)return null;
 let url;try{url=new URL(input.trim())}catch{return null}
 if(url.protocol!=='https:'||url.username||url.password||url.port||url.hash)return null;
 const host=url.hostname.toLowerCase(),path=url.pathname;
 if(host==='youtu.be'&&/^\/[A-Za-z0-9_-]{11}\/?$/.test(path))
  return {type:'video',videoId:path.split('/')[1]};
 if(!['youtube.com','www.youtube.com','m.youtube.com'].includes(host))return null;
 if(path==='/watch'&&VIDEO_ID.test(url.searchParams.get('v')||''))
  return {type:'video',videoId:url.searchParams.get('v')};
 const short=path.match(/^\/(?:shorts|live)\/([A-Za-z0-9_-]{11})\/?$/);
 if(short)return {type:'video',videoId:short[1]};
 const channel=path.match(/^\/channel\/(UC[A-Za-z0-9_-]{22})\/?$/);
 if(channel)return {type:'channel',channelId:channel[1]};
 const handle=path.match(/^\/@([A-Za-z0-9._-]{3,40})\/?$/);
 if(handle)return {type:'handle',handle:handle[1].toLowerCase()};
 return null;
}
export function validCreatorVideo(v){
 return Boolean(v&&VIDEO_ID.test(v.videoId||'')&&typeof v.channelId==='string'&&
  v.channelId.length<=40&&/^[A-Za-z0-9_-]+$/.test(v.channelId)&&
  typeof v.title==='string'&&v.title.length>0&&v.title.length<=160&&
  !/[\u0000-\u001f]/.test(v.title)&&v.sourceUrl===canonical(v.videoId)&&
  (v.publishedAt===null||(typeof v.publishedAt==='string'&&Number.isFinite(Date.parse(v.publishedAt)))));
}
export function mixCreatorVideos(items,order=[]){
 if(!Array.isArray(items))return [];
 const groups=new Map();const seen=new Set();
 for(const v of items){
  if(!validCreatorVideo(v)||seen.has(v.videoId))continue;
  seen.add(v.videoId);
  if(!groups.has(v.channelId))groups.set(v.channelId,[]);
  groups.get(v.channelId).push(v);
 }
 const keys=[...new Set([...order,...groups.keys()])].filter(id=>groups.has(id));
 const mixed=[];
 for(let i=0;;i++){
  let found=false;
  for(const key of keys){const v=groups.get(key)[i];if(v){mixed.push(v);found=true;}}
  if(!found)break;
 }
 return mixed;
}
export function pageCreatorVideos(videos,offset=0,limit=6){
 if(!Array.isArray(videos))return [];
 const start=Number.isInteger(offset)&&offset>=0?offset:0;
 const count=Number.isInteger(limit)?Math.max(1,Math.min(limit,24)):6;
 return videos.slice(start,start+count);
}
export const CREATOR_MIX_SOURCE=Object.freeze({
 id:'youtube-creator-mix',name:'GANA Tribe · Abbe · Julie · Creator Mix',
 kind:'Video · YouTube',feature:'Mixed channel uploads and saved creator videos',
 featureUrl:'https://www.youtube.com/@ganatribe/videos',
 official:'https://www.youtube.com/@ganatribe',
 focus:'Watch official public YouTube uploads from selected channels, with one optional player, a paginated mixed feed and user-added channel/video links.',
 details:'Official YouTube RSS provides only the latest uploads for channels with a verified channel ID. Historical channel videos and Community posts remain at YouTube; no ads, view counts, payment rights or complete archive are claimed.',
 youtubeMixedFeed:true
});
