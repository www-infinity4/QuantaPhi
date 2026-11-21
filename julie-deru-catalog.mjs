/* Reviewed Julie Deru channel metadata and owner-provided YouTube video link.
 * Partial, read-only public video index; no scraping, rehosting, or claim
 * that this is an exhaustive or live channel feed. */
export const JULIE_DERU_CHANNEL=Object.freeze({
 channelId:'UCt_P3xPrrnOkYT5UQQ4vUIg',
 name:'Julie Deru',handle:'JulieDeru',
 profileUrl:'https://www.youtube.com/@JulieDeru'
});
export const JULIE_DERU_TOPICS=Object.freeze({
 home:'Home & outdoors',family:'Family life'
});
const observedAt='2026-11-21';
const video=(videoId,title,topic)=>({
 channelId:JULIE_DERU_CHANNEL.channelId,videoId,
 sourceUrl:'https://www.youtube.com/watch?v='+videoId,
 title,topic,publishedAt:null,observedAt
});
const reviewed=[
 video('G6zpr59jEas','We Started Ripping Trees Out… This Got Interesting!','home'),
 video('iEzGIAMExWE','Where We’re Moving & How It All Happened','family')
];
const validTitle=s=>typeof s==='string'&&s.length>0&&s.length<=150&&
 s.trim()===s&&!/[<>\u0000-\u001f]/.test(s);
export function validateJulieDeruVideo(row){
 if(!row||row.channelId!==JULIE_DERU_CHANNEL.channelId||
    !/^[A-Za-z0-9_-]{11}$/.test(row.videoId||''))return false;
 if(row.sourceUrl!=='https://www.youtube.com/watch?v='+row.videoId||
    !validTitle(row.title)||!Object.hasOwn(JULIE_DERU_TOPICS,row.topic))return false;
 return row.publishedAt===null&&/^\d{4}-\d\d-\d\d$/.test(row.observedAt||'')&&
  Number.isFinite(Date.parse(row.observedAt+'T00:00:00Z'));
}
const reviewedVideos=reviewed.map(v=>{
 if(!validateJulieDeruVideo(v))throw new Error('Invalid reviewed Julie Deru video');
 return Object.freeze({...v});
});
if(new Set(reviewedVideos.map(v=>v.videoId)).size!==reviewedVideos.length)
 throw new Error('Duplicate Julie Deru video source');
export const JULIE_DERU_VIDEO_DATABASE=Object.freeze({
 schemaVersion:1,channel:JULIE_DERU_CHANNEL,
 coverage:Object.freeze({complete:false,communityPostsIndexed:false,checkedAt:observedAt,
  method:'Owner-supplied YouTube watch link, verified YouTube page metadata, official channel and a separate source-identified watch page',
  note:'Only two inspected public video links; not a live channel feed. Exact publication dates and complete uploads are unverified.'}),
 videos:Object.freeze(reviewedVideos)
});
export const searchJulieDeruVideos=(query='')=>{
 const q=String(query).trim().toLocaleLowerCase().slice(0,140);
 return JULIE_DERU_VIDEO_DATABASE.videos.filter(v=>!q||
  (v.title+' '+JULIE_DERU_TOPICS[v.topic]).toLocaleLowerCase().includes(q));
};
export const findJulieDeruVideo=id=>JULIE_DERU_VIDEO_DATABASE.videos.find(v=>v.videoId===id)||null;
const key=id=>[...id].map(c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join('');
const shared=Object.freeze({
 youtubeChannelId:JULIE_DERU_CHANNEL.channelId,official:JULIE_DERU_CHANNEL.profileUrl,
 focus:'Independently curated public YouTube watch links and original hosted playback. A partial sample, not publisher affiliation, a complete archive, or an automatically synchronized feed.'
});
export const JULIE_DERU_SOURCES=Object.freeze([
 Object.freeze({...shared,id:'julie-deru-youtube',name:'Julie Deru · YouTube',
  kind:'Video · YouTube',feature:'Browse 2 verified video links',featureUrl:JULIE_DERU_CHANNEL.profileUrl,
  details:'Official channel with two inspected public YouTube video links; no full archive, Community posts, or live feed access.'}),
 ...JULIE_DERU_VIDEO_DATABASE.videos.map(v=>Object.freeze({
  ...shared,id:'julie-deru-video-'+key(v.videoId),youtubeVideoId:v.videoId,
  name:'Julie Deru · '+v.title,kind:'Video · YouTube',
  feature:v.title,featureUrl:v.sourceUrl,
  image:'https://i.ytimg.com/vi/'+v.videoId+'/hqdefault.jpg',
  topic:v.topic,details:'Original YouTube video. Publication timestamp unverified; YouTube controls embedding and any ads.'
 }))
]);
