/* Owner-supplied source links for the existing YouTube/Oracle public carousel.
 * A verified watch-page title/URL is NOT proof of publisher, publish date,
 * channel contents, embedding availability, 21+ classification or rights.
 * This catalog is independent of Family & Parenting TV and adult feeds. */
const inspectedOn='2026-11-20';
const reviewedLinks=[{
 videoId:'PyUwXoTabPA',title:'REFRESHING! 6-2-2014',
 sourceUrl:'https://www.youtube.com/watch?v=PyUwXoTabPA',
 observedAt:inspectedOn,publishedAt:null,publisherVerified:false,
 contentBoundary:'general-media'
},{
 videoId:'UPFgnpkm7MQ',title:'BREASTFEEDING A TEETHING BABY | Clingy baby | Clean with me | Mum of four',
 sourceUrl:'https://www.youtube.com/watch?v=UPFgnpkm7MQ',
 observedAt:'2026-11-21',publishedAt:null,publisherVerified:false,
 contentBoundary:'general-media'
},{
 videoId:'bzvtKRteavs',title:'#idahosprings #goldmill #goldmine $goldmining #gold',
 displayTitle:'Argo Mill Tour · Idaho Springs',
 sourceUrl:'https://www.youtube.com/watch?v=bzvtKRteavs',
 observedAt:'2026-11-21',publishedAt:null,publisherVerified:false,
 contentBoundary:'general-media',shortsRoute:true
},{
 videoId:'XBZA2NJU2UQ',title:'Mom vs daughter wrestling match',
 sourceUrl:'https://www.youtube.com/watch?v=XBZA2NJU2UQ',
 observedAt:'2026-11-21',publishedAt:null,publisherVerified:false,
 contentBoundary:'general-media'
},{
 videoId:'_A5x0pVktw8',title:'Wrestling: Mother vs Daughter',
 sourceUrl:'https://www.youtube.com/watch?v=_A5x0pVktw8',
 observedAt:'2026-11-21',publishedAt:null,publisherVerified:false,
 contentBoundary:'general-media'
}];
export function validateOwnerYouTubeLink(row){
 if(!row||typeof row!=='object')return false;
 if(!/^[A-Za-z0-9_-]{11}$/.test(row.videoId||''))return false;
 if(row.sourceUrl!=='https://www.youtube.com/watch?v='+row.videoId)return false;
 if(typeof row.title!=='string'||row.title.length<1||row.title.length>150||
    row.title!==row.title.trim()||/[<>\u0000-\u001f]/.test(row.title))return false;
 if(row.publishedAt!==null||row.publisherVerified!==false||row.contentBoundary!=='general-media')return false;
 if(row.shortsRoute!==undefined&&row.shortsRoute!==true)return false;
 if(row.displayTitle!==undefined&&(typeof row.displayTitle!=='string'||row.displayTitle.trim()!==row.displayTitle||row.displayTitle.length>120||/[<>\u0000-\u001f]/.test(row.displayTitle)))return false;
 return /^\d{4}-\d\d-\d\d$/.test(row.observedAt||'')&&
  Number.isFinite(Date.parse(row.observedAt+'T00:00:00Z'));
}
export const REVIEWED_OWNER_VIDEO_LINKS=Object.freeze(reviewedLinks.filter(validateOwnerYouTubeLink)
 .map(v=>Object.freeze({...v})));
const key=id=>[...id].map(c=>c.charCodeAt(0).toString(16).padStart(2,'0')).join('');
export const REVIEWED_OWNER_VIDEO_CARDS=Object.freeze(REVIEWED_OWNER_VIDEO_LINKS.map(v=>Object.freeze({
 id:'youtube-reviewed-'+key(v.videoId),
 name:v.displayTitle||v.title,kind:'Video · YouTube',category:'Video · YouTube',
 feature:'Watch the source-identified original YouTube video',
 official:v.sourceUrl,featureUrl:v.sourceUrl,sourceUrl:v.sourceUrl,
 image:'https://i.ytimg.com/vi/'+v.videoId+'/hqdefault.jpg',
 reviewedYouTubeVideoId:v.videoId,contentBoundary:'general-media',
 observedAt:v.observedAt,publishedAt:null,publisherVerified:false,
 ...(v.shortsRoute?{secondUrl:'https://www.youtube.com/shorts/'+v.videoId,secondLabel:'Open Shorts link'}:{}),
 focus:'Original YouTube link and optional provider-hosted playback only. The publisher and upload date have not been independently verified; do not present this as licensed, current/trending, family education, 21+ or an advertisement.',
 details:v.shortsRoute
  ?'Owner-supplied Argo Mill tour video. Public YouTube title and source checked on '+v.observedAt+'. Its Shorts URL may redirect to the normal watch page. Publisher identity, account ownership, other Shorts and publication date are not verified; this is not a complete channel archive.'
  :'Owner-supplied original YouTube link; public page title and video ID checked on '+v.observedAt+'. This entry is not an exhaustive channel import or a paid, adult, or childcare placement.'
})));
