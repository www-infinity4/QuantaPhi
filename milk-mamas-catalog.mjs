/* Owner-requested Milk Mamas Nest public YouTube source index.
 * Seven URLs individually identified on the publisher's public Videos tab,
 * inspected 2026-11-21. This is a snapshot, not a live complete archive.
 * Videos are streamed from YouTube by explicit visitor action, never rehosted. */
export const MILK_MAMAS_CHANNEL=Object.freeze({
 name:'Milk Mamas Nest',
 url:'https://www.youtube.com/@MilkMamasNest3',
 videosUrl:'https://www.youtube.com/@MilkMamasNest3/videos',
 observedAt:'2026-11-21',
 complete:false
});
const reviewed=[
 ['Hft1qIEnuuY','Breastfeeding Positions Every Mom Should Know | Tips for Comfortable Nursing','positioning'],
 ['-HyC7uYMreQ','Breastfeeding While Engorged | Tips for Relieving Fullness & Improving Latch','comfort'],
 ['zMBigl5-rNI','Breastfeeding in the Car 🚗🤱 | Real Mom Life, Nursing on the Go & Breastfeeding Vlog','family-vlog'],
 ['psNiDCAMJzI','Relaxing Breastfeeding ASMR | Calm Nursing & Bonding Session 🤍','relaxation'],
 ['jcWHlZtFB6c','How to Get a Better Latch | Breastfeeding Latching Demonstration','latching'],
 ['4GtaRs3ieiU','How to Get a Deep Latch | Breastfeeding Latch Tutorial for New Moms','latching'],
 ['jFTHHb1Q7sg','Welcome Video ❤️','welcome']
];
const cleanTitle=value=>typeof value==='string'&&value.length>0&&value.length<160&&
 value===value.trim()&&!/[<>\u0000-\u001f]/.test(value);
function episode([videoId,title,topic]){
 if(!/^[A-Za-z0-9_-]{11}$/.test(videoId)||!cleanTitle(title))throw Error('Invalid reviewed Milk Mamas video');
 return Object.freeze({
  videoId,title,topic,publisher:MILK_MAMAS_CHANNEL.name,publisherUrl:MILK_MAMAS_CHANNEL.url,
  sourceUrl:'https://www.youtube.com/watch?v='+videoId,
  thumbnail:'https://i.ytimg.com/vi/'+videoId+'/hqdefault.jpg',
  observedAt:MILK_MAMAS_CHANNEL.observedAt,publishedAt:null,contentBoundary:'family-education'
 });
}
export const MILK_MAMAS_EPISODES=Object.freeze([...new Map(reviewed.map(raw=>{const item=episode(raw);return [item.videoId,item]})).values()]);
export const MILK_MAMAS_SOURCE=Object.freeze({
 id:'milk-mamas-nest',name:'Milk Mamas Nest · Video episodes',
 kind:'Video · Family education',feature:'Browse 7 source-identified breastfeeding and parenting videos',
 official:MILK_MAMAS_CHANNEL.url,featureUrl:MILK_MAMAS_CHANNEL.videosUrl,
 focus:'Educational parenting and lactation videos from their original YouTube source. A reviewed list of seven videos, not a live import or a medical-care substitute. No advertising or adult-feed placement.',
 details:'A single in-card YouTube player with search, episode selection and official channel links. Video availability depends on YouTube and the publisher. New uploads must be individually verified before adding to the index.',
 contentBoundary:'family-education'
});
