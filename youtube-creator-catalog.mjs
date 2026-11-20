/* Reviewed public YouTube video links. Public videos are not evidence of
 * a complete channel or Community-post archive. No YouTube media is rehosted. */
export const YOUTUBE_CHANNEL=Object.freeze({
 channelId:'UCFsg41h5GN7TAxFUK3Sl00w',
 name:'AbbeCAdventures',handle:'abbecadventures',
 profileUrl:'https://www.youtube.com/@abbecadventures'
});
export const YOUTUBE_TOPICS=Object.freeze({
 daycare:'Daycare routines',food:'Food & groceries',
 travel:'Travel & preparation',lifestyle:'Everyday life'
});
const observedAt='2026-11-20';
const video=(videoId,title,topic)=>({
 channelId:YOUTUBE_CHANNEL.channelId,videoId,
 sourceUrl:'https://www.youtube.com/watch?v='+videoId,
 title,topic,publishedAt:null,observedAt
});
const publicSnapshot=[
 video('cF6XusNOfjM','A Day in My Life as an In-Home Daycare Provider | Real Daycare Routine','daycare'),
 video('w0Shmjecq0w','Saturday Vlog | Soup Recipe! | Fall Stuff','lifestyle'),
 video('hcry6kyERMI','GROCERY HAUL! | What I Eat in a Day | Tracking Calories | Weight Loss','food'),
 video('4kTtbc9LZvw','What I Eat in a Day | Tracking Calories | Weight Loss','food'),
 video('ND3b4vrNIZ0','Greece Trip Prep! | Pack with Me! | Vacation Prep & Packing','travel'),
 video('qZiG_8L8h0Q','What I Eat in a Day | Tracking Calories | Weight Loss','food'),
 video('Mny3gzKbHOw','A Day in My Life as an In-Home Daycare Provider | Real Daycare Routine','daycare'),
 video('45pg3N8qlW4','What I Eat in a Day | Tracking Calories | Weight Loss','food'),
 video('NekXUjLJVOc','A Day in My Life as an In-Home Daycare Provider | Real Daycare Routine','daycare'),
 video('_IDUsSTtiBU','What I Eat in a Day | Tracking Calories | Weight Loss','food'),
 video('PSUXg2qL38Y','Meal Prep | Tracking Calories | Weight Loss','food')
];
const cleanTitle=value=>typeof value==='string'&&value.length>0&&value.length<=150&&!/[<>\u0000-\u001f]/.test(value)&&value.trim()===value;
export function validateYouTubeVideo(row){
 if(!row||row.channelId!==YOUTUBE_CHANNEL.channelId||!/^[A-Za-z0-9_-]{11}$/.test(row.videoId||''))return false;
 if(row.sourceUrl!=='https://www.youtube.com/watch?v='+row.videoId)return false;
 if(!cleanTitle(row.title)||!Object.hasOwn(YOUTUBE_TOPICS,row.topic))return false;
 // Exact publication dates have not been confirmed. Later reviewed imports
 // must introduce dates through a separately verified schema migration.
 return row.publishedAt===null&&/^\d{4}-\d\d-\d\d$/.test(row.observedAt||'')&&
  Number.isFinite(Date.parse(row.observedAt+'T00:00:00Z'));
}
const normalize=row=>{
 if(!validateYouTubeVideo(row))throw new Error('Invalid reviewed YouTube video: '+String(row?.videoId||'unknown').slice(0,16));
 return Object.freeze(Object.fromEntries(['channelId','videoId','sourceUrl','title','topic','publishedAt','observedAt'].map(k=>[k,row[k]])));
};
export function mergeYouTubeVideos(existing,incoming){
 if(!Array.isArray(existing)||!Array.isArray(incoming))throw new Error('Invalid video collection');
 const unique=new Map();
 for(const row of [...existing,...incoming]){const v=normalize(row);unique.set(v.videoId,v);}
 return [...unique.values()];
}
export const YOUTUBE_VIDEO_DATABASE=Object.freeze({
 schemaVersion:1,channel:YOUTUBE_CHANNEL,
 coverage:Object.freeze({complete:false,communityPostsIndexed:false,checkedAt:observedAt,
  method:'Public YouTube watch page and channel Videos tab read-only inspection',
  note:'11 individually identified URLs; the larger upload archive, Shorts, live streams and Community posts are not fully indexed. Dates are unavailable.'}),
 videos:Object.freeze(mergeYouTubeVideos([],publicSnapshot))
});
export function searchYouTubeVideos(query=''){
 const q=String(query).trim().toLocaleLowerCase().slice(0,140);
 return YOUTUBE_VIDEO_DATABASE.videos.filter(v=>!q||[v.title,YOUTUBE_TOPICS[v.topic]].join(' ').toLocaleLowerCase().includes(q));
}
export const findYouTubeVideo=id=>YOUTUBE_VIDEO_DATABASE.videos.find(v=>v.videoId===id)||null;
const shared=Object.freeze({youtubeChannelId:YOUTUBE_CHANNEL.channelId,
 official:YOUTUBE_CHANNEL.profileUrl,
 focus:'Read publisher-identified titles and original YouTube video links. This independently curated partial catalog is not a complete YouTube feed, Community-post import, endorsement, or video rehost.'});
export const YOUTUBE_CREATOR_SOURCES=Object.freeze([
 Object.freeze({...shared,id:'abbecadventures-youtube',name:'AbbeCAdventures · Video index',
  kind:'Video · YouTube',feature:'Browse 11 indexed public videos',
  featureUrl:YOUTUBE_CHANNEL.profileUrl,details:'Source-identified video catalog with search and original YouTube links. Partial coverage; no Community posts imported.'}),
 ...YOUTUBE_VIDEO_DATABASE.videos.map(v=>Object.freeze({
  ...shared,id:'abbecadventures-video-'+[...v.videoId].map(c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join(''),
  youtubeVideoId:v.videoId,
  name:YOUTUBE_CHANNEL.name+' · '+v.title,
  kind:'Video · YouTube',feature:v.title,featureUrl:v.sourceUrl,
  image:'https://i.ytimg.com/vi/'+v.videoId+'/hqdefault.jpg',
  details:'Original YouTube video from '+YOUTUBE_CHANNEL.name+'. Published date unverified; provider controls embedding.',topic:v.topic
 }))
]);
