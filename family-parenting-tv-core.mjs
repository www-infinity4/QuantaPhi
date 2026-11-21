/* Family & Parenting TV — reviewed public YouTube source metadata from dedicated
 * Cloudflare D1. No child-related content may enter QuantaPhi's 21+ or ad feeds. */
import {YOUTUBE_VIDEO_DATABASE,YOUTUBE_CHANNEL} from './youtube-creator-catalog.mjs';
export const FAMILY_TV_API_URL='https://quantaphi-family-parenting-tv.marvaseater.workers.dev/episodes';
export const FAMILY_TV_SOURCE=Object.freeze({
 id:'family-parenting-tv',
 name:'Family & Parenting TV',
 kind:'Video · Family education',
 feature:'Browse verified daycare and parenting education',
 official:'https://www.youtube.com/@CCAofAmerica',
 featureUrl:'https://www.youtube.com/@CCAofAmerica',
 focus:'Original YouTube metadata and official parenting and childcare resources only. This is a nonsexual family education channel, never part of a 21+ or paid adult-media carousel.',
 details:'Independent indexed collection of original childcare education and everyday-life videos. Cloudflare D1 metadata is read-only. Provider owns original videos and playback rights. No Star Coin charge or adult cross-promotion.',
 contentBoundary:'family-education'
});
const knownPublishers=Object.freeze({
 'AbbeCAdventures':'https://www.youtube.com/@abbecadventures',
 'Child Care Aware® of America':'https://www.youtube.com/@CCAofAmerica'
});
const knownTopics=new Set(['daycare','parent-resources','provider-training','family-vlog','food','travel','early-learning']);
const goodText=value=>typeof value==='string'&&value===value.trim()&&value.length>0&&value.length<180&&!/[<>\u0000-\u001f]/.test(value);
export function normalizeFamilyEpisode(row){
 if(!row||typeof row!=='object'||row.channel_key!=='family-parenting-tv'||row.content_boundary!=='family-education')return null;
 const id=row.video_id;
 if(typeof id!=='string'||!/^[A-Za-z0-9_-]{11}$/.test(id))return null;
 if(row.source_url!=='https://www.youtube.com/watch?v='+id)return null;
 if(!Object.hasOwn(knownPublishers,row.publisher)||row.publisher_url!==knownPublishers[row.publisher])return null;
 if(!knownTopics.has(row.topic)||!goodText(row.title))return null;
 if(!/^\d{4}-\d\d-\d\d$/.test(row.observed_at||'')||!Number.isFinite(Date.parse(row.observed_at+'T00:00:00Z')))return null;
 if(row.published_at!==null&&row.published_at!==undefined)return null;
 return Object.freeze({
  videoId:id,title:row.title,publisher:row.publisher,publisherUrl:row.publisher_url,
  sourceUrl:row.source_url,topic:row.topic,observedAt:row.observed_at,
  publishedAt:null,contentBoundary:'family-education',
  thumbnail:'https://i.ytimg.com/vi/'+id+'/hqdefault.jpg'
 });
}
export function parseFamilyEpisodes(value){
 const rows=Array.isArray(value)?value:[];
 const seen=new Set(),out=[];
 for(const row of rows.slice(0,100)){
  const video=normalizeFamilyEpisode(row);
  if(!video||seen.has(video.videoId))continue;
  seen.add(video.videoId);out.push(video);
 }
 return out;
}
export const FAMILY_TV_FALLBACK=Object.freeze(parseFamilyEpisodes(YOUTUBE_VIDEO_DATABASE.videos.map(v=>({
 video_id:v.videoId,channel_key:'family-parenting-tv',title:v.title,
 publisher:'AbbeCAdventures',publisher_url:YOUTUBE_CHANNEL.profileUrl,
 source_url:v.sourceUrl,topic:v.topic==='lifestyle'?'family-vlog':v.topic,
 observed_at:v.observedAt,published_at:null,content_boundary:'family-education'
}))));
export async function fetchFamilyEpisodes(fetcher=fetch){
 try{
  const response=await fetcher(FAMILY_TV_API_URL,{method:'GET',mode:'cors',credentials:'omit',headers:{Accept:'application/json'}});
  if(!response?.ok)throw new Error('cloudflare_unavailable');
  const payload=await response.json();
  const videos=parseFamilyEpisodes(payload?.videos);
  if(videos.length===0)throw new Error('empty_public_catalog');
  return Object.freeze({videos,source:'cloudflare-d1',partial:payload?.partial===true});
 }catch{
  return Object.freeze({videos:FAMILY_TV_FALLBACK,source:'reviewed-static-fallback',partial:true});
 }
}
