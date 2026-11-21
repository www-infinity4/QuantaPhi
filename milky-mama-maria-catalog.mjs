/* Owner-supplied YouTube pumping tutorial and two publicly source-identified
 * same-creator uploads. This is NOT an exhaustive album or health endorsement.
 * The publisher owns the full constantly changing /videos listing and player.
 * Keep separate from childcare/family TV and all advertising catalogs. */
export const MARIA_CHANNEL=Object.freeze({
 channelId:'UC0CCO_QHCTRUTsVgb9L0gtQ',
 name:'Milky Mama Maria',handle:'milkymamamarie',
 profileUrl:'https://www.youtube.com/@milkymamamarie',
 videosUrl:'https://www.youtube.com/@milkymamamarie/videos'
});
export const MARIA_TOPICS=Object.freeze({pumping:'Manual breast-pump routines'});
const observedAt='2026-11-21';
const originalTitle='Breastfeeding Milk Tutorial | Simple Manual Pump Routine | Pump with Mother Maria';
const video=videoId=>({
 channelId:MARIA_CHANNEL.channelId,videoId,
 sourceUrl:'https://www.youtube.com/watch?v='+videoId,
 title:originalTitle,topic:'pumping',publishedAt:null,observedAt
});
const reviewed=[
 video('_LcTKx4QSWw'), // Owner supplied; page and channel metadata verified
 video('xU6f-lV2rG4'), // Separately source-identified same creator
 video('e8G_BD0mX2Q')  // Separately source-identified same creator
];
export function validateMariaVideo(row){
 if(!row||row.channelId!==MARIA_CHANNEL.channelId||
    !/^[A-Za-z0-9_-]{11}$/.test(row.videoId||''))return false;
 if(row.sourceUrl!=='https://www.youtube.com/watch?v='+row.videoId)return false;
 if(typeof row.title!=='string'||!row.title.length||row.title.length>150||
    row.title.trim()!==row.title||/[<>\u0000-\u001f]/.test(row.title))return false;
 return Object.hasOwn(MARIA_TOPICS,row.topic)&&row.publishedAt===null&&
  /^\d{4}-\d\d-\d\d$/.test(row.observedAt||'')&&
  Number.isFinite(Date.parse(row.observedAt+'T00:00:00Z'));
}
const verified=reviewed.map(row=>{
 if(!validateMariaVideo(row))throw new Error('Invalid reviewed Milky Mama Maria video');
 return Object.freeze({...row});
});
if(new Set(verified.map(v=>v.videoId)).size!==verified.length)
 throw new Error('Duplicate Milky Mama Maria video');
export const MARIA_VIDEO_DATABASE=Object.freeze({
 schemaVersion:1,channel:MARIA_CHANNEL,
 coverage:Object.freeze({complete:false,communityPostsIndexed:false,checkedAt:observedAt,
  method:'Owner-provided public YouTube watch page, official channel and two independently identified same-creator watch pages',
  note:'Three individually inspected source videos only. Visit the original publisher Videos tab for all uploads; no invented episodes or live API sync.'}),
 videos:Object.freeze(verified)
});
export const searchMariaVideos=(query='')=>{
 const q=String(query).trim().toLocaleLowerCase().slice(0,140);
 return MARIA_VIDEO_DATABASE.videos.filter(v=>!q||
  (v.title+' '+MARIA_TOPICS[v.topic]+' '+v.videoId).toLocaleLowerCase().includes(q));
};
export const findMariaVideo=id=>MARIA_VIDEO_DATABASE.videos.find(v=>v.videoId===id)||null;
export const similarMariaVideos=(currentId,limit=8)=>MARIA_VIDEO_DATABASE.videos
 .filter(v=>v.videoId!==currentId).slice(0,Math.max(0,Math.min(8,Number(limit)||0)));
const key=id=>[...id].map(c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join('');
const shared=Object.freeze({
 youtubeChannelId:MARIA_CHANNEL.channelId,
 official:MARIA_CHANNEL.profileUrl,contentBoundary:'lactation-media',
 focus:'Source-linked pumping routine videos from the original creator. Not a clinical tutorial, endorsement, advertisement, full episode import or family/daycare card.'
});
export const MARIA_SOURCES=Object.freeze([
 Object.freeze({...shared,id:'milky-mama-maria-youtube',
  name:'Milky Mama Maria · YouTube videos',
  kind:'Video · YouTube',feature:'Browse 3 reviewed uploads · see all videos on YouTube',
  featureUrl:MARIA_CHANNEL.videosUrl,
  details:'Three directly identified uploads with a link to the creator\'s complete Videos tab. The in-card carousel has source-linked similar uploads.'}),
 ...MARIA_VIDEO_DATABASE.videos.map(v=>Object.freeze({
  ...shared,id:'milky-mama-maria-video-'+key(v.videoId),
  youtubeVideoId:v.videoId,
  name:MARIA_CHANNEL.name+' · '+v.title,kind:'Video · YouTube',
  feature:v.title,featureUrl:v.sourceUrl,
  // Publisher thumbnails intentionally require an explicit in-card choice;
  // auto-showing breast-pump preview art in general public/ads feeds is avoided.
  topic:v.topic,
  details:'Original source-linked video; publisher controls playback. Other reviewed episodes are available through the in-card carousel.'
 }))
]);
